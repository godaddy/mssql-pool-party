const dsnSources = ['dsn', 'dsns', 'dsnProvider'];

export default function validateConfig(config) {
  if (!config) {
    throw new Error('config is a required parameter when instantiating ConnectionPoolParty');
  }
  const dsnSourcesInConfig = Object.keys(config).filter(key => dsnSources.includes(key));
  if (dsnSourcesInConfig.length === 0) {
    throw new Error(`One of the following config items is required: ${dsnSources.join(', ')}`);
  }
  if (dsnSourcesInConfig.length > 1) {
    throw new Error(`You can only specify one of the following config items: ${dsnSources.join(', ')}`);
  }
}
