import execa from 'execa';
import * as sql from '../../src';
import serialWarmupStrategy from '../../src/serial-warmup-strategy';

let connection;

describe('failover tests', () => {
  jest.setTimeout(60000);
  beforeEach(async () => {
    await execa('sh', ['test/start-mssql.sh', 'skip-build']);
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
        port: 1434,
      }],
      retries: 1,
      reconnects: 1,
      warmupStrategy: serialWarmupStrategy,
    });
  });
  afterEach(() => {
    connection.close();
  });
  it('fails over to second DSN if first fails', async () => {
    await connection.warmup();
    const result = await connection.request().query('select * from PartyAnimals');
    expect(result.recordset[0].PartyAnimalName).toBe('Plato');
    await execa('sh', ['test/stop-mssql.sh', '1']);
    const result2 = await connection.request().query('select * from PartyAnimals');
    expect(result2.recordset[0].PartyAnimalName).toBe('Plato2');
  });
  it(`fails over to second DSN if first fails AND the second DSN
      failed during initial warmup but is now available`, async () => {
    await execa('sh', ['test/stop-mssql.sh', '2']);
    await connection.warmup();
    const result = await connection.request().query('select * from PartyAnimals');
    expect(result.recordset[0].PartyAnimalName).toBe('Plato');
    await execa('sh', ['test/start-mssql.sh']);
    await execa('sh', ['test/stop-mssql.sh', '1']);
    const result2 = await connection.request().query('select * from PartyAnimals');
    expect(result2.recordset[0].PartyAnimalName).toBe('Plato2');
  });
});
