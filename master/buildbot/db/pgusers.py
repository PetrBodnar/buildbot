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


from twisted.internet import defer
from twisted.python import log

from buildbot.db import base


class PgUsersConnectorComponent(base.DBConnectorComponent):

    @defer.inlineCallbacks
    def updatePgUser(self, pguserid, full_name):

        pguserid_bytes = pguserid.encode('utf-8')

        pgusers_tbl = self.db.model.pgusers

        self.checkLength(pgusers_tbl.c.pguserid, pguserid_bytes)
        self.checkLength(pgusers_tbl.c.full_name, full_name)

        user = yield self.getPgUser(pguserid)

        def thd(conn):
            transaction = conn.begin()

            if user is None:
                r = conn.execute(pgusers_tbl.insert(), dict(
                    pguserid=pguserid_bytes,
                    full_name=full_name))
                # new_pguserid = r.inserted_primary_key[0]
            else:
                r = conn.execute(
                    pgusers_tbl.update(whereclause=(pgusers_tbl.c.pguserid == pguserid_bytes)).values(full_name=full_name))

            transaction.commit()

            return None

        return (yield self.db.pool.do(thd))

    def getPgUser(self, pguserid):

        pguserid_bytes = pguserid.encode('utf-8')

        def thd(conn):
            pgusers_tbl = self.db.model.pgusers
            q = pgusers_tbl.select(
                whereclause=(pgusers_tbl.c.pguserid == pguserid_bytes))
            rp = conn.execute(q)
            row = rp.fetchone()
            if not row:
                return None

            result = {'pguserid': row.pguserid.decode('utf-8'), 'full_name': row.full_name}
            # logger.error("result getPgUsers2: result={result}", result=result)
            return result

        return self.db.pool.do(thd)

    def getPgUsers(self):
        def thd(conn):
            pgusers_tbl = self.db.model.pgusers
            q = pgusers_tbl.select()
            rp = conn.execute(q)
            rows = rp.fetchall()
            result = [{'pguserid': row.pguserid.decode('utf-8'), 'full_name': row.full_name} for row in rows]
            # logger.error("result getPgUsers: result={result}", result=result)

            return result

        return self.db.pool.do(thd)
