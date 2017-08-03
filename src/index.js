/**
* @module connection-pool-party
*/

import debug from 'debug';
import ConnectionPoolParty from './connection-pool-party';
import forceFqdnConnectionPoolFactory from './force-fqdn-connection-pool-factory';

// Send all debug() logs to stdout instead of stderr
/* eslint no-console:0 */
debug.log = console.log.bind(console);

// export everything from mssql since we aren't overwriting the existing interface
export * from 'mssql';

export { ConnectionPoolParty, forceFqdnConnectionPoolFactory };
