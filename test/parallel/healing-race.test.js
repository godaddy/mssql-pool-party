import * as sql from '../../src';

let connection;

describe('healing race tests', () => {
  beforeEach(() => {
    connection = new sql.ConnectionPoolParty({
      // the dsns are the same, but are sufficient for these tests
      dsn: {
        user: 'sa',
        password: 'PoolPartyyy9000',
        server: 'localhost',
        database: 'PoolParty',
        trustServerCertificate: true,
        encrypt: false,
      },
      reconnects: 1,
    });
  });
  afterEach(() => connection.close());
  it('multiple simultaneous requests only result in a single healing attempt on unhealthy pool',
    () => connection.warmup()
      .then(() => connection.pools[0].connection.close())
      .then(() => {
        // confirm primary is closed
        expect(connection.pools[0].connection.connected).toEqual(false);
        return Promise.all([
          connection.request().query('select * from PartyAnimals'),
          connection.request().query('select * from PartyAnimals'),
          connection.request().query('select * from PartyAnimals'),
          connection.request().query('select * from PartyAnimals'),
          connection.request().query('select * from PartyAnimals'),
          connection.request().query('select * from PartyAnimals'),
        ]);
      })
      .then(() => {
        // confirm primary is reconnected
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.stats().pools[0].health.healCount).toEqual(1);
      }));
});
