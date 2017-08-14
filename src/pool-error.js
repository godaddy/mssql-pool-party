export default class PoolError extends Error {
  constructor(pool, err) {
    super(err);
    // clone the dsn and don't expose the password
    if (pool && pool.dsn) {
      this.dsn = { ...pool.dsn };
      delete this.dsn.password;
    }
  }
}
