from __future__ import absolute_import, print_function

import pprint

from twisted.internet import defer

from buildbot.process.properties import Properties
from buildbot.process.results import statusToString
from buildbot.reporters import http, utils
from buildbot.util import httpclientservice
from twisted.logger import Logger

import json
import re

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

import traceback

from buildbot.process.results import Results

logger = Logger()

STATUS_EMOJIS = {
    "success": ":sunglassses:",
    "warnings": ":meow_wow:",
    "failure": ":skull:",
    "skipped": ":slam:",
    "exception": ":skull:",
    "retry": ":facepalm:",
    "cancelled": ":slam:",
}
STATUS_COLORS = {
    "success": "#36a64f",
    "warnings": "#fc8c03",
    "failure": "#fc0303",
    "skipped": "#fc8c03",
    "exception": "#fc0303",
    "retry": "#fc8c03",
    "cancelled": "#fc8c03",
}
DEFAULT_HOST = "https://hooks.slack.com"  # deprecated


def safe_serialize(obj):
    default = lambda o: f"<<non-serializable>>"
    return json.dumps(obj, default=default)


class SlackStatusPush(http.HttpStatusPush):
    name = "SlackStatusPush"
    neededDetails = dict(wantProperties=True)
    send_DMs = True

    def __init__(self, slack_client_token=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.send_DMs:
            self.slack_client = WebClient(token=slack_client_token)
            try:
                result = self.slack_client.users_list()
                self.slack_users = result["members"]
            except SlackApiError as e:
                logger.error("Error creating conversation: {}".format(e))

    def color_for_result_code(self, result_code):
        return "good" if result_code == 0 else "danger"

    def _is_bundles_build(self, properties):
        return properties['buildType'] == 'Bundles'

    def get_props_string(self, properties):
        result = ''

        bundles = self._is_bundles_build(properties)
        if not bundles:
            if properties['buildType'] == "Development":
                result += "DEV: "
            if properties['buildType'] == "Release":
                result += "RELEASE: "
            android_store = properties.get('androidStore')
            if android_store is not None:
                index = result.index(':')
                if index >= 0:
                    result = result[:index] + ' ' + android_store + result[index:]
            use_obb = properties.get('useObb')
            if use_obb is not None and use_obb:
                result += 'OBB, '
            app_store = properties.get('appStore')
            if app_store is not None and app_store:
                result += 'AppStore, '
            test_flight = properties.get('testFlight')
            if test_flight is not None and test_flight:
                result += 'TestFlight, '
            profiler = properties.get('profiler')
            if profiler is not None and profiler:
                result += 'Profiler, '
        else:
            result += "BUNDLES"

        result = result.strip()
        if result.endswith(':') or result.endswith(','):
            result = result[:len(result) - 1]

        return result

    def send_dm(self, full_name, text, attachments):
        pg_name_parts = full_name.split()
        if len(pg_name_parts) < 2:
            return

        fname_pguser = pg_name_parts[0]
        lname_pguser = pg_name_parts[1]

        channel_id = None
        for user in self.slack_users:
            real_name = user.get('real_name')
            if real_name is None:
                continue
            slack_name_parts = real_name.split()
            if len(slack_name_parts) < 2:
                continue

            fname_slack = slack_name_parts[0].replace('ё', 'е')
            lname_slack = slack_name_parts[1]
            if fname_pguser == fname_slack and lname_pguser == lname_slack or fname_pguser == lname_slack and lname_pguser == fname_slack:
                channel_id = user['id']
                break

        if channel_id is not None:
            try:
                result = self.slack_client.chat_postMessage(channel=channel_id, text=text, attachments=attachments)
                logger.info(result)
            except SlackApiError as e:
                logger.error(f"Error posting message: {e}")

    def sendOnStatuses(self):
        return STATUS_EMOJIS.keys()

    def checkConfig(
            self, endpoint, channel=None, host_url=None, username=None, **kwargs
    ):
        if not isinstance(endpoint, str):
            logger.warning(
                "[SlackStatusPush] endpoint should be a string, got '%s' instead",
                type(endpoint).__name__,
            )
        elif not endpoint.startswith("http"):
            logger.warning(
                '[SlackStatusPush] endpoint should start with "http...", endpoint: %s',
                endpoint,
            )
        if channel and not isinstance(channel, str):
            logger.warning(
                "[SlackStatusPush] channel must be a string, got '%s' instead",
                type(channel).__name__,
            )
        if username and not isinstance(username, str):
            logger.warning(
                "[SlackStatusPush] username must be a string, got '%s' instead",
                type(username).__name__,
            )
        if host_url and not isinstance(host_url, str):  # deprecated
            logger.warning(
                "[SlackStatusPush] host_url must be a string, got '%s' instead",
                type(host_url).__name__,
            )
        elif host_url:
            logger.warning(
                "[SlackStatusPush] argument host_url is deprecated and will be removed in the next release: specify the full url as endpoint"
            )

    @defer.inlineCallbacks
    def reconfigService(
            self,
            endpoint,
            channel=None,
            host_url=None,  # deprecated
            username=None,
            attachments=True,
            verbose=False,
            **kwargs
    ):

        yield super().reconfigService(serverUrl=endpoint, **kwargs)
        if host_url:
            logger.warning(
                "[SlackStatusPush] argument host_url is deprecated and will be removed in the next release: specify the full url as endpoint"
            )
        self.endpoint = endpoint
        self.channel = channel
        self.username = username
        self.attachments = attachments
        self._http = yield httpclientservice.HTTPClientService.getService(
            self.master,
            self.endpoint,
            debug=self.debug,
            verify=self.verify,
        )
        self.verbose = verbose
        self.project_ids = {}

    @defer.inlineCallbacks
    def sendMessage(self, reports):
        for report in reports:
            # traceback.print_stack()
            # see master/buildbot/process/results.py and master/docs/manual/configuration/reporters/reporter_base.rst
            logger.error("report " + safe_serialize(report))

            builds = report["builds"]
            for build in builds:
                result = build["results"]
                if result is None:
                    continue
                if result < 0 or result >= len(Results):
                    continue
                if not Results[result] in self.sendOnStatuses():
                    continue

                state_string = build["state_string"]
                if state_string == "starting":
                    continue

                logger.error("slack reporter result num " + str(result) + " Result: " + Results[result])

                pprint.pprint(build)

                result_code = build['results']
                text = self.master.config.title + ': Build ' + Results[result_code].title() + ''

                properties = {}
                for prop_name in build['properties'].keys():
                    prop_arr = build['properties'][prop_name]
                    prop_value = prop_arr[0]
                    properties[prop_name] = prop_value

                fields = []
                branch = properties.get('branch')
                if branch is None:
                    branch = properties.get('revision')
                fields.append({
                    "title": branch,
                    # "value": platform,
                    "short": "True"
                })

                properties_string = self.get_props_string(properties)
                fields.append({
                    "title": properties_string,
                    # "value": platform,
                    # "short": "True"
                })

                url = build["url"]
                fields.append({
                    "title": 'URL',
                    "value": url,
                    # "short": "True"
                })

                build_number = properties.get("build_number")
                if build_number is not None:
                    fields.append({
                        "title": "TEST FLIGHT Build number ",
                        "value": build_number,
                        "short": "True"
                    })

                # android_hashes = build["properties"].get("android_hashes")
                # if android_hashes is not None:
                #     if len(android_hashes[0]) > 0:
                #         fields.append({
                #             "title": "Hashes",
                #             "value": android_hashes[0]
                #         })

                platform = "unknown"
                builder_name = properties.get("buildername")
                if builder_name is not None:
                    if re.search('ios', builder_name, re.IGNORECASE):
                        platform = 'iOS'
                    elif re.search('android', builder_name, re.IGNORECASE):
                        platform = 'Android'
                fields.append({
                    "title": "Platform",
                    "value": platform,
                    "short": "True"
                })

                owner_full_name = ''
                owner = properties.get('owner')
                if owner is not None:
                    owner = owner.split("@")[0]
                    pguser_dict = yield self.master.data.get(('pgusers', owner))
                    if pguser_dict is not None:
                        owner_full_name = pguser_dict['full_name']

                user_who_stops = build.get('user_who_stops', None)
                if user_who_stops is not None:
                    user_who_stops_pguser_dict = yield self.master.data.get(('pgusers', user_who_stops))
                    if user_who_stops_pguser_dict is not None:
                        fields.append({
                            "title": "Остановил",
                            "value": user_who_stops_pguser_dict['full_name'],
                            "short": "True"
                        })

                attachments = [{
                    "fields": fields,
                    "mrkdwn_in": ["text", "title", "fallback"],
                    "text": '',
                    "fallback": '',
                    "color": self.color_for_result_code(result_code),
                }]

                try:
                    postData = {
                        "text": text,
                        # 'icon_emoji': ':green_apple' if result == 0 else (
                        #     ':purple_heart' if result == 4 else ':red_circle'),
                        'attachments': attachments
                    }
                    # https://api.slack.com/reference/messaging/attachments
                    response = yield self._http.post("", json=postData)
                    if response.code != 200:
                        content = yield response.content()
                        logger.error(
                            "[SlackStatusPush] {code}: unable to upload status: {content}",
                            code=response.code,
                            content=content,
                        )

                    send_DMs_from_properties = properties.get("send_dm_to_slack", True)
                    if self.send_DMs and send_DMs_from_properties and owner_full_name is not None:
                        self.send_dm(owner_full_name, text, attachments)
                except Exception as e:
                    logger.error("[SlackStatusPush] Failed to send status: {error}", error=e)


class SlackFailStatusPush(SlackStatusPush):
    name = "SlackFailStatusPush"
    neededDetails = dict(wantProperties=True)
    send_DMs = False

    def sendOnStatuses(self):
        return ["failure", "skipped", "exception", "cancelled", "retry"]
