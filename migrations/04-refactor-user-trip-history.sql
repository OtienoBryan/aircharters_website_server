-- Migration 04: Refactor User Trip History Table
-- Simplify structure and use proper foreign keys

USE citlogis_air_charters;

-- Create new simplified user_trip_history table
CREATE TABLE `user_trip_history_new` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `booking_id` varchar(255) NOT NULL,
  
  -- Trip Details (use foreign keys, not strings)
  `deal_id` int(11) NOT NULL,
  `pilot_id` int(11) NULL,
  
  -- Trip Status
  `trip_status` enum('upcoming','completed','cancelled') NOT NULL,
  `payment_status` enum('paid','refunded','partial_refund') NOT NULL,
  
  -- User Feedback
  `user_rating` int(11) CHECK (`user_rating` >= 1 AND `user_rating` <= 5),
  `user_review` text,
  `review_date` timestamp NULL,
  
  -- Trip Media
  `trip_photos` JSON,
  `trip_videos` JSON,
  
  -- Timestamps
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL,
  `cancelled_at` timestamp NULL,
  
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_trip_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_trip_history_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_trip_history_deal` FOREIGN KEY (`deal_id`) REFERENCES `charter_deals` (`id`),
  CONSTRAINT `fk_trip_history_pilot` FOREIGN KEY (`pilot_id`) REFERENCES `pilots` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Add indexes for better performance
CREATE INDEX `idx_trip_user_status` ON `user_trip_history_new` (`user_id`, `trip_status`);
CREATE INDEX `idx_trip_rating` ON `user_trip_history_new` (`user_rating`);
CREATE INDEX `idx_trip_created` ON `user_trip_history_new` (`created_at`);

-- Migrate data from old table to new table (if old table exists)
INSERT INTO `user_trip_history_new` (
  `id`, `user_id`, `booking_id`, `deal_id`, `pilot_id`,
  `trip_status`, `payment_status`, `user_rating`, `user_review`,
  `trip_photos`, `created_at`, `completed_at`
)
SELECT 
  `id`, `user_id`, `booking_id`, 
  (SELECT `dealId` FROM `bookings` WHERE `bookings`.`id` = `user_trip_history`.`booking_id`) as `deal_id`,
  NULL as `pilot_id`, -- Will be updated later if pilot data exists
  `trip_status`, `payment_status`, `user_rating`, `user_review`,
  `trip_photos`, `created_at`, `completed_at`
FROM `user_trip_history`
WHERE EXISTS (SELECT 1 FROM `bookings` WHERE `bookings`.`id` = `user_trip_history`.`booking_id`);

-- Drop old table and rename new table
DROP TABLE IF EXISTS `user_trip_history`;
ALTER TABLE `user_trip_history_new` RENAME TO `user_trip_history`;

-- Verify the new table
DESCRIBE user_trip_history;

SELECT 'Migration 04 completed: User trip history table refactored with proper foreign keys' AS status; 