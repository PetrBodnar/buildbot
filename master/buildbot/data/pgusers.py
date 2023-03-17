from buildbot.data import types
from buildbot.data import base
from twisted.internet import defer

class PgUserEndpoint(base.Endpoint):

    isCollection = False
    pathPatterns = """
        /pgusers/n:pguserid
    """

    def get(self, resultSpec, kwargs):
        d = self.master.db.pgusers.getPgUser(kwargs['pguserid'])
        # d.addCallback(self._fixPgUser, is_graphql='graphql' in kwargs)
        return d


class PgUser(base.ResourceType):
    name = "pguser"
    plural = "pgusers"
    endpoints = [PgUserEndpoint]
    eventPathPatterns = """
        /pgusers/:pguserid
    """
    keyFields = ['pguserid']

    class EntityType(types.Entity):
        pguserid = types.String()
        full_name = types.String()

    entityType = EntityType(name, 'PgUser')

    @base.updateMethod
    @defer.inlineCallbacks
    def update_pg_user(self, pguserid, full_name):
        yield self.master.db.pgusers.updatePgUser(pguserid, full_name)
        self.produceMessage(pguserid, 'pguser-updated')
