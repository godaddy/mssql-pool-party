import AggregateError from 'aggregate-error';
import * as sql from '../src';

const queryResults = {
  recordset: [
    { ID: 1, PartyAnimalName: 'Plato' },
    { ID: 2, PartyAnimalName: 'Socrates' },
    { ID: 3, PartyAnimalName: 'Anaximander' },
    { ID: 4, PartyAnimalName: 'Anaximenes' },
    { ID: 5, PartyAnimalName: 'Speusippus' },
    { ID: 6, PartyAnimalName: 'Diogenes' },
    { ID: 7, PartyAnimalName: 'Lycophron' },
  ],
  returnValue: undefined,
};

let connection;

describe('query tests using callback interface', () => {
  beforeEach(() => {
    connection = new sql.ConnectionPoolParty({
      dsn: {
        user: 'sa',
        password: 'PoolPartyyy9000',
        server: 'localhost',
        database: 'PoolParty',
      },
      retries: 1,
      reconnects: 1,
    });
  });
  afterEach(() => {
    connection.close();
  });
  it('returns expected results with explicit warmup', (done) => {
    connection.warmup()
      .then(() => {
        expect(connection.pools[0].connection.connected).toEqual(true);
        connection.request()
          .query('select * from PartyAnimals', (err, recordset, returnValue) => {
            expect(recordset).toEqual(queryResults.recordset);
            expect(returnValue).toEqual(queryResults.returnValue);
            done();
          });
      });
  });
  it('returns expected results with implicit warmup', (done) => {
    expect(connection.pools.length).toEqual(0);
    connection.request()
      .query('select * from PartyAnimals', (err, recordset, returnValue) => {
        expect(recordset).toEqual(queryResults.recordset);
        expect(returnValue).toEqual(queryResults.returnValue);
        done();
      });
  });
  it('returns expected results after a reconnect', (done) => {
    connection.warmup()
      .then(() => {
        expect(connection.pools[0].connection.connected).toEqual(true);
        // manually closing a connection to simulate failure
        return connection.pools[0].connection.close();
      })
      .then(() => {
        // verify connection has been manually closed
        expect(connection.pools[0].connection.connected).toEqual(false);
        connection.request()
          .query('select * from PartyAnimals', (err, recordset, returnValue) => {
            expect(recordset).toEqual(queryResults.recordset);
            expect(returnValue).toEqual(queryResults.returnValue);
            done();
          });
      });
  });
  it('rejects with an error with an unhealthy connection and 0 reconnects', (done) => {
    connection.warmup()
      .then(() => {
        expect(connection.pools[0].connection.connected).toEqual(true);
        // manually closing a connection to simulate failure
        return connection.pools[0].connection.close();
      })
      .then(() => {
        // verify connection has been manually closed
        expect(connection.pools[0].connection.connected).toEqual(false);
        connection.request({ reconnects: 0 })
          .query('select * from PartyAnimals', (err) => {
            expect(err).toBeInstanceOf(AggregateError);
            done();
          });
      });
  });
});
