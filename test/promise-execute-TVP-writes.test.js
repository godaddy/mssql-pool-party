import * as sql from '../src';

let connection;

describe('execute TVP write using promise interface', () => {
  let originalTimeout;
  beforeAll(() => {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
  });
  beforeEach(() => {
    connection = new sql.ConnectionPoolParty({
      dsn: {
        user: 'sa',
        password: 'PoolPartyyy9000',
        server: 'localhost',
        database: 'PoolParty',
      },
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
      setTimeout(done, 5000);
      done();
    }),
  );
  it('execute proc with TVP containing 10000 rows',
    () => connection.warmup()
      .then(() => connection.request().query('SELECT * FROM PoolParty.dbo.PoolToys'))
      .then((results) => {
        expect(results.recordset.length).toEqual(0);
      })
      .then(() => {
        const randomValues = [...new Array(10000)].map(
          () => Math.random().toString(36).substring(7),
        );
        const tvp = new sql.Table();
        tvp.columns.add('PoolToyName', sql.NVarChar);
        randomValues.forEach((value) => {
          tvp.rows.add(value);
        });
        return connection.request()
          .input('poolToys', sql.TVP, tvp)
          .execute('AddPoolToyTVP');
      })
      .then((results) => {
        expect(results.returnValue).toEqual(0);
      })
      .then(() => connection.request().query('SELECT * FROM PoolParty.dbo.PoolToys'))
      .then((results) => {
        expect(results.recordset.length).toEqual(10000);
      }),
  );
});
