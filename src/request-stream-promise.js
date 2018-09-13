import AggregateError from 'aggregate-error';

export default function requestStreamPromise(request, originalMethod, attempts) {
  return (...args) => new Promise((resolve, reject) => {
    const errors = [];
    const recordsetHandler = (recordset) => {
      request.emit('poolparty_recordset', recordset, attempts.attemptNumber);
    };
    const rowHandler = (row) => {
      request.emit('poolparty_row', row, attempts.attemptNumber);
    };
    const errorHandler = (err) => {
      errors.push(err);
      request.emit('poolparty_error', err, attempts.attemptNumber);
    };
    const doneHandler = (result) => {
      request.removeListener('_recordset', recordsetHandler);
      request.removeListener('_row', rowHandler);
      request.removeListener('_error', errorHandler);
      request.removeListener('_done', doneHandler);
      if (errors.length > 0) {
        return reject(new AggregateError(errors));
      }
      return resolve(result);
    };
    originalMethod.apply(request, args);
    request.on('_recordset', recordsetHandler);
    request.on('_row', rowHandler);
    request.on('_error', errorHandler);
    request.on('_done', doneHandler);
  });
}
