# mssql-pool-party

ES6+ extension of [mssql](https://github.com/patriksimek/node-mssql) that provides:

- Failover between multiple connection pools
- A mechanism to load DSNs ([Data Source Names](https://en.wikipedia.org/wiki/Data_source_name), think connection strings) asynchronously and recreate connection pools accordingly
- Various retry options for requests, transactions, and prepared statements
- Health and statistics of connection pools
- Only minor changes to the existing mssql API

Jump on in, the water's fine.

### Why does this package exist?

- Disaster recovery option when you're not using Availability Groups (e.g. Database Mirroring)
- If you store/manage database credentials using an external service, the `dsnProvider` option lets you automatically grab those changes and recreate connection pools.
- Stats/health reporting, so you can see what databases your app is talking to and whether or not the connections are healthy.
- Built in retry/reconnect options

### Usage

#### Simple single connection pool

```js
// my-db.js
import sql from 'mssql-pool-party';

const config = {
  // See configuration section below for more information
  dsn: {
    user: ...
    password: ...
    server: ...
    database: ...
  },
  connectionPoolConfig: {
    options: {
      encrypt: true,
    }
  }
};

const connection = new sql.ConnectionPoolParty(config);

connection.on('error', console.error);

export default connection;
```

```js
// call-proc.js
import sql from 'mssql-pool-party';
import myDb from './my-db';

export default function callProc() {
  return myDb.request()
    .input('some_param', sql.Int, 10)
    .execute('my_proc')
    .then(console.dir)
    .catch(console.error);
}
```

#### Using a DsnProvider to retrieve one or more dsn(s) dynamically

```js
// my-db.js
import sql from 'mssql-pool-party';
import jsonFileDsnProvider from 'my-example-dsn-provider';

// grab DSN(s) from a json file
const dsnProvider = jsonFileDsnProvider('/etc/secrets/my_db.json');

const config = {
  dsnProvider,
  connectionPoolConfig: {
    connectTimeout: 5000,
    requestTimeout: 30000,
    options: {
      appName: 'mssql-pool-party-example',
      encrypt: true,
    },
  },
  retries: 2,
  reconnects: 1,
};

const connection = new sql.ConnectionPoolParty(config);

// this attempts to connect each ConnectionPool before any requests are made.
// returns a promise, so you can use it during an API's warmup phase before
// starting any listeners
connection.warmup();

connection.on('error', console.error);

// logging connection pool stats to console every 60 seconds
setInterval(() => console.log(connection.stats()), 60000);

export default connection;
```

```js
// run-query.js
import sql from 'mssql-pool-party';
import myDb from './my-db';

export default function runQuery(id) {
  return myDb.request()
    .input('some_param', sql.Int, id)
    .query('select * from mytable where id = @some_param')
    .then(console.dir)
    .catch(console.error);
}
```

### Configuration

Check out the [detailed API documentation](API.md#new-connectionpoolpartyconfig).

You'll also want to familiarize yourself with [`node-mssql`'s documentation](https://github.com/tediousjs/node-mssql/blob/master/README.md#documentation), as much of it applies to mssql-pool-party.

### Events

- `error` - This event is fired whenever errors are encountered that DO NOT result in a rejected promise, stream error, or callback error that can be accessed/caught by the consuming app, which makes this event the only way to respond to such errors. Example: An app initiates a query, the first attempt fails, but a retry is triggered and the second attempt succeeds. From the apps perspective, the retry attempt isn't visible and their promised query is resolved. However, apps may want to know when a query requires a retry to succeed, so we emit the error using this event. **TAKE NOTE**: Unlike the mssql package, failing to subscribe to the error event will not result in an unhandled exception and subsequent process crash.

### Streaming

The mssql package's streaming API is supported in mssql-pool-party, with a substantial caveat. By their nature, streams attempt to minimize the amount of memory in use by "streaming" chunks of the data from one source to another. Their behavior makes them not play well with retry/reconnect logic, because the stream destination would need to understand when a retry/reconnect happens and abandon any previously received data in preparation for data coming from another attempt. Otherwise, you're going to end up just caching all the chunks in memory, negating the benefits of using a stream. Observe:

```js
import myDb from './my-db';

const request = myDb.request();
request.stream = true;
let currentAttempt = 0;
let rows;
let errors;
const resetDataIfNeeded = (attemptNumber) => {
  if (attemptNumber > currentAttempt) {
    rows = [];
    errors = [];
    currentAttempt += 1;
  }
};
request.query('select * from SomeHugeTable');
request.on('error', (err, attemptNumber) => {
  resetDataIfNeeded(attemptNumber);
  errors.push(err);
});
request.on('rows', (row, attemptNumber) => {
  resetDataIfNeeded(attemptNumber);
  rows.push(row);
});
// NOTE: done is only called after the final attempt
request.on('done', (result, attemptNumber) => {
  if (errors.length) {
    errors.forEach(console.log);
    throw new Error('Unhandled errors.  Handle them!');
  }
  console.log(rows);
});
```

In this example, we are storing errors/rows in memory. If we notice that the attemptNumber increments, we throw away our cached data and start over. Once the done event fires, we check to see if there are any errors and if not, return the results. This is a poor use of streams, because we are caching the entire result set in memory. To use streams properly, we would need to take the data provided by the `rows` event and shuttle it off somewhere else. The problem is that where we are shuttling it off to needs something similar to the `resetDataIfNeeded` function in the example above.

One thing to note is mssql-pool-party does allow you to use the vanilla streaming API and avoid the concerns of juggling the attempt number, but you'll need to set `retries` and `reconnects` to 0.

### A quick note on caching

When a ConnectionPoolParty is instantiated, it will internally cache one or more instance(s) of mssql.Connection. You should only create one instance of ConnectionPoolParty per set of DSNs and cache it for use in other modules (as seen in the examples above).
