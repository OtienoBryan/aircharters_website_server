-- Migration 15: Fix Bookings Company Constraints
-- Add missing foreign key constraint and index for company_id column
-- This ensures data integrity and better query performance

USE citlogis_air_charters;

-- Start transaction
START TRANSACTION;

-- Add index for company_id if it doesn't exist
CREATE INDEX IF NOT EXISTS `idx_bookings_company_id` ON `bookings` (`company_id`);

-- Add foreign key constraint for company_id if it doesn't exist
-- First check if the constraint already exists
SET @constraint_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = 'citlogis_air_charters' 
  AND TABLE_NAME = 'bookings' 
  AND CONSTRAINT_NAME = 'fk_bookings_company'
);

-- Only add the constraint if it doesn't exist
SET @sql = IF(@constraint_exists = 0, 
  'ALTER TABLE `bookings` ADD CONSTRAINT `fk_bookings_company` FOREIGN KEY (`company_id`) REFERENCES `charters_companies` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT "Foreign key constraint already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing bookings to populate company_id from charter_deals if not already set
UPDATE `bookings` b 
INNER JOIN `charter_deals` d ON b.dealId = d.id 
SET b.company_id = d.companyId 
WHERE b.company_id = 0 OR b.company_id IS NULL;

-- Verify the changes
SELECT 'Migration 15 completed: Fixed bookings company constraints' AS status;

-- Show the current table structure
DESCRIBE bookings;

-- Show sample data to verify company_id is populated
SELECT 
  b.id as booking_id,
  b.dealId,
  b.company_id,
  d.companyId as deal_company_id,
  c.companyName
FROM bookings b
INNER JOIN charter_deals d ON b.dealId = d.id
INNER JOIN charters_companies c ON b.company_id = c.id
LIMIT 5;

COMMIT; 