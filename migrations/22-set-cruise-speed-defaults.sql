-- Migration: Set default cruise speed knots
-- Purpose: Set helicopters to 90 kt and all other aircraft to 100 kt when not already set

-- Set helicopters to 90 kt if NULL or 0
UPDATE `aircrafts`
SET `cruiseSpeedKnots` = 90
WHERE `type` = 'helicopter'
  AND (`cruiseSpeedKnots` IS NULL OR `cruiseSpeedKnots` = 0);

-- Set non-helicopters to 100 kt if NULL or 0
UPDATE `aircrafts`
SET `cruiseSpeedKnots` = 100
WHERE `type` <> 'helicopter'
  AND (`cruiseSpeedKnots` IS NULL OR `cruiseSpeedKnots` = 0);
