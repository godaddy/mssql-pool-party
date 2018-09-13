/* eslint no-param-reassign: 0 */
import setDebug from 'debug';
import uuid from 'uuid';

const debug = setDebug('mssql-pool-party');

export default function addDefaultDsnProperties(dsns) {
  debug('adding default dsn properties to the following dsns:\n%O', dsns);
  // mutates to add id and createdAt properties to dsns if they don't have one.
  return Promise.resolve(dsns.map((dsn) => {
    dsn.id = dsn.id || uuid();
    dsn.createdAt = dsn.createdAt || Date.now();
    return dsn;
  }));
}
