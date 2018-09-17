import setDebug from 'debug';

const debug = setDebug('mssql-pool-party');

export default function requestMethodSuccess(request, attempts, cb) {
  return () => {
    debug('request %s succeeded', request.id);
    if (typeof cb === 'function') {
      return cb(null, attempts.success);
    } else if (request.stream) {
      return request.emit('poolparty_done', attempts.success, attempts.attemptNumber);
    }
    return attempts.success;
  };
}
