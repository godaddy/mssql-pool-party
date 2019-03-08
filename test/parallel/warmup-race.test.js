import defaultConnectionPoolFactory from '../../src/default-connection-pool-factory';
import * as sql from '../../src';

let connection;
const factorySpy = jest.fn(defaultConnectionPoolFactory);

describe('warmup race tests', () => {
  beforeEach(() => {
    factorySpy.mockClear();
    connection = new sql.ConnectionPoolParty({
      // the dsns are the same, but are sufficient for these tests
      dsn: {
        user: 'sa',
        password: 'PoolPartyyy9000',
        server: 'localhost',
        database: 'PoolParty',
      },
      reconnects: 1,
      connectionPoolFactory: factorySpy,
    });
  });
  afterEach(() => connection.close());
  it('multiple simultaneous requests with implicit warmup only result in a single warmup', () => Promise.all([
    connection.request().query('select * from PartyAnimals'),
    connection.request().query('select * from PartyAnimals'),
    connection.request().query('select * from PartyAnimals'),
    connection.request().query('select * from PartyAnimals'),
    connection.request().query('select * from PartyAnimals'),
    connection.request().query('select * from PartyAnimals'),
  ])
    .then(() => {
      // confirm primary is reconnected
      expect(connection.pools[0].connection.connected).toEqual(true);
      expect(factorySpy).toHaveBeenCalledTimes(1);
    }),
  );
});
