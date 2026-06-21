-- Create user_preferences table
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `user_id` varchar(255) NOT NULL,
  `language` varchar(50) DEFAULT 'English',
  `currency` varchar(20) DEFAULT 'USD ($)',
  `notifications` tinyint(1) DEFAULT 1,
  `date_of_birth` date DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci; 