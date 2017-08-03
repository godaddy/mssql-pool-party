export default function requestMethodSuccess(request, attempts, cb) {
  return () => {
    if (typeof cb === 'function') {
      return cb(null, attempts.success.recordset, attempts.success.returnValue);
    } else if (request.stream) {
      return request.emit('poolparty_done', attempts.success.rowsAffected, attempts.attemptNumber);
    }
    return attempts.success;
  };
}
