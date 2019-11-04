// The serialWarmupStrategy attempts to create connection pools in series, based
// on the order of the dsns provided.
// This isn't a very good strategy to use in practice, but it can be useful for testing
export default function serialWarmupStrategy(dsns, connectionPoolFactory, onCreation, onError) {
  return dsns.reduce((p, dsn) => p.then(
    () => connectionPoolFactory(dsn).then(
      (pool) => onCreation(pool),
      (err) => onError(err),
    ),
  ), Promise.resolve());
}
