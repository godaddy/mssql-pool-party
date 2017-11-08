/* eslint no-param-reassign:0 */
// Unfortunately, we do a lot of parameter reassignment in this class, so we're
// disabling this rule for the entire file.

import { EventEmitter } from 'events';
import setDebug from 'debug';
import sql from 'mssql';
import promiseRetry from 'promise-retry';
import promiseReduce from 'promise-reduce';
import partial from 'lodash.partial';
import AggregateError from 'aggregate-error';
import validateConfig from './validate-config';
import addDefaultDsnProperties from './add-default-dsn-properties';
import defaultConnectionPoolFactory from './default-connection-pool-factory';
import addConnectionPoolProperties from './add-connection-pool-properties';
import raceWarmupStrategy from './race-warmup-strategy';
import PoolError from './pool-error';
import poolStats from './pool-stats';
import addDefaultStats from './add-default-stats';
import copyPoolStats from './copy-pool-stats';
import requestStreamPromise from './request-stream-promise';
import isStreamingEnabled from './is-streaming-enabled';
import coalesceRequestResults from './coalesce-request-results';
import wrapListeners from './wrap-listeners';
import requestMethodSuccess from './request-method-success';
import requestMethodFailure from './request-method-failure';
import poolPrioritySort from './pool-priority-sort';

const debug = setDebug('mssql-pool-party');

