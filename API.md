<a name="module_connection-pool-party"></a>

## connection-pool-party

* [connection-pool-party](#module_connection-pool-party)
    * [.ConnectionPoolParty](#module_connection-pool-party.ConnectionPoolParty) ⇐ <code>EventEmitter</code>
        * [new ConnectionPoolParty(config, [cb])](#new_module_connection-pool-party.ConnectionPoolParty_new)
        * [.warmup([cb])](#module_connection-pool-party.ConnectionPoolParty+warmup) ⇒ <code>Promise</code>
        * [.request()](#module_connection-pool-party.ConnectionPoolParty+request) ⇒ <code>mssql.Request</code>
        * [.close([cb])](#module_connection-pool-party.ConnectionPoolParty+close) ⇒ <code>Promise</code>
        * [.stats()](#module_connection-pool-party.ConnectionPoolParty+stats) ⇒ <code>Object</code>
    * [.forceFqdnConnectionPoolFactory(suffix)](#module_connection-pool-party.forceFqdnConnectionPoolFactory) ⇒ <code>Promise</code>

<a name="module_connection-pool-party.ConnectionPoolParty"></a>

### connection-pool-party.ConnectionPoolParty ⇐ <code>EventEmitter</code>
**Kind**: static class of [<code>connection-pool-party</code>](#module_connection-pool-party)  
**Extends**: <code>EventEmitter</code>  

* [.ConnectionPoolParty](#module_connection-pool-party.ConnectionPoolParty) ⇐ <code>EventEmitter</code>
    * [new ConnectionPoolParty(config, [cb])](#new_module_connection-pool-party.ConnectionPoolParty_new)
    * [.warmup([cb])](#module_connection-pool-party.ConnectionPoolParty+warmup) ⇒ <code>Promise</code>
    * [.request()](#module_connection-pool-party.ConnectionPoolParty+request) ⇒ <code>mssql.Request</code>
    * [.close([cb])](#module_connection-pool-party.ConnectionPoolParty+close) ⇒ <code>Promise</code>
    * [.stats()](#module_connection-pool-party.ConnectionPoolParty+stats) ⇒ <code>Object</code>

<a name="new_module_connection-pool-party.ConnectionPoolParty_new"></a>

#### new ConnectionPoolParty(config, [cb])
Class representing a ConnectionPoolParty, which manages one or more ConnectionPool instance(s).
ConnectionPoolParty extends the mssql package to provide failover between ConnectionPools,
reconnets/retries, and basic health/statistics reporting.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| config | <code>object</code> |  | Configuration for ConnectionPoolParty |
| [config.reconnects] | <code>number</code> | <code>0</code> | The number of times a request will be retried  against ALL pools. A heal operation is attempted before a reconnect. Total request  attempts is calculated using: pools * (1+reconnects) * (1+retries) |
| [config.retries] | <code>number</code> | <code>0</code> | The number of times a request will be retried against  a single pool.  Each pool is retried separately. Total request attempts is calculated using:  pools * (1+reconnects) * (1+retries) |
| [config.dsn] | <code>object</code> |  | A single DSN, matches the configuration object expected  by the mssql package. Required if dsns and dsnProvider are not provided. |
| [config.dsns] | <code>array</code> |  | An array of DSNs, each entry should match the configuraiton  object expected by the mssql package. Overrides config.dsn. Required if dsn and dsnProvider  are not provided. |
| [config.dsnProvider] | <code>function</code> |  | A function returning a promise that resolves  with an array of dsn object(s). This option will override config.dsn and config.dsns.  Required if dsn and dsns are not provided. |
| [config.connectionPoolFactory] | <code>function</code> |  | A function that receives the dsn objects  from the dnsProvider and returns a promise that resolves with *connected* instance(s) of  ConnectionPool. Use this option if you want to customize how mssql ConnectionPools are  instantiated and connected. |
| [config.connectionPoolConfig] | <code>object</code> |  | An object containing any configuration  you want to attach to the config provided when creating an mssql ConnectionPool. This is  useful if you don't want to create a custom dsnProvider or connectionPoolFactory to modify  the configuration used to create ConnectionPools. Just keep in mind that any config set here  will override the config set in the dsnProvider. Also keep in mind that node-mssql expects some  configuration to exists on an "options" property (like timeouts). Check node-mssql README.md  for more information. |
| [config.prioritizePools] | <code>boolean</code> |  | A flag to enable pool prioritization behavior.  If you enable this behavior, your dsns must have a numeric priority property.  At a specified interval, the pools collection will be examined to see if the pools  are no longer indexed in order of priority. If this is the case, the pools will be  healed (if applicable) and re-ordered in terms of their priority. This is a useful  behavior if you want to fail back to a "primary" dsn after it becomes healthy again. |
| [config.prioritizeInterval] | <code>number</code> | <code>30000</code> | The interval in milliseconds  to run the pool prioritization check. Setting a value below 10000 is not advised,  as the pool prioritization check can take significant resources if a pool heal is required. |
| [cb] | <code>function</code> |  | Optional callback interface, providing this automatically calls  warmup. It is preferable to use the Promise-based interface and call warmup explicitly. |

<a name="module_connection-pool-party.ConnectionPoolParty+warmup"></a>

#### connectionPoolParty.warmup([cb]) ⇒ <code>Promise</code>
Retrieve the dsn(s) from the dsnProvider, create and connect the ConnectionPool
instance(s) using the connectionPoolFactory. Returns a promise. Can be called
to explicitly warmup database connections. Called implicitly when submitting
any requests. After a successful warmup, subsequent calls will not warmup again.

**Kind**: instance method of [<code>ConnectionPoolParty</code>](#module_connection-pool-party.ConnectionPoolParty)  
**Returns**: <code>Promise</code> - A promise indicating that a warmup was successful. This promise
cannot reject, but errors during warmup will result in the cached warmup promise
being removed, which will allow warmup to be re-attempted.  

| Param | Type | Description |
| --- | --- | --- |
| [cb] | <code>function</code> | An optional callback interface. It is preferable to use the  Promise-based interface. |

<a name="module_connection-pool-party.ConnectionPoolParty+request"></a>

#### connectionPoolParty.request() ⇒ <code>mssql.Request</code>
Retrieve a new Request instance. This is the same Request provided by the mssql
package, but it's specially extended to interact with ConnectionPoolParty.

**Kind**: instance method of [<code>ConnectionPoolParty</code>](#module_connection-pool-party.ConnectionPoolParty)  
**Returns**: <code>mssql.Request</code> - An extended instance of mssql.Request.  
<a name="module_connection-pool-party.ConnectionPoolParty+close"></a>

#### connectionPoolParty.close([cb]) ⇒ <code>Promise</code>
Close all pools associated with this instance of ConnectionPoolParty

**Kind**: instance method of [<code>ConnectionPoolParty</code>](#module_connection-pool-party.ConnectionPoolParty)  
**Returns**: <code>Promise</code> - A Promise that resolves when all pools are closed. Will also
 resolve if there is an error encountered while closing the pools.  

| Param | Type | Description |
| --- | --- | --- |
| [cb] | <code>function</code> | An optional callback interface. It is preferable to use the  Promise-based interface. |

<a name="module_connection-pool-party.ConnectionPoolParty+stats"></a>

#### connectionPoolParty.stats() ⇒ <code>Object</code>
Retrieve health and statistics for this ConnectionPoolParty and its associated
pools.

**Kind**: instance method of [<code>ConnectionPoolParty</code>](#module_connection-pool-party.ConnectionPoolParty)  
**Returns**: <code>Object</code> - An object containing a bunch of health/stats data for this instance
 of ConnectionPoolParty and its associated pools.  
<a name="module_connection-pool-party.forceFqdnConnectionPoolFactory"></a>

### connection-pool-party.forceFqdnConnectionPoolFactory(suffix) ⇒ <code>Promise</code>
This connection pool factory is only needed for a niche use case, but it
serves as an example of what is possible when creating a custom
connectionPoolFactory.

If your dsn provider returns servers as hostnames instead of FQDNs or IPs,
you may have systems that are unable to resolve the hostnames due to
misconfigured DNS settings. If you are unable to fix the DNS resolution for
whatever reason, and you know what the FQDN suffix is, you can use this
connectionPoolFactory to add the suffix.

**Kind**: static method of [<code>connection-pool-party</code>](#module_connection-pool-party)  
**Returns**: <code>Promise</code> - A promise that uses a dsn provided by the dsnProvider to create
 an mssql ConnectionPool.  

| Param | Type | Description |
| --- | --- | --- |
| suffix | <code>string</code> | The FQDN suffix to use if your dsn's server is provided  as a hostname. |

