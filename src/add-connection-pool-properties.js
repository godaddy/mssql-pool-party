export default function addConnectionPoolProperties(config) {
  return dsns => dsns.map(dsn => ({
    ...dsn,
    ...config,
  }));
}
