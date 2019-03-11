#!/bin/bash

echo "Starting database with priority ${1}"

/opt/mssql/bin/sqlservr &
/usr/src/app/import-data.sh $@

echo "Import complete."

# need a better way to keep the container running after bg'ing sqlserver.sh
exec /usr/bin/tail -f /dev/null
