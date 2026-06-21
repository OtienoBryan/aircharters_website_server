-- Migration: Add distanceNm column to charter_bookings
-- Purpose: Store great-circle distance in nautical miles for direct charters
-- Safe to run multiple times: checks if column exists before adding

SET @dbname := DATABASE();

SET @stmt = IF(
  EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @dbname 
      AND TABLE_NAME = 'charter_bookings' 
      AND COLUMN_NAME = 'distanceNm'
  ),
  'SELECT "Column distanceNm already exists on charter_bookings" AS info;',
  'ALTER TABLE `charter_bookings` 
     ADD COLUMN `distanceNm` DECIMAL(10,2) NULL AFTER `estimatedFlightHours`;' 
);

PREPARE alter_if_needed FROM @stmt;
EXECUTE alter_if_needed;
DEALLOCATE PREPARE alter_if_needed;
