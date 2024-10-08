#!/bin/bash

#wait for the SQL Server to come up
# may need to increase this if you have a slower system
sleep 20s

#run the setup script to create the DB and the schema in the DB
echo Running setup command
/opt/mssql-tools18/bin/sqlcmd \
  -S localhost \
  -U sa \
  -P PoolPartyyy9000 \
  -d master \
  -C \
  -N o \
  -i setup.sql

#import the data from the csv file
echo Importing data
/opt/mssql-tools18/bin/bcp \
  PoolParty.dbo.PartyAnimals in "/usr/src/app/party-animals-${1}.csv" \
  -c \
  -t ',' \
  -S localhost \
  -U sa \
  -P PoolPartyyy9000 \
  -u \
  -Yo
