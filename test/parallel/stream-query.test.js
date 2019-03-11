import * as sql from '../../src';

const queryResults = {
  columns: {
    ID: {
      index: 0,
      name: 'ID',
      nullable: false,
      caseSensitive: false,
      identity: true,
      readOnly: true,
      type: expect.any(Function),
    },
    PartyAnimalName: {
      index: 1,
      name: 'PartyAnimalName',
      length: 65535,
      nullable: true,
      caseSensitive: false,
      identity: false,
      readOnly: false,
      type: expect.any(Function),
    },
  },
  output: {},
  rows: [
    { ID: 1, PartyAnimalName: 'Plato' },
    { ID: 2, PartyAnimalName: 'Socrates' },
    { ID: 3, PartyAnimalName: 'Anaximander' },
    { ID: 4, PartyAnimalName: 'Anaximenes' },
    { ID: 5, PartyAnimalName: 'Speusippus' },
    { ID: 6, PartyAnimalName: 'Diogenes' },
    { ID: 7, PartyAnimalName: 'Lycophron' },
  ],
  rowsAffected: [7],
};

let connection;

describe('query tests using stream interface', () => {
  beforeEach(() => {
    connection = new sql.ConnectionPoolParty({
      dsn: {
        user: 'sa',
        password: 'PoolPartyyy9000',
        server: 'localhost',
        database: 'PoolParty',
      },
      connectionPoolConfig: {
        stream: true,
      },
      retries: 1,
      reconnects: 1,
    });
  });
  afterEach(() => connection.close());
  it('returns expected results with explicit warmup', (done) => {
    let attempt = 0;
    let results;
    let errors;
    const setResults = (attemptNumber) => {
      attempt = attemptNumber;
      errors = [];
      results = { rows: [] };
    };
    connection.warmup()
      .then(() => {
        expect(connection.pools[0].connection.connected).toEqual(true);
        const request = connection.request();
        request.query('select * from PartyAnimals');
        request.on('recordset', (columns, attemptNumber) => {
          if (attemptNumber > attempt) {
            setResults(attemptNumber);
          }
          results.columns = columns;
        });
        request.on('row', (row, attemptNumber) => {
          if (attemptNumber > attempt) {
            setResults(attemptNumber);
          }
          results.rows.push(row);
        });
        request.on('error', (err, attemptNumber) => {
          if (attemptNumber > attempt) {
            setResults(attemptNumber);
          }
          errors.push(err);
        });
        request.on('done', (result, attemptNumber) => {
          Object.assign(results, result);
          expect(attemptNumber).toBe(1);
          expect(errors.length).toBe(0);
          expect(results).toEqual(queryResults);
          done();
        });
      });
  });
  it('returns expected results with implicit warmup', (done) => {
    expect(connection.pools.length).toEqual(0);
    let attempt = 0;
    let results;
    let errors;
    const setResults = (attemptNumber) => {
      attempt = attemptNumber;
      errors = [];
      results = { rows: [] };
    };
    const request = connection.request();
    request.query('select * from PartyAnimals');
    request.on('recordset', (columns, attemptNumber) => {
      if (attemptNumber > attempt) {
        setResults(attemptNumber);
      }
      results.columns = columns;
    });
    request.on('row', (row, attemptNumber) => {
      if (attemptNumber > attempt) {
        setResults(attemptNumber);
      }
      results.rows.push(row);
    });
    request.on('error', (err, attemptNumber) => {
      if (attemptNumber > attempt) {
        setResults(attemptNumber);
      }
      errors.push(err);
    });
    request.on('done', (result, attemptNumber) => {
      Object.assign(results, result);
      expect(attemptNumber).toBe(1);
      expect(errors.length).toBe(0);
      expect(results).toEqual(queryResults);
      done();
    });
  });
  it('ends up with expected results after done event is emitted after a reconnect', (done) => {
    let attempt = 0;
    let results;
    let errors;
    const setResults = (attemptNumber) => {
      attempt = attemptNumber;
      errors = [];
      results = { rows: [] };
    };
    connection.warmup()
      .then(() => {
        expect(connection.pools[0].connection.connected).toEqual(true);
        // manually closing a connection to simulate failure
        return connection.pools[0].connection.close();
      })
      .then(() => {
        // verify connection has been manually closed
        expect(connection.pools[0].connection.connected).toEqual(false);
        const request = connection.request();
        request.query('select * from PartyAnimals');
        request.on('recordset', (columns, attemptNumber) => {
          if (attemptNumber > attempt) {
            setResults(attemptNumber);
          }
          results.columns = columns;
        });
        request.on('row', (row, attemptNumber) => {
          if (attemptNumber > attempt) {
            setResults(attemptNumber);
          }
          results.rows.push(row);
        });
        request.on('error', (err, attemptNumber) => {
          if (attemptNumber > attempt) {
            setResults(attemptNumber);
          }
          errors.push(err);
        });
        request.on('done', (result, attemptNumber) => {
          Object.assign(results, result);
          expect(attemptNumber).toBe(3);
          expect(errors.length).toBe(0);
          expect(results).toEqual(queryResults);
          done();
        });
      });
  });
  it('ends up with expected error after done event for an unhealthy connection and 0 reconnects', (done) => {
    let attempt = 0;
    let results;
    let errors;
    const setResults = (attemptNumber) => {
      attempt = attemptNumber;
      errors = [];
      results = { rows: [] };
    };
    connection.close();
    connection = new sql.ConnectionPoolParty({
      dsn: {
        user: 'sa',
        password: 'PoolPartyyy9000',
        server: 'localhost',
        database: 'PoolParty',
      },
      connectionPoolConfig: {
        stream: true,
      },
      retries: 1,
      reconnects: 0,
    });
    connection.warmup()
      .then(() => {
        expect(connection.pools[0].connection.connected).toEqual(true);
        // manually closing a connection to simulate failure
        return connection.pools[0].connection.close();
      })
      .then(() => {
        // verify connection has been manually closed
        expect(connection.pools[0].connection.connected).toEqual(false);
        const request = connection.request({ reconnects: 0 });
        request.query('select * from PartyAnimals');
        request.on('recordset', (columns, attemptNumber) => {
          if (attemptNumber > attempt) {
            setResults(attemptNumber);
          }
          results.columns = columns;
        });
        request.on('row', (row, attemptNumber) => {
          if (attemptNumber > attempt) {
            setResults(attemptNumber);
          }
          results.rows.push(row);
        });
        request.on('error', (err, attemptNumber) => {
          if (attemptNumber > attempt) {
            setResults(attemptNumber);
          }
          errors.push(err);
        });
        request.on('done', (result, attemptNumber) => {
          Object.assign(results, result);
          expect(attemptNumber).toBe(2);
          expect(errors.length).toBe(1);
          done();
        });
      });
  });
});
