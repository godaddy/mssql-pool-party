#!/bin/sh

docker build -t mssql-pool-party-test ./test/mssql-setup
docker run -e ACCEPT_EULA=Y -e SA_PASSWORD=PoolPartyyy9000 -p 1433:1433 -d mssql-pool-party-test
