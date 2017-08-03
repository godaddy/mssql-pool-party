export default class PoolError extends Error {
  constructor(pool, err) {
    super(err);
    this.pool = { ...pool };
    // don't want passwords appearing in errors
    delete this.pool.dsn.password;
  }
}
