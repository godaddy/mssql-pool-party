import defaultConnectionPoolFactory from './default-connection-pool-factory';

function coerceFqdn(server, suffix) {
  if (!server) {
    return server;
  }
  // If we detect any periods, we assume this is the fqdn
  if (server.indexOf('.') >= 0) {
    return server;
  }

  // server has an instance, we can't just append the fqdn
  if (server.indexOf('\\') >= 0) {
    const parts = server.split('\\');
    if (parts.length !== 2) {
      // we only know how to parse SERVER\INSTANCE format
      return server;
    }
    return `${parts[0] + suffix}\\${parts[1]}`;
  }

  return server + suffix;
}

/**
* This connection pool factory is only needed for a niche use case, but it
* serves as an example of what is possible when creating a custom
* connectionPoolFactory.
*
* If your dsn provider returns servers as hostnames instead of FQDNs or IPs,
* you may have systems that are unable to resolve the hostnames due to
* misconfigured DNS settings. If you are unable to fix the DNS resolution for
* whatever reason, and you know what the FQDN suffix is, you can use this
* connectionPoolFactory to add the suffix.
* @param {string} suffix - The FQDN suffix to use if your dsn's server is provided
*  as a hostname.
* @return {Promise} A promise that uses a dsn provided by the dsnProvider to create
*  an mssql ConnectionPool.
* @memberof module:connection-pool-party
*/
export default function forceFqdnConnectionPoolFactory(suffix) {
  return (dsn) => {
    dsn.server = coerceFqdn(dsn.server, suffix); // eslint-disable-line no-param-reassign
    return defaultConnectionPoolFactory(dsn);
  };
}