/**
* Class representing a ConnectionPoolParty, which manages one or more ConnectionPool instance(s).
* ConnectionPoolParty extends the mssql package to provide failover between ConnectionPools,
* reconnets/retries, and basic health/statistics reporting.
* @param {object} config - Configuration for ConnectionPoolParty
* @param {number} [config.reconnects=0] - The number of times a request will be retried
*  against ALL pools. A heal operation is attempted before a reconnect. Total request
*  attempts is calculated using: pools * (1+reconnects) * (1+retries)
* @param {number} [config.retries=0] - The number of times a request will be retried against
*  a single pool.  Each pool is retried separately. Total request attempts is calculated using:
*  pools * (1+reconnects) * (1+retries)
* @param {object} [config.dsn] - A single DSN, matches the configuration object expected
*  by the mssql package. Required if dsns and dsnProvider are not provided.
* @param {array} [config.dsns] - An array of DSNs, each entry should match the configuraiton
*  object expected by the mssql package. Overrides config.dsn. Required if dsn and dsnProvider
*  are not provided.
* @param {function} [config.dsnProvider] - A function returning a promise that resolves
*  with an array of dsn object(s). This option will override config.dsn and config.dsns.
*  Required if dsn and dsns are not provided.
* @param {function} [config.connectionPoolFactory] - A function that receives the dsn objects
*  from the dnsProvider and returns a promise that resolves with *connected* instance(s) of
*  ConnectionPool. Use this option if you want to customize how mssql ConnectionPools are
*  instantiated and connected.
* @param {object} [config.connectionPoolConfig] - An object containing any configuration
*  you want to attach to the config provided when creating an mssql ConnectionPool. This is
*  useful if you don't want to create a custom dsnProvider or connectionPoolFactory to modify
*  the configuration used to create ConnectionPools. Just keep in mind that any config set here
*  will override the config set in the dsnProvider. Also keep in mind that node-mssql expects some
*  configuration to exists on an "options" property (like timeouts). Check node-mssql README.md
*  for more information.
* @param {boolean} [config.prioritizePools] - A flag to enable pool prioritization behavior.
*  If you enable this behavior, your dsns must have a numeric priority property.
*  At a specified interval, the pools collection will be examined to see if the pools
*  are no longer indexed in order of priority. If this is the case, the pools will be
*  healed (if applicable) and re-ordered in terms of their priority. This is a useful
*  behavior if you want to fail back to a "primary" dsn after it becomes healthy again.
* @param {number} [config.prioritizeInterval=30000] - The interval in milliseconds
*  to run the pool prioritization check. Setting a value below 10000 is not advised,
*  as the pool prioritization check can take significant resources if a pool heal is required.
* @param {function} [cb] - Optional callback interface, providing this automatically calls
*  warmup. It is preferable to use the Promise-based interface and call warmup explicitly.
* @class
* @extends EventEmitter
* @memberof module:connection-pool-party
*/
export default class ConnectionPoolParty extends EventEmitter {
  constructor(config, cb) {
    super();
    debug('Creating ConnectionPoolParty instance');
    validateConfig(config);
    this.configDefaults = {
      reconnects: 0,
      retries: 0,
      prioritizePools: false,
      prioritizeInterval: 30000,
    };

    this.config = {
      ...this.configDefaults,
      ...config,
    };
    this.requestDefaults = {
      reconnects: this.config.reconnects,
      retries: this.config.retries,
    };
    this.warmedUp = false;
    this.reconnectCount = 0;
    this.pools = [];
    // use the dsnProvider from config, or just emulate a dsnProvider
    // using the dsn(s) provided
    this.dsnProvider = this.config.dsnProvider ||
      (() => Promise.resolve(this.config.dsns || [this.config.dsn]));
    this.connectionPoolFactory = this.config.connectionPoolFactory ||
      defaultConnectionPoolFactory;
    // we need a way to set mssql ConnectionPool config properties without
    // having to specify a custom dsnProvider or connecitonPoolFactory. this
    // gives us that.
    this.connectionPoolConfig = this.config.connectionPoolConfig || {};
    this.warmupStrategy = this.config.warmupStrategy || raceWarmupStrategy;
    this._warmupPromise = null;
    this._healingPromise = null;
    this._prioritizePromise = null;
    this._prioritizeTimer = null;
    // we don't want an 'Uncaught, unspecified "error" event.' exception
    // so we have a dummy listener here.
    this.on('error', () => {});
    if (typeof cb === 'function') {
      this.warmup(cb);
    }
  }
  /**
  * Retrieve the dsn(s) from the dsnProvider, create and connect the ConnectionPool
  * instance(s) using the connectionPoolFactory. Returns a promise. Can be called
  * to explicitly warmup database connections. Called implicitly when submitting
  * any requests. After a successful warmup, subsequent calls will not warmup again.
  * @param {function} [cb] - An optional callback interface. It is preferable to use the
  *  Promise-based interface.
  * @return {Promise} A promise indicating that a warmup was successful. This promise
  * cannot reject, but errors during warmup will result in the cached warmup promise
  * being removed, which will allow warmup to be re-attempted.
  * @memberof module:connection-pool-party.ConnectionPoolParty
  * @method #warmup
  */
  warmup = (cb) => {
    if (this._warmupPromise) {
      debug('warmup called again while already in progress');
    } else {
      debug('warmup called');
    }
    // only run one warmup at a time for each instance of ConnectionPoolParty
    this._warmupPromise = this._warmupPromise || this.dsnProvider()
      .then(addDefaultDsnProperties)
      .then(addConnectionPoolProperties(this.connectionPoolConfig))
      .then((dsns) => {
        debug(`retrieved dsns \n${(dsns && JSON.stringify(dsns, null, 2)) || 'NONE'}`);
        // make sure we empty the pools (they should already be empty)
        this.pools = [];
        // the warmup strategy decides how we want to wait for the connections
        // to be created.  by default, our strategy is to continue after
        // we get at least one succesful connection (and it will be placed)
        // as the initial primary. Even though we continue after the first
        // successful connection, the rest of the pool(s) will be added (if
        // there are anymore).
        return this.warmupStrategy(
          dsns,
          this.connectionPoolFactory,
          (pool) => {
            debug(`pool created for dsn ${pool.dsn.id} (${pool.dsn.server}).
              pool added at index ${this.pools.length}`);
            debug(pool);
            this.pools.push(addDefaultStats(pool));
          },
          this.emit.bind(this, 'error'),
        );
      })
      .then(() => {
        // if we've gotten here, then at least one pool succesfully connected
        this.warmedUp = true;
        // we only start prioritizing after a successful warmup
        if (this.config.prioritizePools) {
          this._startPrioritizingPools();
        }
      })
      .catch((err) => {
        debug('failed to retrieve dsns! reseting warmup promise so that another attempt can be made');
        debug(err);
        this.emit('error', err);
        // reset the warmup promise so it can be called again
        this._warmupPromise = null;
      });
    if (typeof cb === 'function') {
      return this._warmupPromise.then(cb);
    }
    return this._warmupPromise;
  }

  /**
  * Retrieve a new Request instance. This is the same Request provided by the mssql
  * package, but it's specially extended to interact with ConnectionPoolParty.
  * @return {mssql.Request} An extended instance of mssql.Request.
  * @memberof module:connection-pool-party.ConnectionPoolParty
  * @method #request
  */
  request = (options = {}) => {
    const optionsWithDefaults = {
      ...this.requestDefaults,
      ...options,
    };
    const request = new sql.Request();
    return this._wrapRequest(optionsWithDefaults, request);
  }

