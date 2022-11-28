import * as sql from '../../src';
import delay from '../delay';

let connection;

jest.setTimeout(60_000);

describe('execute many writes tests using promise interface', () => {
  beforeEach(() => {
    connection = new sql.ConnectionPoolParty({
      dsn: {
        user: 'sa',
        password: 'PoolPartyyy9000',
        server: 'localhost',
        database: 'PoolParty',
        trustServerCertificate: true,
      },
      retries: 1,
      reconnects: 1,
      connectionPoolOptions: {
        options: {
          trustServerCertificate: true,
        },
      },
    });
  });

  afterEach(() => connection.request()
    .query('TRUNCATE TABLE PoolParty.dbo.PoolToys;')
    .then(() => connection.close()));

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
            (name) => connection.request()
              .input('PoolToyName', sql.NVarChar, name)
              .execute('AddPoolToy'),
          ),
        );
      })
      .then((results) => {
        expect(results.every((result) => result.returnValue === 0)).toEqual(true);
      })
      .then(delay(5000)) // allow all writes to be flushed from the buffer.
      .then(() => connection.request().query('SELECT * FROM PoolParty.dbo.PoolToys'))
      .then((results) => {
        expect(results.recordset.length).toEqual(10000);
      }));
});
