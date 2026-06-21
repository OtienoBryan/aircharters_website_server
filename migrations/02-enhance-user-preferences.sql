-- Migration 02: Enhance User Preferences Table
-- Add comprehensive travel and notification preferences

USE citlogis_air_charters;

-- Drop existing user_preferences table if it exists
DROP TABLE IF EXISTS `user_preferences`;

-- Create enhanced user_preferences table
CREATE TABLE `user_preferences` (
  `user_id` varchar(255) NOT NULL,
  
  -- Travel Preferences
  `seat_preference` enum('window','aisle','any') DEFAULT 'any',
  `meal_preference` text,
  `special_assistance` JSON,
  `preferred_aircraft_types` JSON,
  
  -- Notification Preferences
  `notifications` JSON DEFAULT '{"email": true, "sms": true, "push": true}',
  `marketing_emails` tinyint(1) DEFAULT 1,
  `promotional_sms` tinyint(1) DEFAULT 1,
  
  -- Privacy Settings
  `profile_visibility` enum('public','friends','private') DEFAULT 'private',
  `data_sharing` JSON,
  
  -- Timestamps
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_preferences_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Add indexes
CREATE INDEX `idx_user_preferences_seat` ON `user_preferences` (`seat_preference`);
CREATE INDEX `idx_user_preferences_visibility` ON `user_preferences` (`profile_visibility`);

-- Verify the table
DESCRIBE user_preferences;

SELECT 'Migration 02 completed: Enhanced user_preferences table created' AS status; 