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

    def send_dm(self, full_name, post_data):
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
                result = self.slack_client.chat_postMessage(channel=channel_id, attachments=post_data['attachments'], icon_emoji=post_data['icon_emoji'])
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
                msg = ""

                branch = build["properties"].get("branch")
                if branch is not None:
                    msg += f"{state_string} - *{branch[0]}*"
                else:
                    msg += f"{state_string}"
                msg += "\n\n"

                owner = None
                owner_array = build["properties"].get('owner')
                if owner_array is not None:
                    owner = owner_array[0].split("@")[0]

                pr_url = build["properties"].get("pullrequesturl")
                if pr_url is not None:
                    msg += pr_url[0]
                    msg += "\n\n"

                url = build["url"]
                msg += url
                msg += "\n\n"

                users = build.get("users")
                if users is not None:
                    msg += str(users)
                    msg += "\n\n"

                msg += "\n\n"

                fields = []
                build_number = build["properties"].get("build_number")
                if build_number is not None:
                    fields.append({
                        "title": "TEST FLIGHT Build number",
                        "value": build_number[0],
                        "short": "True"
                    })

                android_hashes = build["properties"].get("android_hashes")
                if android_hashes is not None:
                    if len(android_hashes[0]) > 0:
                        fields.append({
                            "title": "Hashes",
                            "value": android_hashes[0]
                        })

                platform = "unknown"
                builder_name_list = build["properties"].get("buildername")
                if builder_name_list is not None:
                    builder_name = builder_name_list[0]
                    if re.search('ios', builder_name, re.IGNORECASE):
                        platform = 'ios'
                    elif re.search('android', builder_name, re.IGNORECASE):
                        platform = 'android'
                fields.append({
                    "title": "Platform",
                    "value": platform,
                    "short": "True"
                })

                try:
                    postData = {
                        "text": "",
                        'icon_emoji': ':green_apple' if result == 0 else (
                            ':purple_heart' if result == 4 else ':red_circle'),
                        'attachments': [{
                            "fields": fields,
                            "mrkdwn_in": ["text", "title", "fallback"],
                            "text": msg,
                            "fallback": msg,
                            "color": "good" if result == 0 else "danger",
                        }]
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

                    send_DMs_from_properties = build["properties"].get("send_dm_to_slack", False)
                    if self.send_DMs and send_DMs_from_properties and owner is not None:
                        pguser_dict = yield self.master.data.get(('pgusers', owner))
                        if pguser_dict:
                            self.send_dm(pguser_dict['full_name'], postData)
                except Exception as e:
                    logger.error("[SlackStatusPush] Failed to send status: {error}", error=e)


class SlackFailStatusPush(SlackStatusPush):
    name = "SlackFailStatusPush"
    neededDetails = dict(wantProperties=True)
    send_DMs = False

    def sendOnStatuses(self):
        return ["failure", "skipped", "exception", "cancelled", "retry"]
