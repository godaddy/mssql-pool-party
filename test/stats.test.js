import * as sql from '../src';
import delay from './delay';

const statsAfterWarmup = {
  pools: [{
    health: {
      connected: true,
      connecting: false,
      lastHealAt: undefined,
      lastPromotionAt: undefined,
      healCount: 0,
      promotionCount: 0,
      retryCount: 0,
    },
    config: {
      user: 'sa',
      server: 'localhost',
      database: 'PoolParty',
      id: expect.any(String),
      createdAt: expect.any(Number),
      driver: 'tedious',
      port: 1433,
      tdsVersion: '7_4',
      readOnlyIntent: false,
      poolMin: 0,
      poolMax: 10,
    },
    timeouts: {
      connect: 15000,
      request: 15000,
      cancel: 5000,
      poolIdle: 30000,
    },
  }, {
    health: {
      connected: true,
      connecting: false,
      lastHealAt: undefined,
      lastPromotionAt: undefined,
      healCount: 0,
      promotionCount: 0,
      retryCount: 0,
    },
    config: {
      user: 'sa',
      server: 'localhost',
      database: 'PoolParty',
      id: expect.any(String),
      createdAt: expect.any(Number),
      driver: 'tedious',
      port: 1433,
      tdsVersion: '7_4',
      readOnlyIntent: false,
      poolMin: 0,
      poolMax: 10,
    },
    timeouts: {
      connect: 15000,
      request: 15000,
      cancel: 5000,
      poolIdle: 30000,
    },
  }],
  healing: false,
  warmedUp: true,
  reconnects: 1,
  reconnectCount: 0,
  retries: 1,
};

let connection;

describe('stats tests', () => {
  beforeEach(() => {
    connection = new sql.ConnectionPoolParty({
      dsns: [{
        user: 'sa',
        password: 'PoolPartyyy9000',
        server: 'localhost',
        database: 'PoolParty',
      }, {
        user: 'sa',
        password: 'PoolPartyyy9000',
        server: 'localhost',
        database: 'PoolParty',
      }],
      retries: 1,
      reconnects: 1,
    });
  });
  afterEach(() => {
    connection.close();
  });
  it('displays expected stats after warmup',
    () => connection.warmup()
      .then(delay(100)) // need a delay due to race warmup strategy
      .then(() => {
        expect(connection.stats()).toEqual(statsAfterWarmup);
      }));
  it(`displays expected stats after the primary connection becomes unhealthy
      and the secondary is promoted`, () => {
    let primaryId;
    let secondaryId;
    return connection.warmup()
      .then(delay(100)) // need a delay due to race warmup strategy
      .then(() => {
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
      .then(() => {
        // verify the secondary was promoted
        expect(connection.pools[0].dsn.id).toEqual(secondaryId);
        expect(connection.pools[1].dsn.id).toEqual(primaryId);
        const stats = connection.stats();
        expect(stats.pools[0].health.lastPromotionAt).toEqual(expect.any(Number));
        expect(stats.pools[0].health.promotionCount).toEqual(1);
        expect(stats.pools[1].health.connected).toBe(false);
      });
  });
  it('displays expected stats after both pools fail a request and are healed', () => {
    let primaryId;
    let secondaryId;
    return connection.warmup()
      .then(delay(100)) // need a delay due to race warmup strategy
      .then(() => {
        primaryId = connection.pools[0].dsn.id;
        secondaryId = connection.pools[1].dsn.id;
        return Promise.all([
          connection.pools[0].connection.close(),
          connection.pools[1].connection.close(),
        ]);
      })
      .then(() => {
        // confirm both pools are closed
        expect(connection.pools[0].connection.connected).toEqual(false);
        expect(connection.pools[1].connection.connected).toEqual(false);
        return connection.request()
          .query('select * from PartyAnimals');
      })
      .then(() => {
        // verify the secondary was promoted
        expect(connection.pools[0].dsn.id).toEqual(primaryId);
        expect(connection.pools[1].dsn.id).toEqual(secondaryId);
        const stats = connection.stats();
        expect(stats.pools[0].health.connected).toBe(true);
        expect(stats.pools[0].health.healCount).toBe(1);
        expect(stats.pools[0].health.lastHealAt).toEqual(expect.any(Number));
        expect(stats.pools[1].health.connected).toBe(true);
        expect(stats.pools[1].health.healCount).toBe(1);
        expect(stats.pools[1].health.lastHealAt).toEqual(expect.any(Number));
      });
  });
});
