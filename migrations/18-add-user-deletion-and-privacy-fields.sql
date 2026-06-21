-- Migration: Add user deletion and privacy fields
-- Date: 2024-01-XX

-- Add deletion fields to users table
ALTER TABLE users 
ADD COLUMN deleted_at TIMESTAMP NULL,
ADD COLUMN deletion_reason TEXT NULL;

-- Add privacy fields to user_profile table
ALTER TABLE user_profile 
ADD COLUMN data_sharing BOOLEAN DEFAULT FALSE,
ADD COLUMN location_tracking BOOLEAN DEFAULT TRUE;

-- Add indexes for better performance
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_user_profile_data_sharing ON user_profile(data_sharing); 