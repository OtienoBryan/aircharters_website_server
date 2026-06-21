-- Migration: Add coordinates to locations table
-- Date: 2025-01-17
-- Description: Add latitude and longitude columns to locations table
--              Update existing locations with real coordinates for distance calculations

-- Add new columns to locations table
ALTER TABLE `locations` 
ADD COLUMN `latitude` DECIMAL(10,8) DEFAULT NULL AFTER `type`,
ADD COLUMN `longitude` DECIMAL(11,8) DEFAULT NULL AFTER `latitude`;

-- Update existing locations with real coordinates
-- Nairobi (Jomo Kenyatta International Airport)
UPDATE `locations` SET 
  `latitude` = -1.3192,
  `longitude` = 36.9278
WHERE `code` = 'NBO';

-- Kisumu (Kisumu International Airport)
UPDATE `locations` SET 
  `latitude` = -0.1022,
  `longitude` = 34.7281
WHERE `code` = 'KIS';

-- Mombasa (Moi International Airport)
UPDATE `locations` SET 
  `latitude` = -4.0348,
  `longitude` = 39.5945
WHERE `code` = 'MBA';

-- Kilifi (Kilifi Airport)
UPDATE `locations` SET 
  `latitude` = -3.5107,
  `longitude` = 39.9093
WHERE `code` = 'KLF';

-- Add more Kenyan airports and cities
INSERT INTO `locations` (`name`, `code`, `country`, `type`, `latitude`, `longitude`, `createdAt`, `updatedAt`) VALUES
-- Major Airports
('Wilson Airport', 'WIL', 'Kenya', 'airport', -1.3217, 36.8147, NOW(), NOW()),
('Eldoret International Airport', 'EDL', 'Kenya', 'airport', 0.4044, 35.2389, NOW(), NOW()),
('Malindi Airport', 'MYD', 'Kenya', 'airport', -3.2293, 40.1017, NOW(), NOW()),
('Lamu Airport', 'LAU', 'Kenya', 'airport', -2.2524, 40.9131, NOW(), NOW()),
('Nakuru Airport', 'NUU', 'Kenya', 'airport', -0.2981, 36.1594, NOW(), NOW()),
('Kakamega Airport', 'GGM', 'Kenya', 'airport', 0.2713, 34.7873, NOW(), NOW()),

-- Major Cities
('Nairobi City', 'NBO_CITY', 'Kenya', 'city', -1.2921, 36.8219, NOW(), NOW()),
('Mombasa City', 'MBA_CITY', 'Kenya', 'city', -4.0435, 39.6682, NOW(), NOW()),
('Kisumu City', 'KIS_CITY', 'Kenya', 'city', -0.0917, 34.7680, NOW(), NOW()),
('Nakuru City', 'NUU_CITY', 'Kenya', 'city', -0.3031, 36.0800, NOW(), NOW()),
('Eldoret City', 'EDL_CITY', 'Kenya', 'city', 0.5204, 35.2699, NOW(), NOW()),
('Thika City', 'THK_CITY', 'Kenya', 'city', -1.0333, 37.0833, NOW(), NOW()),
('Nyeri City', 'NYR_CITY', 'Kenya', 'city', -0.4201, 36.9476, NOW(), NOW()),
('Machakos City', 'MCK_CITY', 'Kenya', 'city', -1.5167, 37.2667, NOW(), NOW()),

-- Popular Tourist Destinations
('Diani Beach', 'DIA', 'Kenya', 'region', -4.3000, 39.5833, NOW(), NOW()),
('Watamu Beach', 'WAT', 'Kenya', 'region', -3.3667, 40.0167, NOW(), NOW()),
('Lamu Island', 'LAM', 'Kenya', 'region', -2.2719, 40.9022, NOW(), NOW()),
('Amboseli National Park', 'AMB', 'Kenya', 'region', -2.6500, 37.2500, NOW(), NOW()),
('Masai Mara', 'MAA', 'Kenya', 'region', -1.5000, 35.0000, NOW(), NOW()),
('Tsavo East National Park', 'TSE', 'Kenya', 'region', -2.7833, 38.7500, NOW(), NOW()),
('Tsavo West National Park', 'TSW', 'Kenya', 'region', -2.9167, 38.2500, NOW(), NOW()),
('Samburu National Reserve', 'SAM', 'Kenya', 'region', 0.5000, 37.5000, NOW(), NOW());

-- Add indexes for better performance
CREATE INDEX `idx_locations_type` ON `locations` (`type`);
CREATE INDEX `idx_locations_country` ON `locations` (`country`);
CREATE INDEX `idx_locations_coordinates` ON `locations` (`latitude`, `longitude`);
CREATE INDEX `idx_locations_search` ON `locations` (`name`, `code`, `country`); 