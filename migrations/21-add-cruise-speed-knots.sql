-- Migration: Add cruiseSpeedKnots column to aircrafts table
-- Purpose: Store aircraft cruise speed in knots for nautical mile duration calculations
-- Safe to run multiple times: checks if column exists before adding

SET @dbname := DATABASE();

-- Only add the column if it does not already exist
SET @stmt = IF(
  EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @dbname 
      AND TABLE_NAME = 'aircrafts' 
      AND COLUMN_NAME = 'cruiseSpeedKnots'
  ),
  'SELECT "Column cruiseSpeedKnots already exists on aircrafts" AS info;',
  'ALTER TABLE `aircrafts` 
     ADD COLUMN `cruiseSpeedKnots` INT NULL AFTER `pricePerHour`;' 
);

PREPARE alter_if_needed FROM @stmt;
EXECUTE alter_if_needed;
DEALLOCATE PREPARE alter_if_needed;

-- Optional: seed some reasonable defaults for helicopters (commented out)
-- UPDATE aircrafts SET cruiseSpeedKnots = 120 WHERE type = 'helicopter' AND (cruiseSpeedKnots IS NULL OR cruiseSpeedKnots = 0);
