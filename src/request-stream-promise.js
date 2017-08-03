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
    const doneHandler = (...params) => {
      request.removeListener('_recordset', recordsetHandler);
      request.removeListener('_row', rowHandler);
      request.removeListener('_error', errorHandler);
      request.removeListener('_done', doneHandler);
      if (errors.length > 0) {
        return reject(new AggregateError(errors));
      }
      // annoyingly, we have to rely on parameter cardinality here
      // because v3 mssql sends parameters in different order depending
      // on the method called.
      if (params.length === 2) {
        return resolve({
          returnValue: params[0],
          rowsAffected: params[1],
        });
      } else if (params.length === 1) {
        return resolve({
          rowsAffected: params[0],
        });
      }
      return resolve({});
    };
    originalMethod.apply(request, args);
    request.on('_recordset', recordsetHandler);
    request.on('_row', rowHandler);
    request.on('_error', errorHandler);
    request.on('_done', doneHandler);
  });
}
