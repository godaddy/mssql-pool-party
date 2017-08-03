#!/bin/bash

#wait for the SQL Server to come up
# may need to increase this if you have a slower system
sleep 20s

#run the setup script to create the DB and the schema in the DB
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P PoolPartyyy9000 -d master -i setup.sql

#import the data from the csv file
/opt/mssql-tools/bin/bcp PoolParty.dbo.PartyAnimals in "/usr/src/app/party-animals.csv" -c -t',' -S localhost -U sa -P PoolPartyyy9000
