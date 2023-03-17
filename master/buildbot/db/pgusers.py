# This file is part of Buildbot.  Buildbot is free software: you can
# redistribute it and/or modify it under the terms of the GNU General Public
# License as published by the Free Software Foundation, version 2.
#
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more
# details.
#
# You should have received a copy of the GNU General Public License along with
# this program; if not, write to the Free Software Foundation, Inc., 51
# Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
#
# Copyright Buildbot Team Members

"""
Support for changes in the database
"""

import json

import sqlalchemy as sa

from twisted.internet import defer
from twisted.python import log

from buildbot.db import base
from buildbot.util import datetime2epoch
from buildbot.util import epoch2datetime


class PgUsersConnectorComponent(base.DBConnectorComponent):

    @defer.inlineCallbacks
    def updatePgUser(self, pguserid, full_name):

        pgusers_tbl = self.db.model.pgusers

        self.checkLength(pgusers_tbl.c.pguserid, pguserid)
        self.checkLength(pgusers_tbl.c.full_name, full_name)

        def thd(conn):
            transaction = conn.begin()

            r = conn.execute(pgusers_tbl.insert(), dict(
                pguserid=pguserid,
                full_name=full_name))
            new_pguserid = r.inserted_primary_key[0]

            transaction.commit()

            return new_pguserid
        return (yield self.db.pool.do(thd))

    # returns a Deferred that returns a value
    @base.cached("chdicts")
    def getPgUser(self, pguserid):

        def thd(conn):
            pgusers_tbl = self.db.model.pgusers
            q = pgusers_tbl.select(
                whereclause=(pgusers_tbl.c.pguserid == pguserid))
            rp = conn.execute(q)
            row = rp.fetchone()
            if not row:
                return None

            return {'pguserid': row.pguserid, 'full_name': row.full_name}

        return self.db.pool.do(thd)
