import AggregateError from 'aggregate-error';
import * as sql from '../../src';
import delay from '../delay';

let connection;

describe('multiple dsn tests', () => {
  beforeEach(() => {
    connection = new sql.ConnectionPoolParty({
      // the dsns are the same, but are sufficient for these tests
      dsns: [
        {
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          trustServerCertificate: true,
        },
        {
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          trustServerCertificate: true,
        },
      ],
    });
  });
  afterEach(() => connection.close());
  it(`secondary pool is promoted when the primary is unhealthy and the secondary succeeds.
      in addition, the former primary is not healed, it remains unhealthy after demotion.`, () => {
    let primaryId;
    let secondaryId;
    return connection.warmup()
      .then(delay(100))
      .then(() => {
        // confirm both pools are connected, then close the primary
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(true);
        primaryId = connection.pools[0].dsn.id;
        secondaryId = connection.pools[1].dsn.id;
        return connection.pools[0].connection.close();
      })
      .then(() => {
        // confirm primary is closed
        expect(connection.pools[0].connection.connected).toEqual(false);
        expect(connection.pools[1].connection.connected).toEqual(true);
        return connection.request()
          .query('select * from PartyAnimals');
      })
      .then((result) => {
        expect(result.recordset.length).toEqual(7);
        // confirm the secondary is now promoted to primary and the old primary is closed
        expect(connection.pools[0].dsn.id).toEqual(secondaryId);
        expect(connection.pools[1].dsn.id).toEqual(primaryId);
        expect(connection.pools[1].connection.connected).toEqual(false);
      });
  });
  it('all pools are healed after a failed request',
    () => connection.warmup()
      .then(delay(100))
      .then(() => {
        // confirm both pools are connected, then close both
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(true);
        return Promise.all([
          connection.pools[0].connection.close(),
          connection.pools[1].connection.close(),
        ]);
      })
      .then(() => {
        // confirm both are closed
        expect(connection.pools[0].connection.connected).toEqual(false);
        expect(connection.pools[1].connection.connected).toEqual(false);
        return connection.request()
          .query('select * from PartyAnimals');
      })
      .then(
        () => { expect('this promise should reject').toEqual(false); },
        (err) => {
          expect(err).toBeInstanceOf(AggregateError);
          // confirm the pools have been healed
          expect(connection.pools[0].connection.connected).toEqual(true);
          expect(connection.pools[1].connection.connected).toEqual(true);
        },
      ));
});
