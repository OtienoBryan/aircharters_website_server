-- Migration 11: Simplify User Tables - Consolidate User-Prefixed Tables
-- Replace multiple user tables with simplified, practical structure
-- This consolidates user_preferences, user_trip_history, user_documents, user_calendar_events

USE citlogis_air_charters;

-- Start transaction
START TRANSACTION;

-- Step 1: Create simplified user_profile table (replaces user_preferences)
CREATE TABLE `user_profile` (
  `user_id` varchar(255) NOT NULL,
  
  -- Essential Travel Preferences
  `seat_preference` enum('window','aisle','any') DEFAULT 'any',
  `meal_preference` text DEFAULT NULL,
  `special_assistance` text DEFAULT NULL,
  
  -- Notification Settings (simplified)
  `email_notifications` tinyint(1) DEFAULT 1,
  `sms_notifications` tinyint(1) DEFAULT 1,
  `push_notifications` tinyint(1) DEFAULT 1,
  `marketing_emails` tinyint(1) DEFAULT 1,
  
  -- Privacy
  `profile_visible` tinyint(1) DEFAULT 0,
  
  -- Timestamps
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_profile_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Step 2: Create simplified user_trips table (replaces user_trip_history)
CREATE TABLE `user_trips` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `booking_id` varchar(255) NOT NULL,
  
  -- Trip Status
  `status` enum('upcoming','completed','cancelled') NOT NULL,
  
  -- User Feedback (simplified)
  `rating` int(11) DEFAULT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `review` text DEFAULT NULL,
  `review_date` timestamp NULL DEFAULT NULL,
  
  -- Trip Media (simplified)
  `photos` text DEFAULT NULL, -- JSON as text for simplicity
  `videos` text DEFAULT NULL, -- JSON as text for simplicity
  
  -- Timestamps
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_user_trips_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_trips_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Step 3: Create simplified user_files table (replaces user_documents)
CREATE TABLE `user_files` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `booking_id` varchar(255) DEFAULT NULL,
  
  -- File Info
  `type` enum('receipt','ticket','invoice','boarding_pass','itinerary','other') NOT NULL,
  `name` varchar(255) NOT NULL,
  `url` text NOT NULL,
  `public_id` varchar(255) NOT NULL,
  
  -- File Metadata
  `file_size` int(11) DEFAULT NULL,
  `file_format` varchar(10) DEFAULT NULL,
  
  -- Organization
  `is_favorite` tinyint(1) DEFAULT 0,
  `notes` text DEFAULT NULL,
  
  -- Timestamps
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_user_files_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_files_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Step 4: Create simplified user_events table (replaces user_calendar_events)
CREATE TABLE `user_events` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `booking_id` varchar(255) DEFAULT NULL,
  
  -- Event Info
  `type` enum('flight','reminder','personal') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  
  -- Event Timing
  `event_date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `is_all_day` tinyint(1) DEFAULT 0,
  
  -- Location and Reminders
  `location` varchar(255) DEFAULT NULL,
  `reminder_minutes` int(11) DEFAULT 60,
  `reminder_sent` tinyint(1) DEFAULT 0,
  
  -- Timestamps
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_user_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_events_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Step 5: Add indexes for better performance
CREATE INDEX `idx_user_profile_visible` ON `user_profile` (`profile_visible`);
CREATE INDEX `idx_user_trips_user_status` ON `user_trips` (`user_id`, `status`);
CREATE INDEX `idx_user_trips_rating` ON `user_trips` (`rating`);
CREATE INDEX `idx_user_trips_created` ON `user_trips` (`created_at`);
CREATE INDEX `idx_user_files_user_type` ON `user_files` (`user_id`, `type`);
CREATE INDEX `idx_user_files_favorite` ON `user_files` (`is_favorite`);
CREATE INDEX `idx_user_events_user_date` ON `user_events` (`user_id`, `event_date`);
CREATE INDEX `idx_user_events_type` ON `user_events` (`type`);

-- Step 6: Migrate data from old tables (if they exist)

-- Migrate user_preferences to user_profile
INSERT INTO `user_profile` (
  `user_id`, `seat_preference`, `meal_preference`, `special_assistance`,
  `email_notifications`, `sms_notifications`, `push_notifications`, `marketing_emails`,
  `profile_visible`, `created_at`, `updated_at`
)
SELECT 
  `user_id`,
  COALESCE(`seat_preference`, 'any'),
  `meal_preference`,
  `special_assistance`,
  CASE 
    WHEN JSON_EXTRACT(`notifications`, '$.email') = true THEN 1 
    ELSE 0 
  END,
  CASE 
    WHEN JSON_EXTRACT(`notifications`, '$.sms') = true THEN 1 
    ELSE 0 
  END,
  CASE 
    WHEN JSON_EXTRACT(`notifications`, '$.push') = true THEN 1 
    ELSE 0 
  END,
  `marketing_emails`,
  CASE WHEN `profile_visibility` = 'public' THEN 1 ELSE 0 END,
  `created_at`,
  `updated_at`
FROM `user_preferences`
WHERE EXISTS (SELECT 1 FROM `users` WHERE `users`.`id` = `user_preferences`.`user_id`);

-- Migrate user_trip_history to user_trips
INSERT INTO `user_trips` (
  `id`, `user_id`, `booking_id`, `status`, `rating`, `review`, 
  `review_date`, `photos`, `videos`, `created_at`, `completed_at`, `cancelled_at`
)
SELECT 
  `id`, `user_id`, `booking_id`, `trip_status`, `user_rating`, `user_review`,
  `review_date`, `trip_photos`, `trip_videos`, `created_at`, `completed_at`, `cancelled_at`
FROM `user_trip_history`
WHERE EXISTS (SELECT 1 FROM `users` WHERE `users`.`id` = `user_trip_history`.`user_id`);

-- Migrate user_documents to user_files
INSERT INTO `user_files` (
  `id`, `user_id`, `booking_id`, `type`, `name`, `url`, `public_id`,
  `file_size`, `file_format`, `is_favorite`, `notes`, `created_at`, `updated_at`
)
SELECT 
  `id`, `user_id`, `booking_id`, `document_type`, `document_name`, `document_url`, `document_public_id`,
  `file_size`, `file_format`, `is_favorite`, `notes`, `created_at`, `updated_at`
FROM `user_documents`
WHERE EXISTS (SELECT 1 FROM `users` WHERE `users`.`id` = `user_documents`.`user_id`);

-- Migrate user_calendar_events to user_events
INSERT INTO `user_events` (
  `id`, `user_id`, `booking_id`, `type`, `title`, `description`,
  `event_date`, `end_date`, `is_all_day`, `location`, `reminder_minutes`,
  `reminder_sent`, `created_at`, `updated_at`
)
SELECT 
  `id`, `user_id`, `booking_id`, `event_type`, `title`, `description`,
  `event_date`, `end_date`, `is_all_day`, `location`, `reminder_minutes`,
  `is_reminder_sent`, `created_at`, `updated_at`
FROM `user_calendar_events`
WHERE EXISTS (SELECT 1 FROM `users` WHERE `users`.`id` = `user_calendar_events`.`user_id`);

-- Step 7: Drop old tables
DROP TABLE IF EXISTS `user_preferences`;
DROP TABLE IF EXISTS `user_trip_history`;
DROP TABLE IF EXISTS `user_documents`;
DROP TABLE IF EXISTS `user_calendar_events`;

-- Step 8: Create helpful views for common queries

-- View for user trip summary
CREATE VIEW `user_trip_summary` AS
SELECT 
  `user_id`,
  COUNT(*) as total_trips,
  COUNT(CASE WHEN `status` = 'completed' THEN 1 END) as completed_trips,
  COUNT(CASE WHEN `status` = 'upcoming' THEN 1 END) as upcoming_trips,
  COUNT(CASE WHEN `status` = 'cancelled' THEN 1 END) as cancelled_trips,
  AVG(`rating`) as average_rating,
  MAX(`created_at`) as last_trip_date
FROM `user_trips`
GROUP BY `user_id`;

-- View for user file summary
CREATE VIEW `user_file_summary` AS
SELECT 
  `user_id`,
  COUNT(*) as total_files,
  COUNT(CASE WHEN `type` = 'receipt' THEN 1 END) as receipts,
  COUNT(CASE WHEN `type` = 'ticket' THEN 1 END) as tickets,
  COUNT(CASE WHEN `type` = 'boarding_pass' THEN 1 END) as boarding_passes,
  COUNT(CASE WHEN `is_favorite` = 1 THEN 1 END) as favorite_files
FROM `user_files`
GROUP BY `user_id`;

-- View for user event summary
CREATE VIEW `user_event_summary` AS
SELECT 
  `user_id`,
  COUNT(*) as total_events,
  COUNT(CASE WHEN `type` = 'flight' THEN 1 END) as flight_events,
  COUNT(CASE WHEN `type` = 'reminder' THEN 1 END) as reminders,
  COUNT(CASE WHEN `type` = 'personal' THEN 1 END) as personal_events,
  COUNT(CASE WHEN `event_date` > NOW() THEN 1 END) as upcoming_events
FROM `user_events`
GROUP BY `user_id`;

-- Commit the transaction
COMMIT;

-- Verify the new structure
DESCRIBE user_profile;
DESCRIBE user_trips;
DESCRIBE user_files;
DESCRIBE user_events;

SELECT 'Migration 11 completed: User tables simplified and consolidated' AS status;
SELECT 'Replaced 4 complex tables with 4 simplified tables' AS summary;
SELECT 'Created helpful summary views for common queries' AS views_created; 