  /**
  * Close all pools associated with this instance of ConnectionPoolParty
  * @param {function} [cb] - An optional callback interface. It is preferable to use the
  *  Promise-based interface.
  * @return {Promise} A Promise that resolves when all pools are closed. Will also
  *  resolve if there is an error encountered while closing the pools.
  * @memberof module:connection-pool-party.ConnectionPoolParty
  * @method #close
  */
  close = cb => Promise.all(
    this.pools.map(pool => pool.connection.close()),
  )
    .catch((err) => {
      this.emit('error', err);
    })
    .then(() => {
      this.pools = [];
      if (this._prioritizeTimer) {
        clearInterval(this._prioritizeTimer);
        this._prioritizeTimer = null;
      }
    })
    .then(() => {
      if (typeof cb === 'function') {
        cb();
      }
    })

  /**
  * Retrieve health and statistics for this ConnectionPoolParty and its associated
  * pools.
  * @return {Object} An object containing a bunch of health/stats data for this instance
  *  of ConnectionPoolParty and its associated pools.
  * @memberof module:connection-pool-party.ConnectionPoolParty
  * @method #stats
  */
  stats = () => ({
    pools: this.pools.map(poolStats),
    healing: !!this._healingPromise, // the promise only exists during healing
    warmedUp: this.warmedUp,
    reconnects: this.config.reconnects,
    reconnectCount: this.reconnectCount,
    retries: this.config.retries,
    // retryCount is tracked on each pool
  });

  _tryRequest = (options, request, originalMethod, args, attempts, pool, poolIndex) => {
    // we already completed the request with a previous pool, no need to continue
    if (attempts.success) {
      return attempts;
    }
    return promiseRetry(
      { retries: options.retries },
      (retry, tryNumber) => {
        // run the request using the pool
        request.connection = pool.connection;
        // we want to record each time we rely on a retry in a pool's stats
        if (tryNumber > 1) {
          pool.retryCount += 1;
        }
        attempts.poolIndex = poolIndex;
        attempts.tryNumber = tryNumber;
        attempts.attemptNumber += 1;
        // if streaming is enabled, we need to make the stream events
        // promise-friendly, so we can continue to use the same logic
        // downstream to handle retries and such
        const originalMethodPromise = isStreamingEnabled(pool, request)
          ? requestStreamPromise(request, originalMethod, attempts)
          : originalMethod;
        return originalMethodPromise.apply(request, args)
          // we need to juggle the results from the different interfaces.
          // promises can only return a single value
          // but callbacks and streams can return multiple
          .then(coalesceRequestResults)
          .catch((err) => {
            // if there is a failure, check to see if the request can be retried
            if (this._isErrorRetryable(err)) {
              return retry(err);
            }
            throw err;
          });
      },
    )
    .then(
      ({ recordset, returnValue, rowsAffected }) => {
        // the request succeeded, just record and return the results
        attempts.success = {
          recordset,
          returnValue,
          rowsAffected,
        };
        return attempts;
      },
      (err) => {
        // the request failed, record the error and check to see
        // if the pool is unhealthy
        debug(`request failed for pool ${pool.dsn.id}`);
        debug(err);
        attempts.errors.push(new PoolError(pool, err));
        if (this._isPoolUnhealthy(pool, err)) {
          attempts.unhealthyPools.push(pool);
        }
        return attempts;
      },
    );
  }

  _wrapRequest = (options, request) => {
    // methods on the request that initiate communication with the sql
    // server are wrapped to support failovers, retries, etc.
    ['batch', 'bulk', 'execute', 'query'].forEach((func) => {
      request[func] = this._wrapRequestMethod(options, request, func);
    });
    // methods that deal with event listeners need to be wrapped
    // to support the streaming interface
    ['on', 'removeListener'].forEach((func) => {
      request[func] = wrapListeners(request, func);
    });
    return request;
  }

