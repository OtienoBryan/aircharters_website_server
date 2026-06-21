-- Migration 14: Add Company ID to Bookings Table
-- Add companyId column to bookings table for direct company access
-- This allows direct access to company information without going through the deal relationship

USE citlogis_air_charters;

-- Start transaction
START TRANSACTION;

-- Add companyId column to bookings table
ALTER TABLE `bookings` 
ADD COLUMN `companyId` int(11) NOT NULL AFTER `dealId`;

-- Create index for better performance on company queries
CREATE INDEX `idx_bookings_company_id` ON `bookings` (`companyId`);

-- Create foreign key constraint to ensure data integrity
ALTER TABLE `bookings` 
ADD CONSTRAINT `fk_bookings_company` 
FOREIGN KEY (`companyId`) REFERENCES `charters_companies` (`id`) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update existing bookings to populate companyId from charter_deals
UPDATE `bookings` b 
INNER JOIN `charter_deals` d ON b.dealId = d.id 
SET b.companyId = d.companyId 
WHERE b.companyId = 0 OR b.companyId IS NULL;

-- Verify the changes
SELECT 'Migration 14 completed: Added companyId to bookings table' AS status;

-- Show sample data to verify
SELECT 
  b.id as booking_id,
  b.dealId,
  b.companyId,
  d.companyId as deal_company_id,
  c.companyName
FROM bookings b
INNER JOIN charter_deals d ON b.dealId = d.id
INNER JOIN charters_companies c ON b.companyId = c.id
LIMIT 5;

COMMIT; 