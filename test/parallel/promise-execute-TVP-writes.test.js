import * as sql from '../../src';
import delay from '../delay';

jest.setTimeout(60_000);

let connection;

describe('execute TVP write using promise interface', () => {
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
      connectionPoolOptions: {
        options: {
          trustServerCertificate: true,
          encrypt: false,
        },
      },
    });
  });
  afterEach(() => connection.request()
    .query('TRUNCATE TABLE PoolParty.dbo.PoolToys2;')
    .then(() => connection.close()));
  it('execute proc with TVP containing 10000 rows',
    () => connection.warmup()
      .then(() => connection.request().query('SELECT * FROM PoolParty.dbo.PoolToys2'))
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
          .execute('AddPoolToyTVP2');
      })
      .then((results) => {
        expect(results.returnValue).toEqual(0);
      })
      .then(delay(5000)) // allow all writes to be flushed from the buffer.
      .then(() => connection.request().query('SELECT * FROM PoolParty.dbo.PoolToys2'))
      .then((results) => {
        expect(results.recordset.length).toEqual(10000);
      }));
});
