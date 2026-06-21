-- Migration 10: Optimize Wallet System - Single Table for All Transactions
-- Replace separate loyalty_transactions and wallet_transactions with unified wallet_transactions
-- This creates a single wallet that handles both loyalty points and monetary transactions

USE citlogis_air_charters;

-- Start transaction
START TRANSACTION;

-- Step 1: Create the new unified wallet_transactions table
CREATE TABLE `wallet_transactions_new` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `booking_id` varchar(255) DEFAULT NULL,
  
  -- Transaction Type and Amount
  `transaction_type` enum('deposit','withdrawal','payment','refund','bonus','fee','loyalty_earned','loyalty_redeemed','loyalty_expired','loyalty_adjustment') NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `points_amount` int(11) NOT NULL DEFAULT 0,
  `currency` varchar(3) DEFAULT 'USD',
  
  -- Transaction Details
  `description` varchar(255) NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  
  -- Balance Tracking (both monetary and points)
  `balance_before` decimal(10,2) NOT NULL DEFAULT 0.00,
  `balance_after` decimal(10,2) NOT NULL DEFAULT 0.00,
  `points_before` int(11) NOT NULL DEFAULT 0,
  `points_after` int(11) NOT NULL DEFAULT 0,
  
  -- Payment Method (for monetary transactions)
  `payment_method` enum('card','mpesa','wallet','loyalty_points') DEFAULT NULL,
  `payment_reference` varchar(255) DEFAULT NULL,
  
  -- Status
  `status` enum('pending','completed','failed','cancelled') DEFAULT 'pending',
  
  -- Metadata and Expiration
  `metadata` JSON DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  
  -- Timestamps
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL,
  
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_wallet_transactions_new_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wallet_transactions_new_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Step 2: Add indexes for better performance
CREATE INDEX `idx_wallet_new_user_type` ON `wallet_transactions_new` (`user_id`, `transaction_type`);
CREATE INDEX `idx_wallet_new_status` ON `wallet_transactions_new` (`status`);
CREATE INDEX `idx_wallet_new_created` ON `wallet_transactions_new` (`created_at`);
CREATE INDEX `idx_wallet_new_booking` ON `wallet_transactions_new` (`booking_id`);
CREATE INDEX `idx_wallet_new_payment_method` ON `wallet_transactions_new` (`payment_method`);
CREATE INDEX `idx_wallet_new_expires` ON `wallet_transactions_new` (`expires_at`);
CREATE INDEX `idx_wallet_new_loyalty` ON `wallet_transactions_new` (`transaction_type`) WHERE `transaction_type` LIKE 'loyalty_%';

-- Step 3: Migrate existing loyalty transactions data
INSERT INTO `wallet_transactions_new` (
  `id`, `user_id`, `booking_id`, `transaction_type`, 
  `points_amount`, `description`, `reference`, 
  `points_before`, `points_after`, `status`, 
  `metadata`, `expires_at`, `created_at`
)
SELECT 
  `id`, `user_id`, `booking_id`, 
  CASE 
    WHEN `transaction_type` = 'earned' THEN 'loyalty_earned'
    WHEN `transaction_type` = 'redeemed' THEN 'loyalty_redeemed'
    WHEN `transaction_type` = 'expired' THEN 'loyalty_expired'
    WHEN `transaction_type` = 'bonus' THEN 'loyalty_earned'
    WHEN `transaction_type` = 'adjustment' THEN 'loyalty_adjustment'
    ELSE 'loyalty_earned'
  END as `transaction_type`,
  `points_amount`, `description`, `reference`,
  `points_before`, `points_after`, 'completed',
  `metadata`, `expires_at`, `created_at`
FROM `loyalty_transactions`
WHERE EXISTS (SELECT 1 FROM `users` WHERE `users`.`id` = `loyalty_transactions`.`user_id`);

-- Step 4: Migrate existing wallet transactions data
INSERT INTO `wallet_transactions_new` (
  `id`, `user_id`, `booking_id`, `transaction_type`, 
  `amount`, `currency`, `description`, `reference`,
  `balance_before`, `balance_after`, `payment_method`, 
  `payment_reference`, `status`, `metadata`, `created_at`, `completed_at`
)
SELECT 
  `id`, `user_id`, `booking_id`, `transaction_type`,
  `amount`, `currency`, `description`, `reference`,
  `balance_before`, `balance_after`, `payment_method`,
  `payment_reference`, `status`, `metadata`, `created_at`, `completed_at`
FROM `wallet_transactions`
WHERE EXISTS (SELECT 1 FROM `users` WHERE `users`.`id` = `wallet_transactions`.`user_id`);

-- Step 5: Drop old tables
DROP TABLE IF EXISTS `loyalty_transactions`;
DROP TABLE IF EXISTS `wallet_transactions`;

-- Step 6: Rename new table to final name
RENAME TABLE `wallet_transactions_new` TO `wallet_transactions`;

-- Step 7: Update foreign key constraints to use new table name
-- (The constraints are already correct since we used the same names)

-- Step 8: Add a view for easier loyalty-specific queries
CREATE VIEW `loyalty_transactions_view` AS
SELECT 
  `id`, `user_id`, `booking_id`, 
  CASE 
    WHEN `transaction_type` = 'loyalty_earned' THEN 'earned'
    WHEN `transaction_type` = 'loyalty_redeemed' THEN 'redeemed'
    WHEN `transaction_type` = 'loyalty_expired' THEN 'expired'
    WHEN `transaction_type` = 'loyalty_adjustment' THEN 'adjustment'
    ELSE 'earned'
  END as `transaction_type`,
  `points_amount`, `description`, `reference`,
  `points_before`, `points_after`, `metadata`, `created_at`, `expires_at`
FROM `wallet_transactions`
WHERE `transaction_type` LIKE 'loyalty_%';

-- Step 9: Add a view for easier monetary transaction queries
CREATE VIEW `monetary_transactions_view` AS
SELECT 
  `id`, `user_id`, `booking_id`, `transaction_type`,
  `amount`, `currency`, `description`, `reference`,
  `balance_before`, `balance_after`, `payment_method`,
  `payment_reference`, `status`, `metadata`, `created_at`, `completed_at`
FROM `wallet_transactions`
WHERE `transaction_type` NOT LIKE 'loyalty_%';

-- Commit the transaction
COMMIT;

-- Verify the new structure
DESCRIBE wallet_transactions;

SELECT 'Migration 10 completed: Unified wallet system created' AS status;
SELECT 'Old loyalty_transactions and wallet_transactions tables replaced with single wallet_transactions table' AS summary; 