import setDebug from 'debug';

const debug = setDebug('mssql-pool-party');

function rejectIfNoRemainingPools(reject, processed, total, resolved) {
  if (processed >= total && !resolved) {
    debug('warmup: failed, no pools healthy pools created');
    reject(new Error(`
      The connectionPoolFactory failed to create any pool(s) using
      the dsn(s) provided. Warmup has failed.
    `));
  }
}

// The raceWarmupStrategy attempts to create connection pools in parallel.
// The first to succeed will resolve the promise, signaling that the warmup is done.
// If there is more than one dsn, pools will be created for the rest in the background
// and added to the ConnectionPoolParty pools collection as they are created.
export default function raceWarmupStrategy(dsns, connectionPoolFactory, onCreation, onError) {
  // have we successfully created a pool?
  let resolved = false;
  // the number of pools we've created/failed
  let numberProcessed = 0;

  return new Promise((resolve, reject) => {
    // for each dsn, create a pool
    dsns.forEach((dsn) => {
      connectionPoolFactory(dsn)
        .then(
          // if we succeed in creating a pool, pass it to onCreation
          // and resolve if we haven't already done so
          (pool) => {
            numberProcessed += 1;
            debug(`warmup: pool ${numberProcessed} created ${(pool.error && 'with error') || ''}`);
            onCreation(pool);
            // we only want to resolve once
            if (!resolved && !pool.error) {
              resolved = true;
              debug('warmup: resolved');
              resolve();
            }
            rejectIfNoRemainingPools(reject, numberProcessed, dsns.length, resolved);
          },
          // normally, connectionPoolFactory should never reject,
          // since we want it to create a pool even if it's unhealthy,
          // so we can attempt to heal the pool later
          (err) => {
            numberProcessed += 1;
            debug('warmup: connectionPoolFactory errored');
            onError(err);
            rejectIfNoRemainingPools(reject, numberProcessed, dsns.length, resolved);
          },
        );
    });
  });
}
