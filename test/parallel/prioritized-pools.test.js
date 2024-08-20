import * as sql from '../../src';
import serialWarmupStrategy from '../../src/serial-warmup-strategy';
import delay from '../delay';

let connection;
const realSetTimeout = setTimeout;
jest.useFakeTimers();

// These tests are broken due to the changed behaviors of fake timers in Jest.
describe.skip('prioritized pools tests', () => {
  afterEach(() => connection.close());
  it(`lower priority pool starts out as the primary but is replaced by a higher priority
    pool after a prioritize cycle completes`, () => {
    connection = new sql.ConnectionPoolParty({
      // the dsns are the same, but are sufficient for these tests
      dsns: [
        {
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          priority: 1,
          trustServerCertificate: true,
          encrypt: false,
        },
        {
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          priority: 0,
          trustServerCertificate: true,
          encrypt: false,
        },
      ],
      prioritizePools: true,
      // this helps prevent warmup from resolving before all the pools are created
      warmupStrategy: serialWarmupStrategy,
    });
    return connection.warmup()
      .then(() => {
        // confirm priority1 pool is first and priority0 is second
        expect(connection.pools[0].dsn.priority).toEqual(1);
        expect(connection.pools[1].dsn.priority).toEqual(0);
        // confirm both pools are connected
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(true);
        // force a prioritize cycle
        jest.runOnlyPendingTimers();
      })
      // need to wait for the heal to finish during the prioritize cycle
      .then(delay(1000, realSetTimeout))
      .then(() => {
        // confirm priority1 pool is now second and priority0 is now first
        expect(connection.pools[0].dsn.priority).toEqual(0);
        expect(connection.pools[1].dsn.priority).toEqual(1);
      });
  });
  it(`lower priority pool starts out as the primary. higher priority pool is unhealthy.
    the higher priority pool is healed and placed as primary after a prioritize cycle
    completes.`, () => {
    connection = new sql.ConnectionPoolParty({
      // the dsns are the same, but are sufficient for these tests
      dsns: [
        {
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          priority: 1,
          trustServerCertificate: true,
          encrypt: false,
        },
        {
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          priority: 0,
          trustServerCertificate: true,
          encrypt: false,
        },
      ],
      prioritizePools: true,
      // this helps prevent warmup from resolving before all the pools are created
      warmupStrategy: serialWarmupStrategy,
    });
    return connection.warmup()
      .then(() => {
        // confirm priority1 pool is first and priority0 is second
        expect(connection.pools[0].dsn.priority).toEqual(1);
        expect(connection.pools[1].dsn.priority).toEqual(0);
        // confirm both pools are connected
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(true);
        // close the priority0 pool
        return connection.pools[1].connection.close();
      })
      .then(() => {
        // confirm priority0 is closed and priority1 is open
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(false);
        // force a prioritize cycle
        // jest.runOnlyPendingTimers();
      })
      // need to wait for the heal to finish during the prioritize cycle
      .then(delay(1000, realSetTimeout))
      .then(() => {
        // confirm priority1 pool is now second and priority0 is now first
        // and that they are both connected
        expect(connection.pools[0].dsn.priority).toEqual(0);
        expect(connection.pools[1].dsn.priority).toEqual(1);
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(true);
      });
  });
  it('does not reprioritize if all higher priority pools cannot be healed', () => {
    connection = new sql.ConnectionPoolParty({
      // the dsns are the same, but are sufficient for these tests
      dsns: [
        {
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          priority: 1,
          trustServerCertificate: true,
          encrypt: false,
        },
        {
          user: 'sa',
          password: 'wrong password',
          server: 'localhost',
          database: 'PoolParty',
          priority: 0,
          trustServerCertificate: true,
          encrypt: false,
        },
      ],
      prioritizePools: true,
      // this helps prevent warmup from resolving before all the pools are created
      warmupStrategy: serialWarmupStrategy,
    });
    return connection.warmup()
      .then(() => {
        // confirm priority1 pool is first and priority0 is second
        expect(connection.pools[0].dsn.priority).toEqual(1);
        expect(connection.pools[1].dsn.priority).toEqual(0);
        // confirm priority1 pool is healthy but priority0 is not
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(false);
        jest.runOnlyPendingTimers();
      })
      // need to wait for the heal to finish during the prioritize cycle
      .then(delay(1000, realSetTimeout))
      .then(() => {
        // confirm priority1 pool is still primary
        expect(connection.pools[0].dsn.priority).toEqual(1);
        expect(connection.pools[1].dsn.priority).toEqual(0);
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(false);
      });
  });
  it(`if only some of the unhealthy pools are healed, the ones that remain
    unhealthy will not be prioritized`, () => {
    connection = new sql.ConnectionPoolParty({
      // the dsns are the same, but are sufficient for these tests
      dsns: [
        {
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          priority: 2,
          trustServerCertificate: true,
          encrypt: false,
        },
        {
          user: 'sa',
          password: 'wrong password',
          server: 'localhost',
          database: 'PoolParty',
          priority: 0,
          trustServerCertificate: true,
          encrypt: false,
        },
        {
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          priority: 1,
          trustServerCertificate: true,
          encrypt: false,
        },
      ],
      prioritizePools: true,
      // this helps prevent warmup from resolving before all the pools are created
      warmupStrategy: serialWarmupStrategy,
    });
    return connection.warmup()
      .then(() => {
        // confirm priority2 pool is first, priority0 is second, and priority1 is third
        expect(connection.pools[0].dsn.priority).toEqual(2);
        expect(connection.pools[1].dsn.priority).toEqual(0);
        expect(connection.pools[2].dsn.priority).toEqual(1);
        // confirm the priority0 pool is disconnected
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(false);
        expect(connection.pools[2].connection.connected).toEqual(true);
        return connection.pools[2].connection.close();
      })
      .then(() => {
        // confirm priority0 and priority1 pools are disconnected
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(false);
        expect(connection.pools[2].connection.connected).toEqual(false);
        jest.runOnlyPendingTimers();
      })
      // need to wait for the heal to finish during the prioritize cycle
      .then(delay(1000, realSetTimeout))
      .then(() => {
        // confirm that priority1 was reprioritized but priority0 was not
        // because it is still disconnected
        expect(connection.pools[0].dsn.priority).toEqual(1);
        expect(connection.pools[1].dsn.priority).toEqual(2);
        expect(connection.pools[2].dsn.priority).toEqual(0);
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(true);
        expect(connection.pools[2].connection.connected).toEqual(false);
      });
  });
  it(`does not heal pools with a lower priority than the primary during a prioritize
     cycle`, () => {
    connection = new sql.ConnectionPoolParty({
      // the dsns are the same, but are sufficient for these tests
      dsns: [
        {
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          priority: 1,
          trustServerCertificate: true,
          encrypt: false,
        },
        {
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          priority: 0,
          trustServerCertificate: true,
          encrypt: false,
        },
        {
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          priority: 2,
          trustServerCertificate: true,
          encrypt: false,
        },
      ],
      prioritizePools: true,
      // this helps prevent warmup from resolving before all the pools are created
      warmupStrategy: serialWarmupStrategy,
    });
    return connection.warmup()
      .then(() => {
        // confirm priority1 pool is first, priority0 is second, and priority2 is third
        expect(connection.pools[0].dsn.priority).toEqual(1);
        expect(connection.pools[1].dsn.priority).toEqual(0);
        expect(connection.pools[2].dsn.priority).toEqual(2);
        // confirm all pools are connected
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(true);
        expect(connection.pools[2].connection.connected).toEqual(true);
        // close the priority0 pool
        return connection.pools[1].connection.close();
      })
      // also close priority2 pool
      .then(() => connection.pools[2].connection.close())
      .then(() => {
        // confirm priority0/2 are closed and priority1 is open
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(false);
        expect(connection.pools[2].connection.connected).toEqual(false);
        // force a prioritize cycle
        jest.runOnlyPendingTimers();
      })
      // need to wait for the heal to finish during the prioritize cycle
      .then(delay(1000, realSetTimeout))
      .then(() => {
        // confirm priority1 pool is now second, priority0 is now first, and
        // priority2 is still third
        // confirm that priority0 is healed and now connected, but not priority2
        expect(connection.pools[0].dsn.priority).toEqual(0);
        expect(connection.pools[1].dsn.priority).toEqual(1);
        expect(connection.pools[2].dsn.priority).toEqual(2);
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(true);
        expect(connection.pools[2].connection.connected).toEqual(false);
      });
  });
  it('does not reprioritize if dsns do not specify a priority', () => {
    connection = new sql.ConnectionPoolParty({
      // the dsns are the same, but are sufficient for these tests
      dsns: [
        {
          id: 'pool1',
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          trustServerCertificate: true,
          encrypt: false,
        },
        {
          id: 'pool2',
          user: 'sa',
          password: 'PoolPartyyy9000',
          server: 'localhost',
          database: 'PoolParty',
          trustServerCertificate: true,
          encrypt: false,
        },
      ],
      prioritizePools: true,
      // this helps prevent warmup from resolving before all the pools are created
      warmupStrategy: serialWarmupStrategy,
    });
    return connection.warmup()
      .then(() => {
        // confirm initial order of pools
        expect(connection.pools[0].dsn.id).toEqual('pool1');
        expect(connection.pools[1].dsn.id).toEqual('pool2');
        // confirm pools are connected
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(true);
        jest.runOnlyPendingTimers();
      })
      .then(() => {
        // confirm initial order of pools
        expect(connection.pools[0].dsn.id).toEqual('pool1');
        expect(connection.pools[1].dsn.id).toEqual('pool2');
        // confirm pools are connected
        expect(connection.pools[0].connection.connected).toEqual(true);
        expect(connection.pools[1].connection.connected).toEqual(true);
        // this isn't a very good test for verifying the prioritize cycle
        // was skipped, replace with a better test if one comes to mind
      });
  });
});
