#!/bin/bash

/opt/mssql/bin/sqlservr & /usr/src/app/import-data.sh

# need a better way to keep the container running after bg'ing sqlserver.sh
tail -f /dev/null