import AggregateError from 'aggregate-error';
import * as sql from '../../src';

const procResults = {
  output: {},
  recordset: [{ ID: 6, PartyAnimalName: 'Diogenes' }],
  recordsets: [
    [{ ID: 6, PartyAnimalName: 'Diogenes' }],
  ],
  returnValue: 0,
  rowsAffected: [],
};

let connection;

describe('execute (stored procedures) tests using promise interface', () => {
  beforeEach(() => {
    connection = new sql.ConnectionPoolParty({
      dsn: {
        user: 'sa',
        password: 'PoolPartyyy9000',
        server: 'localhost',
        database: 'PoolParty',
        trustServerCertificate: true,
        encrypt: false,
      },
      retries: 1,
      reconnects: 1,
    });
  });
  afterEach(() => connection.close());
  it('returns expected results with explicit warmup',
    () => connection.warmup()
      .then(() => {
        expect(connection.pools[0].connection.connected).toEqual(true);
        return connection.request()
          .input('ID', sql.Int, 6)
          .execute('GetPartyAnimalByID')
          .then((result) => {
            expect(result).toEqual(procResults);
          });
      }));
  it('returns expected results with implicit warmup', () => {
    expect(connection.pools.length).toEqual(0);
    return connection.request()
      .input('ID', sql.Int, 6)
      .execute('GetPartyAnimalByID')
      .then((result) => {
        expect(result).toEqual(procResults);
      });
  });
  it('returns expected results after a reconnect',
    () => connection.warmup()
      .then(() => {
        expect(connection.pools[0].connection.connected).toEqual(true);
        // manually closing a connection to simulate failure
        return connection.pools[0].connection.close();
      })
      .then(() => {
        // verify connection has been manually closed
        expect(connection.pools[0].connection.connected).toEqual(false);
        return connection.request()
          .input('ID', sql.Int, 6)
          .execute('GetPartyAnimalByID')
          .then((result) => {
            expect(result).toEqual(procResults);
          });
      }));
  it('rejects with an error with an unhealthy connection and 0 reconnects',
    () => connection.warmup()
      .then(() => {
        expect(connection.pools[0].connection.connected).toEqual(true);
        // manually closing a connection to simulate failure
        return connection.pools[0].connection.close();
      })
      .then(() => {
        // verify connection has been manually closed
        expect(connection.pools[0].connection.connected).toEqual(false);
        return connection.request({ reconnects: 0 })
          .input('ID', sql.Int, 6)
          .execute('GetPartyAnimalByID')
          .then(
            () => { expect('the promise should reject').toEqual(false); },
            (err) => {
              expect(err).toBeInstanceOf(AggregateError);
            },
          );
      }));
});
