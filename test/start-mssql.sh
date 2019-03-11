#!/bin/sh

if [ ! "$1" = "skip-build" ]; then
  docker build -t mssql-pool-party-test ./test/mssql-setup
fi

if [ ! "$(docker inspect mssql-pool-party-test-1 -f '{{.State.Status}}' 2> /dev/null)"  = 'running' ]; then
  docker run -e ACCEPT_EULA=Y -e SA_PASSWORD=PoolPartyyy9000 -p 1433:1433  --rm --name mssql-pool-party-test-1 -d mssql-pool-party-test 1
fi

if [ ! "$(docker inspect mssql-pool-party-test-2 -f '{{.State.Status}}' 2> /dev/null)" = 'running' ]; then
  docker run -e ACCEPT_EULA=Y -e SA_PASSWORD=PoolPartyyy9000 -p 1434:1433 --rm --name mssql-pool-party-test-2 -d mssql-pool-party-test 2
fi

until docker logs mssql-pool-party-test-1 | grep -m 1 'Import complete.'; do sleep 1; done
until docker logs mssql-pool-party-test-2 | grep -m 1 'Import complete.'; do sleep 1; done

