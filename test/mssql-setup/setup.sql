CREATE DATABASE PoolParty;
GO
USE PoolParty;
GO
CREATE TABLE PartyAnimals (
  ID int primary key IDENTITY(1,1) NOT NULL,
  PartyAnimalName nvarchar(max)
);
GO
CREATE PROCEDURE GetPartyAnimalByID
  @ID int
AS
  SET NOCOUNT ON;
  SELECT *
  FROM PartyAnimals
  WHERE ID = @ID
GO
CREATE TABLE PoolToys (
  ID int primary key IDENTITY(1,1) NOT NULL,
  PoolToyName nvarchar(max)
);
GO
CREATE TYPE PoolToysTableType AS TABLE (
  PoolToyName nvarchar(max)
);
GO
CREATE PROCEDURE GetPoolToys
AS
  SET NOCOUNT ON;
  SELECT *
  FROM PoolToys
GO
CREATE PROCEDURE AddPoolToy
  @PoolToyName nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO PoolToys (PoolToyName)
  VALUES (@PoolToyName)
END
GO
CREATE PROCEDURE AddPoolToyTVP (
  @poolToys PoolToysTableType READONLY
)
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO PoolToys (PoolToyName)
  SELECT pt.PoolToyName FROM @poolToys AS pt;
END
GO
