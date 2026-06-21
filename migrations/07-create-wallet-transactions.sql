-- Migration 07: Create Wallet Transactions Table
-- Track all wallet transactions with balance history

USE citlogis_air_charters;

-- Create wallet_transactions table
CREATE TABLE `wallet_transactions` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `booking_id` varchar(255) NULL,
  
  -- Transaction Details
  `transaction_type` enum('deposit','withdrawal','payment','refund','bonus','fee') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'USD',
  `description` varchar(255) NOT NULL,
  `reference` varchar(100),
  
  -- Balance Tracking
  `balance_before` decimal(10,2) NOT NULL,
  `balance_after` decimal(10,2) NOT NULL,
  
  -- Payment Method
  `payment_method` enum('card','mpesa','wallet','loyalty_points') NULL,
  `payment_reference` varchar(255),
  
  -- Status
  `status` enum('pending','completed','failed','cancelled') DEFAULT 'pending',
  
  -- Metadata
  `metadata` JSON,
  
  -- Timestamps
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL,
  
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_wallet_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wallet_transactions_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Add indexes for better performance
CREATE INDEX `idx_wallet_user_type` ON `wallet_transactions` (`user_id`, `transaction_type`);
CREATE INDEX `idx_wallet_status` ON `wallet_transactions` (`status`);
CREATE INDEX `idx_wallet_created` ON `wallet_transactions` (`created_at`);
CREATE INDEX `idx_wallet_booking` ON `wallet_transactions` (`booking_id`);
CREATE INDEX `idx_wallet_payment_method` ON `wallet_transactions` (`payment_method`);

-- Verify the table
DESCRIBE wallet_transactions;

SELECT 'Migration 07 completed: Wallet transactions table created' AS status; 