import setDebug from 'debug';

const debug = setDebug('mssql-pool-party');

export default function requestMethodFailure(request, attempts, cb) {
  return (err) => {
    debug(`request ${request.id} failed!`);
    debug(err);
    if (typeof cb === 'function') {
      return cb(err);
    } else if (request.stream) {
      return request.emit('poolparty_done', undefined, attempts.attemptNumber);
    }
    throw err;
  };
}
