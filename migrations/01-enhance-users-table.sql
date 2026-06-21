-- Migration 01: Enhance Users Table
-- Add loyalty points, wallet balance, and enhanced profile fields

USE citlogis_air_charters;

-- Add new columns to users table
ALTER TABLE `users` 
ADD COLUMN `date_of_birth` date NULL AFTER `country_code`,
ADD COLUMN `nationality` varchar(100) NULL AFTER `date_of_birth`,
ADD COLUMN `language` varchar(50) DEFAULT 'en' AFTER `nationality`,
ADD COLUMN `currency` varchar(20) DEFAULT 'USD' AFTER `language`,
ADD COLUMN `timezone` varchar(50) DEFAULT 'UTC' AFTER `currency`,
ADD COLUMN `theme` enum('light','dark','auto') DEFAULT 'auto' AFTER `timezone`,
ADD COLUMN `loyalty_tier` enum('bronze','silver','gold','platinum') DEFAULT 'bronze' AFTER `loyalty_points`;

-- Add indexes for better performance
CREATE INDEX `idx_users_loyalty_tier` ON `users` (`loyalty_tier`);
CREATE INDEX `idx_users_loyalty_points` ON `users` (`loyalty_points`);

-- Verify the changes
DESCRIBE users;

SELECT 'Migration 01 completed: Users table enhanced with loyalty and profile fields' AS status; 