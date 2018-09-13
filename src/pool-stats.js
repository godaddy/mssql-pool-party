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
    idleTimeoutMillis,
  } = (pool.connection.pool && pool.connection.pool._config) || {};
  return {
    health: {
      connected,
      connecting,
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
      poolIdle: idleTimeoutMillis,
    },
  };
}
