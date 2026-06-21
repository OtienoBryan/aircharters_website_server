-- Migration 06: Create Loyalty Transactions Table
-- Track all loyalty points transactions with balance history

USE citlogis_air_charters;

-- Create loyalty_transactions table
CREATE TABLE `loyalty_transactions` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `booking_id` varchar(255) NULL,
  
  -- Transaction Details
  `transaction_type` enum('earned','redeemed','expired','bonus','adjustment') NOT NULL,
  `points_amount` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `reference` varchar(100),
  
  -- Balance Tracking
  `points_before` int(11) NOT NULL,
  `points_after` int(11) NOT NULL,
  
  -- Metadata
  `metadata` JSON,
  
  -- Timestamps
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL,
  
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_loyalty_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_loyalty_transactions_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Add indexes for better performance
CREATE INDEX `idx_loyalty_user_type` ON `loyalty_transactions` (`user_id`, `transaction_type`);
CREATE INDEX `idx_loyalty_expires` ON `loyalty_transactions` (`expires_at`);
CREATE INDEX `idx_loyalty_created` ON `loyalty_transactions` (`created_at`);
CREATE INDEX `idx_loyalty_booking` ON `loyalty_transactions` (`booking_id`);

-- Verify the table
DESCRIBE loyalty_transactions;

SELECT 'Migration 06 completed: Loyalty transactions table created' AS status; 