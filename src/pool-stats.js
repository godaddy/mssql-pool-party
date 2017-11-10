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
    driver,
    port,
  } = pool.connection.config;
  const {
    connectTimeout,
    requestTimeout,
    tdsVersion,
    cancelTimeout,
    readOnlyIntent,
  } = pool.connection.config.options;
  const {
    max,
    min,
    idleTimeoutMillis,
  } = (pool.connection.pool && pool.connection.pool._factory) || {};
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
      driver,
      port,
      tdsVersion,
      readOnlyIntent,
      poolMin: min,
      poolMax: max,
    },
    timeouts: {
      connect: connectTimeout,
      request: requestTimeout,
      cancel: cancelTimeout,
      poolIdle: idleTimeoutMillis,
    },
  };
}
