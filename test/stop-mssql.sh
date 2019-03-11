#!/bin/sh

if [ ! "$1" = "" ]; then
  docker stop mssql-pool-party-test-${1}
else
  docker stop mssql-pool-party-test-1
  docker stop mssql-pool-party-test-2
fi
