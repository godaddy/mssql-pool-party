import * as sql from '../src';

let connection;

describe('execute many writes tests using promise interface', () => {
  let originalTimeout;
  beforeAll(() => {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  });
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
  afterAll(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });
  afterEach(done => connection.request()
    .query('TRUNCATE TABLE PoolParty.dbo.PoolToys;')
    .then(() => {
      connection.close();
      // need to give mssql ample time to clear the table so tests
      // don't step on eachother
      setTimeout(done, 2000);
      done();
    }),
  );
  it('perform 10000 writes',
    () => connection.warmup()
      .then(() => connection.request().query('SELECT * FROM PoolParty.dbo.PoolToys'))
      .then((results) => {
        expect(results.recordset.length).toEqual(0);
      })
      .then(() => {
        const randomValues = [...new Array(10000)].map(
          () => Math.random().toString(36).substring(7),
        );
        return Promise.all(
          randomValues.map(
            name => connection.request()
              .input('PoolToyName', sql.NVarChar, name)
              .execute('AddPoolToy'),
          ),
        );
      })
      .then((results) => {
        expect(results.every(result => result.returnValue === 0)).toEqual(true);
      })
      .then(() => connection.request().query('SELECT * FROM PoolParty.dbo.PoolToys'))
      .then((results) => {
        expect(results.recordset.length).toEqual(10000);
      }),
  );
});
