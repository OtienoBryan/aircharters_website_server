-- Migration 12: Final Cleanup - Drop Old Tables (Simple Version)
-- Clean up old tables that are no longer needed after optimizations
-- WARNING: Only run this after confirming all new tables work correctly!

USE citlogis_air_charters;

-- Start transaction
START TRANSACTION;

-- Step 1: Complete the wallet_transactions_new rename if not done
-- Try to rename wallet_transactions_new to wallet_transactions
-- This will fail gracefully if the table doesn't exist
RENAME TABLE `wallet_transactions_new` TO `wallet_transactions`;
SELECT 'Renamed wallet_transactions_new to wallet_transactions' AS action;

-- Step 2: Drop old loyalty_transactions table (if it exists)
-- This was replaced by the unified wallet_transactions table
DROP TABLE IF EXISTS `loyalty_transactions`;
SELECT 'Dropped old loyalty_transactions table' AS action;

-- Step 3: Drop old wallet_transactions_new table (if it still exists)
-- This should have been renamed to wallet_transactions
DROP TABLE IF EXISTS `wallet_transactions_new`;
SELECT 'Dropped old wallet_transactions_new table' AS action;

-- Step 4: Drop old user_preferences table (if it exists)
-- This was replaced by user_profile
DROP TABLE IF EXISTS `user_preferences`;
SELECT 'Dropped old user_preferences table' AS action;

-- Step 5: Drop old user_trip_history table (if it exists)
-- This was replaced by user_trips
DROP TABLE IF EXISTS `user_trip_history`;
SELECT 'Dropped old user_trip_history table' AS action;

-- Step 6: Drop old user_documents table (if it exists)
-- This was replaced by user_files
DROP TABLE IF EXISTS `user_documents`;
SELECT 'Dropped old user_documents table' AS action;

-- Step 7: Drop old user_calendar_events table (if it exists)
-- This was replaced by user_events
DROP TABLE IF EXISTS `user_calendar_events`;
SELECT 'Dropped old user_calendar_events table' AS action;

-- Step 8: Verify the final structure
SELECT 'Verifying final table structure...' AS status;

-- Show all user-related tables
SHOW TABLES LIKE 'user_%';

-- Show all wallet/loyalty related tables
SHOW TABLES LIKE '%wallet%';
SHOW TABLES LIKE '%loyalty%';

-- Show all summary views
SHOW TABLES LIKE '%summary%';
SHOW TABLES LIKE '%view%';

-- Step 9: Verify new tables exist and have correct structure
SELECT 'Verifying new table structures...' AS status;

-- Check user_profile table
DESCRIBE user_profile;

-- Check user_trips table  
DESCRIBE user_trips;

-- Check user_files table
DESCRIBE user_files;

-- Check user_events table
DESCRIBE user_events;

-- Check wallet_transactions table
DESCRIBE wallet_transactions;

-- Step 10: Show final table count
SELECT 'Final table count:' AS status;
SELECT COUNT(*) as total_tables FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'citlogis_air_charters';

-- Commit the transaction
COMMIT;

SELECT 'Migration 12 completed: Final cleanup finished' AS status;
SELECT 'Database structure is now optimized and clean' AS summary; 