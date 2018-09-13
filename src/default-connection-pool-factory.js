import sql from 'mssql';

export default function defaultConnectionPoolFactory(dsn) {
  const connection = new sql.ConnectionPool(dsn);
  // we don't want an 'Uncaught, unspecified "error" event.' exception
  // so we have a dummy listener here.
  connection.on('error', () => {});
  return connection.connect()
    .then(
      // a pool is an object that has dsn and connection properties
      () => ({
        connection,
        dsn,
      }),
      // even if we fail to connect, we still want to create the pool, so we
      // can attempt to heal it later on
      err => ({
        connection,
        dsn,
        error: err,
      }),
    );
}