  _wrapRequestMethod = (options, request, method) => {
    const originalMethod = request[method];
    return (...args) => {
      debug(`attempting request ${method} with args ${args.join(', ')}`);
      // need to support the same optional callback interface provided by mssql package
      const cb = args[args.length - 1];
      if (typeof cb === 'function') {
        // we don't want to pass the cb to the request method because it
        // returns different values, so we pop it here and call it at the end
        args.pop();
      }
      // we use attempts to track the state of a request over the many possible
      // retries and reconnects that may take place. it's a closure accessed
      // and mutated across multiple links in a promise chain, which isn't great.
      // look into refactoring this later if possible.
      const attempts = {
        success: null,
        errors: [],
        unhealthyPools: [],
        attemptNumber: 0,
      };
      return promiseRetry(
        { retries: options.reconnects },
        // make sure we're warmed up
        // if we're already warmed up, this will just immediately resolve
        (retry, connectNumber) => this.warmup()
          .then(() => {
            debug(attempts);
            attempts.connectNumber = connectNumber;
            if (this.pools.length === 0) {
              // it's possible for a warmup to fail and no pools to be created, if so
              // we stop here and hope a retry succeeds
              attempts.errors.push(new Error('No pools detected, warmup may have failed.'));
              return attempts;
            }
            // if connectNumber is greater than one, then there was a reconnect
            // and we want to track that on the ConnectionPoolParty instance
            if (connectNumber > 1) {
              this.reconnectCount += 1;
            }
            // attempt request using each pool sequentially, skips others after success
            // clone array to avoid mutation during iteration
            return Promise.resolve([...this.pools])
              .then(promiseReduce(
                // try to make the request using a pool
                partial(this._tryRequest, options, request, originalMethod, args),
                // collect the results using the attempts object
                attempts,
              ));
          })
          // after making attempts on the pools, check the results to see
          // if any succeeded
          .then(() => {
            if (attempts.success) {
              // if one of the failover pools suceeded, promote it to primary
              if (attempts.poolIndex > 0) {
                this._promotePool(attempts.poolIndex);
              }
              return attempts;
            }
            // only attempt to heal pools if the request was not successful.
            // this should reduce unnecessary connections to non-primary pools.
            // returns a bool indicating if a heal attempt was made against any pool.
            return this._healPools(attempts.unhealthyPools)
              .then((anyPoolsHealed) => {
                // if the request wasn't successful, but at least one pool was healed,
                // we can retry our request against the pools
                const allErrors = new AggregateError(attempts.errors);
                if (anyPoolsHealed) {
                  this.emit('error', allErrors);
                  // clear out errors and unhealthyPools before retrying
                  // because we don't want errors and unhealthy pools from
                  // previous attempts influencing later ones
                  attempts.errors = [];
                  attempts.unhealthyPools = [];
                  return retry(allErrors);
                }
                throw allErrors;
              });
          }),
      )
      .then(
        // all done, process the results and return them using the correct
        // interface (promise, stream, or callback)
        requestMethodSuccess(request, attempts, cb),
        requestMethodFailure(request, attempts, cb),
      );
    };
  }

  _promotePool = (poolIndex) => {
    // if pools are being healed or prioritized, we can't mess with this.pools since
    // it's mutated during those operations. another successful request will
    // have to promote the pool
    if (this._healingPromise) {
      debug('_promotePool called during heal, skipping promotion');
      return;
    }
    if (this._prioritizePromise) {
      debug('_promotePool called during prioritize, skipping promotion');
      return;
    }
    // track some stats
    this.pools[poolIndex].lastPromotionAt = Date.now();
    this.pools[poolIndex].promotionCount += 1;
    // moves the pool at poolIndex to the start of the pools array
    this.pools = [...this.pools.splice(poolIndex, 1), ...this.pools];
  }

  _isErrorRetryable = (/* err */) =>
    // TODO, need to identify which errors are retryable
     true

  _isPoolUnhealthy = (/* pool, err */) =>
    // TODO, need to identify which pool states and errors indicate an unhealthy pool
     true

  _healPools = (unhealthyPools) => {
    // if we don't have any unhealthy pools, just return
    if (unhealthyPools.length === 0) {
      return Promise.resolve(false);
    }
    // get any updated dsn info from the provider
    this._healingPromise = this._healingPromise || this.dsnProvider()
      .then(addDefaultDsnProperties)
      .then(addConnectionPoolProperties(this.connectionPoolConfig))
      .catch((err) => {
        // if the dsn provider fails to give us updated dsns
        // we will just try recreating connections using the existing
        // dsns.
        this.emit('error', err);
        return this.pools.map(pool => pool.dsn);
      })
      .then(dsns => Promise.all(
        // take note, this._healPool never rejects, but it can resolve with errors
        unhealthyPools.map(unhealthyPool => this._healPool(dsns, unhealthyPool)),
      ))
      .then((results) => {
        let anyPoolsHealed = false;
        results.forEach((result) => {
          if (result instanceof Error) {
            this.emit('error', result);
            return;
          }
          // are any of the results truthy and not an error?
          anyPoolsHealed = anyPoolsHealed || !!result;
        });
        this._healingPromise = null;
        return anyPoolsHealed;
      });
    return this._healingPromise;
  }

