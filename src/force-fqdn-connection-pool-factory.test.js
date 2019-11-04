import defaultConnectionPoolFactory from './default-connection-pool-factory';
import forceFqdnConnectionPoolFactory from './force-fqdn-connection-pool-factory';

jest.mock('./default-connection-pool-factory');
defaultConnectionPoolFactory.mockImplementation((dsn) => dsn);

describe('force-fqdn-connection-pool-factory', () => {
  it('appends an fqdn suffix to a server that contains an instance', () => {
    const factory = forceFqdnConnectionPoolFactory('.some.fqdn');
    const dsn = {
      server: 'SOMEHOSTNAME\\SOMEINSTANCE',
    };
    const result = factory(dsn);
    expect(result.server).toEqual('SOMEHOSTNAME.some.fqdn\\SOMEINSTANCE');
  });
});
