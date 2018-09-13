# 0.3.0 (TBD)

## Features

- Upgrade node-mssql to `^4.2.1`. This paves the way for supporting Availability Groups (more testing needed on this front).
- Better DEBUG logging
- Added the following properties to the stats output: `config.appName`, `config.encrypt`.

## Bug Fixes

- Added workaround for https://github.com/tediousjs/node-mssql/issues/705 until it's fixed upstream. This isn't a bug in a previous version, but in node-mssql v4.

## Breaking Changes

- Since mssql-pool-party is a wrapper around node-mssql that aims to minimize interface changes, all breaking changes in node-mssql v4 are relevant to this new version, [see here for those changes](https://github.com/tediousjs/node-mssql/blob/7f374a8d73b00b17aa5b5ea5621c4314fc6e2daa/README.md#3x-to-4x-changes).
- All responses from Request methods (query, execute, etc), for each style (promise, cb, stream), have been unified to match the changes made in v4. They all return a single object (and an error, if applicable). The result object will look something like the following (first example applies to callback/promise/async-await, second example applies to stream). See README.md for richer documentation.
```
{
  output: {},
  recordset: [{}],
  recordsets: [
    [{}],
  ],
  returnValue: 0,
  rowsAffected: [],
}
```
```
{
  columns: {
    ColumnName: {},
  },
  output: {},
  returnValue: 0,
  rows: [{}],
  rowsAffected: [],
}
```
- Pool inside `node-mssql`'s ConnectionPool now defaults both `evictionRunIntervalMillis` and `idleTimeoutMillis` to `500ms` (original defaults were `1000ms` and `30000ms` respectively). Can be overridden by modifying `connectionPoolConfig.pool.X`.
- Removed the following properties from the stats output: `config.driver`, `config.tdsVersion`, `timeouts.cancel`, 
- Enable the `encrypt` driver options by default. Disabled by default has already been deprecated in `tedious` and will be removed in a newer version, we're just jumping ahead a little to get rid of an annoying console message. If you don't want encryption, use this config:
```
connectionPoolConfig: {
  options: {
    encrypt: false
  }
}
```

## Other

- Upgrade jest and babel-jest from `^19.02` to `^23.6.0`
- Removed jest-environment-node-debug and jest-unit from devDependencies
- Enabled test coverage, dropped requirement to 75% (goal of 100% in future)
- `sqlcmd` is now on the PATH inside the integration test Docker container
- Fixed some bugs involved with running tests in parallel
- Added missing stream tests
- Added package-lock.json

# 0.2.4 (November 13th, 2017)

## Bug Fixes

- Fixed a bug in the default raceWarmup strategy that was incorrectly resolving the warmup if a pool failed to connect properly. This should make initial connections a little more reliable.

# 0.2.3 (November 10th, 2017)

## Features

- Added priority to stats output.

# 0.2.2 (November 9th, 2017)

## Bug Fixes

- Fixed a bug in the reconnect process that was uncovered by the bug fix in 0.2.1. In 0.2.1, we started detecting pool healing failures correctly, which started triggering a condition in the reconnect process that prevented a reconnect if no pools were healed, which turned out not to be desirable. Now, if no pools were healed during a reconnect, it jumps right to another heal attempt.

# 0.2.1 (November 9th, 2017)

## Features

- Added optional pool prioritization. This feature is intended to provide a means to failback to a preferred DSN after previously promoting a lower priority DSN. [See here](API.md#new-connectionpoolpartyconfig-cb) for configuration options.

## Bug Fixes

- Fixed a bug in the heal process that was preventing heal failures from being detected properly in most cases. This will prevent unnecessary retries against unhealthy pools.

# 0.2.0 (August 14th, 2017)

## Breaking Change

- The `pool` property has been removed from the `PoolError` class due to concerns about exposing references to internal connections and DSNs. There is now a `dsn` property which contains information about the DSN owned by the pool involved in the error.

# 0.1.6 (August 3rd, 2017)

## Other

- Version bump with no change in functionality. This was done to avoid conflits with a previous version hosted on our internal registry.

# 0.1.5 (July 21th, 2017)

## Other

- Improved debug logs
- All debug logs go to stdout
- No changes in production functionality

# 0.1.4 (June 27th, 2017)

## Bug Fixes

- Fixed error when running `connection.request().query('...')` commands that did not return a recordset (e.g. `TRUNCATE TABLE ...`)

## Other

- Added a high-write integration test
- Added unit test
- Added a bit more debug logging

# 0.1.3 (April 5th, 2017)

## Bug Fixes

- Removed pool.dsn.password from PoolError to avoid passwords showing up in error logging

# 0.1.2 (April 3rd, 2017)

## Bug Fixes

- Fixed returnValue not being return when calling execute
- Fixed broken execute callback tests

# 0.1.1 (April 3rd, 2017)

## Features

- Added `connectionPoolConfig` option to the ConnectionPoolParty constructor. This new option lets you set configuration options that will be passed to the mssql ConnectionPool constructor. This provides a way to set things like timeouts without having to create a custom connectionPoolFactory or dsnProvider. _Note: any options set here will override options created by the dsnProvider_

# 0.1.0 (April 3rd, 2017)

First Release!