  _healPool = (dsns, unhealthyPool) => {
    const unhealthyPoolIndex = this.pools.findIndex(pool => pool.dsn.id === unhealthyPool.dsn.id);
    if (unhealthyPoolIndex === -1) {
      // the unhealthy pool has already been removed from the pools collections,
      // so nothing needs to be done
      return Promise.resolve(new Error(`
        Could not find unhealthy pool with id ${unhealthyPool.dsn.id} in the pools
        collection, so we cannot heal this pool. If this is happening, there is probably
        a bug somewhere...
      `));
    }
    const updatedDsn = dsns.find(dsn => dsn.id === unhealthyPool.dsn.id);
    if (!updatedDsn) {
      // remove unhealthy pool, it cannot be healed
      this.pools.splice(unhealthyPoolIndex, 1);
      return Promise.resolve(new Error(`
        Attempted to heal pool but could not find matching DSN.
        The dsnProvider is no longer providing a DSN with id ${unhealthyPool.dsn.id}.
        The pool assigned to this unhealthy DSN will be closed, but one will not
        be created to take its place. Make sure your dsnProvider always returns
        dsns with the same ids used during initial warmup.
      `));
    }
    return this.connectionPoolFactory(updatedDsn)
      .then(
        (pool) => {
          if (pool.error) {
            // some connection pool factories may opt to return an error instead
            // of rejecting the promise. the existence of an error indicates that
            // the pool did not heal successfully
            return pool.error;
          }
          // need to transfer stats from the old unhealthy pool to the new one (mutates)
          copyPoolStats(unhealthyPool, pool);
          pool.lastHealAt = Date.now();
          pool.healCount += 1;
          this.pools.splice(unhealthyPoolIndex, 1, pool);
          return true;
        },
        err => err,
      );
  }

  _prioritizePools = () => {
    if (!this.warmedUp) {
      debug('_prioritizePools called before warmup completed. this should not happen.');
      return;
    }
    if (this._healingPromise) {
      debug('_prioritizePools called during heal, skipping this run');
      return;
    }
    if (this.pools.length === 0) {
      debug('_prioritizePools called when no pools exist, this should not happen');
      return;
    }
    if (this.pools.length === 1) {
      debug('_prioritizePools called when only one pool exists, skipping this run');
      return;
    }
    if (this._prioritizePromise) {
      debug('_prioritizePools called again while already in progress');
    } else {
      debug('_prioritizePools called');
    }
    const firstPoolPriority = this.pools[0].dsn.priority;
    if (firstPoolPriority === undefined || firstPoolPriority === 0) {
      debug('first pool has top priority, no need to prioritize');
      return;
    }
    const higherPriorityPools = this.pools.filter(
      pool => pool.dsn.priority < firstPoolPriority,
    );
    if (higherPriorityPools.length === 0) {
      debug('unexpected priority config on DSNs, unable to prioritize');
      return;
    }
    const unhealthyPriorityPools = higherPriorityPools.filter(
      pool => !pool.connection.connecting && !pool.connection.connected,
    );
    this._prioritizePromise = this._prioritizePromise || Promise.resolve(unhealthyPriorityPools)
      .then((unhealthyPools) => {
        // If all the pools of a higher priority than index 0 are healthy, we can
        // skip the heal. If there are any unhealthy pools,
        // we need to heal them before sorting.
        if (unhealthyPools.length === 0) {
          this.pools.sort(poolPrioritySort);
          debug('no unhealthy pools detected during prioritization');
          return true;
        }
        debug(`healing ${unhealthyPools.length} pools during prioritization`);
        return this._healPools(unhealthyPools);
      })
      .then((anyHealthyPools) => {
        if (!anyHealthyPools) {
          debug('none of the pools eligible for prioritization are healthy, unable to prioritize');
          return;
        }
        this.pools.sort(poolPrioritySort);
        debug('prioritized pools');
      })
      .then(() => {
        this._prioritizePromise = null;
      })
      .catch((err) => {
        debug('unexpected error during _prioritizePools');
        debug(err);
        this._prioritizePromise = null;
      });
  }

  _startPrioritizingPools = () => {
    if (this._prioritizeTimer) {
      // Prioritizing has already begun
      return;
    }
    debug(`_startPrioritizingPools called with interval ${this.config.prioritizeInterval}`);
    this._prioritizeTimer = setInterval(() => {
      this._prioritizePools();
    }, this.config.prioritizeInterval);
  }
}
