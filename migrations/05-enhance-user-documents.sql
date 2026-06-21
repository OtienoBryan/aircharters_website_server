-- Migration 05: Enhance User Documents Table
-- Add document status, expiration, and better organization

USE citlogis_air_charters;

-- Drop existing user_documents table if it exists
DROP TABLE IF EXISTS `user_documents`;

-- Create enhanced user_documents table
CREATE TABLE `user_documents` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `booking_id` varchar(255) NULL,
  
  -- Document Info
  `document_type` enum('receipt','ticket','invoice','boarding_pass','itinerary','loyalty_card','other') NOT NULL,
  `document_name` varchar(255) NOT NULL,
  `document_url` text NOT NULL,
  `document_public_id` varchar(255) NOT NULL,
  
  -- File Metadata
  `file_size` int(11),
  `file_format` varchar(10),
  `file_type` varchar(50),
  
  -- Organization
  `tags` JSON,
  `notes` text,
  `is_favorite` tinyint(1) DEFAULT 0,
  `status` enum('draft','published','archived') DEFAULT 'published',
  
  -- Expiration
  `expires_at` timestamp NULL,
  
  -- Timestamps
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_user_documents_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_documents_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Add indexes for better performance
CREATE INDEX `idx_documents_user_type` ON `user_documents` (`user_id`, `document_type`);
CREATE INDEX `idx_documents_expires` ON `user_documents` (`expires_at`);
CREATE INDEX `idx_documents_status` ON `user_documents` (`status`);
CREATE INDEX `idx_documents_favorite` ON `user_documents` (`is_favorite`);

-- Verify the table
DESCRIBE user_documents;

SELECT 'Migration 05 completed: Enhanced user_documents table created' AS status; 