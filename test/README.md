# Integration Tests

The tests in this directory require a specially configured mssql instance accessible on `localhost:1433`. A helpful Dockerfile has been included in the project that will accomplish this, along with a script to make sure the image is built and the container is running before the tests start. If you don't have Docker for Windows/Mac installed, you won't be able to run these tests.

## Running integration tests

```sh
npm run test:docker
npm run test:integration
```

## Gotchas

- Make sure you meet the [requirements](https://hub.docker.com/r/microsoft/mssql-server-linux/) mentioned for the mssql-server-linux Docker image.
