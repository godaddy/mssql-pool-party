import execa from 'execa';
import * as sql from '../../src';
import serialWarmupStrategy from '../../src/serial-warmup-strategy';
import delay from '../delay';

let connection;

describe('failover tests', () => {
  jest.setTimeout(60000);
  beforeEach(async () => {
    await execa('sh', ['test/start-mssql.sh', 'skip-build']);
    connection = new sql.ConnectionPoolParty({
      dsns: [{
        id: 'pool1',
        user: 'sa',
        password: 'PoolPartyyy9000',
        server: 'localhost',
        database: 'PoolParty',
        priority: 0,
      }, {
        id: 'pool2',
        user: 'sa',
        password: 'PoolPartyyy9000',
        server: 'localhost',
        database: 'PoolParty',
        port: 1434,
        priority: 1,
      }],
      prioritizeInterval: 5000,
      prioritizePools: true,
      retries: 1,
      reconnects: 1,
      warmupStrategy: serialWarmupStrategy,
    });
  });
  afterEach(() => {
    connection.close();
  });
  it(`promotes the lower priority DSN to primary if high priority pool
    fails and then repromotes the higher priority pool once it is healthy again`, async () => {
    await connection.warmup();
    const result = await connection.request().query('select * from PartyAnimals');
    expect(result.recordset[0].PartyAnimalName).toBe('Plato');
    expect(connection.stats().pools[0].config.id).toBe('pool1');
    await execa('sh', ['test/stop-mssql.sh', '1']);
    const result2 = await connection.request().query('select * from PartyAnimals');
    expect(result2.recordset[0].PartyAnimalName).toBe('Plato2');
    expect(connection.stats().pools[0].config.id).toBe('pool2');
    await execa('sh', ['test/start-mssql.sh', 'skip-build']);
    await delay(6000)(); // need to make sure the prioritize loop has elapsed
    const result3 = await connection.request().query('select * from PartyAnimals');
    expect(result3.recordset[0].PartyAnimalName).toBe('Plato');
    expect(connection.stats().pools[0].config.id).toBe('pool1');
  });
});
