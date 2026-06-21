-- Migration 03: Enhance Bookings Table
-- Add loyalty points and wallet integration fields

USE citlogis_air_charters;

-- Add loyalty and wallet fields to bookings table
ALTER TABLE `bookings` 
ADD COLUMN `loyalty_points_earned` int(11) DEFAULT 0 AFTER `paymentTransactionId`,
ADD COLUMN `loyalty_points_redeemed` int(11) DEFAULT 0 AFTER `loyalty_points_earned`,
ADD COLUMN `wallet_amount_used` decimal(10,2) DEFAULT 0.00 AFTER `loyalty_points_redeemed`;

-- Add indexes for loyalty queries
CREATE INDEX `idx_bookings_loyalty_earned` ON `bookings` (`loyalty_points_earned`);
CREATE INDEX `idx_bookings_loyalty_redeemed` ON `bookings` (`loyalty_points_redeemed`);

-- Verify the changes
DESCRIBE bookings;

SELECT 'Migration 03 completed: Bookings table enhanced with loyalty and wallet fields' AS status; 