import * as sql from '../src';

const config = {
  dsn: {
    user: 'sa',
    password: 'PoolPartyyy9000',
    server: 'localhost',
    database: 'PoolParty',
  },
  // set due to this bug https://github.com/tediousjs/node-mssql/issues/457
  // without this, jest will hang waiting for open handles to close
  connectionPoolConfig: {
    pool: {
      evictionRunIntervalMillis: 500,
      idleTimeoutMillis: 500,
    },
  },
  retries: 1,
  reconnects: 1,
};

let connection;

describe('other tests using callback interface', () => {
  afterEach(() => connection.close());
  it(`constructor accepts an optional callback which will trigger a warmup and
      call it afterwrard`, (done) => {
    connection = new sql.ConnectionPoolParty(config, () => {
      expect(connection.pools[0].connection.connected).toBe(true);
      done();
    });
  });
  it('warmup accepts an optional callback', (done) => {
    connection = new sql.ConnectionPoolParty(config);
    connection.warmup(() => {
      expect(connection.pools[0].connection.connected).toBe(true);
      done();
    });
  });
  it('close accepts an optional callback', (done) => {
    connection = new sql.ConnectionPoolParty(config);
    connection.warmup().then(() => {
      expect(connection.pools[0].connection.connected).toBe(true);
      connection.close(() => {
        expect(connection.pools.length).toBe(0);
        done();
      });
    });
  });
  // Other methods have callback interface tests in their own files (execute, query, etc)
});
