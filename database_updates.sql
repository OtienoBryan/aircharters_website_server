-- =====================================================
-- PAYSTACK INTEGRATION DATABASE UPDATES
-- =====================================================
-- These updates add Paystack support to existing tables
-- without breaking existing functionality

-- 1. Add Paystack to company_payment_accounts paymentProvider enum
ALTER TABLE `company_payment_accounts` 
MODIFY COLUMN `paymentProvider` enum('stripe','mpesa','paystack') NOT NULL;

-- 2. Add Paystack to payments paymentMethod enum  
ALTER TABLE `payments` 
MODIFY COLUMN `paymentMethod` enum('card','mpesa','wallet','paystack') NOT NULL;

-- 3. Add Paystack to bookings paymentMethod enum
ALTER TABLE `bookings` 
MODIFY COLUMN `paymentMethod` enum('card','mpesa','wallet','paystack') DEFAULT NULL;

-- 4. Add Paystack to charter_bookings paymentMethod enum (if exists)
-- Note: Check if this column exists first
-- ALTER TABLE `charter_bookings` 
-- MODIFY COLUMN `paymentMethod` enum('card','mpesa','wallet','paystack') DEFAULT NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the updates worked correctly

-- Check company_payment_accounts enum values
SHOW COLUMNS FROM `company_payment_accounts` LIKE 'paymentProvider';

-- Check payments enum values  
SHOW COLUMNS FROM `payments` LIKE 'paymentMethod';

-- Check bookings enum values
SHOW COLUMNS FROM `bookings` LIKE 'paymentMethod';

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Example: Create a Paystack payment account for a vendor
-- INSERT INTO `company_payment_accounts` (
--   `companyId`,
--   `paymentProvider`, 
--   `accountType`,
--   `accountId`,
--   `accountStatus`,
--   `verificationStatus`,
--   `country`,
--   `currency`,
--   `metadata`,
--   `isActive`
-- ) VALUES (
--   5, -- Aib Aviation company ID
--   'paystack',
--   'standard',
--   'ACCT_paystack_subaccount_123',
--   'active',
--   'verified',
--   'KE',
--   'KES',
--   '{"paystackSubaccountId": "ACCT_paystack_subaccount_123", "paystackSubaccountCode": "ACCT_abc123", "splitCode": "SPLIT_xyz789", "provider": "paystack"}',
--   1
-- );

-- Example: Create a Paystack payment record
-- INSERT INTO `payments` (
--   `id`,
--   `bookingId`,
--   `userId`,
--   `company_id`,
--   `paymentMethod`,
--   `totalAmount`,
--   `platformFee`,
--   `companyAmount`,
--   `currency`,
--   `transactionId`,
--   `paymentStatus`,
--   `paymentGatewayResponse`
-- ) VALUES (
--   'payment_paystack_123',
--   'BK-123',
--   'user_123',
--   5, -- Aib Aviation company ID
--   'paystack',
--   100.00,
--   12.00, -- 12% commission
--   88.00, -- Vendor gets 88%
--   'KES',
--   'paystack_txn_456',
--   'pending',
--   '{"paystackReference": "paystack_txn_456", "subaccount": "ACCT_paystack_subaccount_123", "split": {"platform": 12.00, "vendor": 88.00}}'
-- );

-- =====================================================
-- ROLLBACK QUERIES (if needed)
-- =====================================================
-- Use these to rollback the changes if issues arise

-- Rollback company_payment_accounts
-- ALTER TABLE `company_payment_accounts` 
-- MODIFY COLUMN `paymentProvider` enum('stripe','mpesa') NOT NULL;

-- Rollback payments
-- ALTER TABLE `payments` 
-- MODIFY COLUMN `paymentMethod` enum('card','mpesa','wallet') NOT NULL;

-- Rollback bookings
-- ALTER TABLE `bookings` 
-- MODIFY COLUMN `paymentMethod` enum('card','mpesa','wallet') DEFAULT NULL;
