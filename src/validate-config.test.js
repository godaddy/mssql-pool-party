import validateConfig from './validate-config';

describe('validate-config', () => {
  it('throws if config does not exist', () => {
    expect(() => validateConfig()).toThrow();
  });
  it('throws if config does not contain any dsn properties', () => {
    expect(() => validateConfig({})).toThrow();
  });
  it('throws if config contains more than one dsn property', () => {
    expect(() => validateConfig({ dsn: {}, dsns: [] })).toThrow();
  });
});
