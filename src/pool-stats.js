export default function poolStats(pool) {
  const {
    lastPromotionAt,
    lastHealAt,
    promotionCount,
    healCount,
    retryCount,
  } = pool;
  const {
    priority,
  } = pool.dsn;
  const {
    connecting,
    connected,
    healthy,
  } = pool.connection;
  const {
    user,
    server,
    database,
    id,
    createdAt,
    port,
    connectTimeout,
    requestTimeout,
  } = pool.connection.config;
  const {
    readOnlyIntent,
    appName,
    encrypt,
  } = pool.connection.config.options;
  const {
    max,
    min,
    acquireTimeoutMillis,
    createTimeoutMillis,
    idleTimeoutMillis,
  } = (pool.connection.pool || {});
  return {
    health: {
      connected,
      connecting,
      healthy,
      lastHealAt,
      lastPromotionAt,
      healCount,
      promotionCount,
      retryCount,
    },
    config: {
      user,
      server,
      database,
      id,
      priority,
      createdAt,
      port,
      appName,
      encrypt,
      readOnlyIntent,
      poolMin: min,
      poolMax: max,
    },
    timeouts: {
      connect: connectTimeout,
      request: requestTimeout,
      poolAcquire: acquireTimeoutMillis,
      poolCreate: createTimeoutMillis,
      poolIdle: idleTimeoutMillis,
    },
  };
}
