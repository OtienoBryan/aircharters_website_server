-- Migration 12: Final Cleanup - Drop Old Tables
-- Clean up old tables that are no longer needed after optimizations
-- WARNING: Only run this after confirming all new tables work correctly!

USE citlogis_air_charters;

-- Start transaction
START TRANSACTION;

-- Check what tables exist before cleanup
SELECT 'Checking existing tables before cleanup...' AS status;

-- List all tables that might need cleanup
SELECT 
  TABLE_NAME,
  CASE 
    WHEN TABLE_NAME IN ('loyalty_transactions', 'wallet_transactions_new') THEN 'OLD - Should be dropped'
    WHEN TABLE_NAME IN ('user_preferences', 'user_trip_history', 'user_documents', 'user_calendar_events') THEN 'OLD - Should be dropped'
    WHEN TABLE_NAME IN ('user_profile', 'user_trips', 'user_files', 'user_events') THEN 'NEW - Keep'
    WHEN TABLE_NAME IN ('wallet_transactions') THEN 'NEW - Keep (after rename)'
    ELSE 'UNKNOWN - Review'
  END as status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'citlogis_air_charters' 
AND TABLE_NAME IN (
  'loyalty_transactions', 
  'wallet_transactions_new',
  'user_preferences', 
  'user_trip_history', 
  'user_documents', 
  'user_calendar_events',
  'user_profile', 
  'user_trips', 
  'user_files', 
  'user_events',
  'wallet_transactions'
);

-- Step 1: Complete the wallet_transactions_new rename if not done
-- Check if wallet_transactions_new exists but wallet_transactions doesn't
SELECT COUNT(*) INTO @wallet_new_exists
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'citlogis_air_charters' 
AND TABLE_NAME = 'wallet_transactions_new';

SELECT COUNT(*) INTO @wallet_exists
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'citlogis_air_charters' 
AND TABLE_NAME = 'wallet_transactions';

-- If wallet_transactions_new exists but wallet_transactions doesn't, rename it
SET @sql = (SELECT IF(
  @wallet_new_exists > 0 AND @wallet_exists = 0,
  'RENAME TABLE `wallet_transactions_new` TO `wallet_transactions`;',
  'SELECT "wallet_transactions_new rename not needed" as message;'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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

-- List all remaining tables
SELECT 
  TABLE_NAME,
  CASE 
    WHEN TABLE_NAME IN ('user_profile', 'user_trips', 'user_files', 'user_events', 'wallet_transactions') THEN '✅ NEW - Optimized'
    WHEN TABLE_NAME LIKE '%summary' THEN '✅ VIEW - Helpful'
    ELSE '📋 EXISTING - Core table'
  END as status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'citlogis_air_charters' 
AND TABLE_NAME IN (
  'user_profile', 
  'user_trips', 
  'user_files', 
  'user_events',
  'wallet_transactions',
  'user_trip_summary',
  'user_file_summary', 
  'user_event_summary',
  'loyalty_transactions_view',
  'monetary_transactions_view'
);

-- Step 9: Verify foreign key constraints are intact
SELECT 'Verifying foreign key constraints...' AS status;

SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'citlogis_air_charters'
AND REFERENCED_TABLE_NAME IS NOT NULL
AND TABLE_NAME IN ('user_profile', 'user_trips', 'user_files', 'user_events', 'wallet_transactions');

-- Step 10: Show final table count
SELECT 
  COUNT(*) as total_tables,
  COUNT(CASE WHEN TABLE_NAME LIKE 'user_%' THEN 1 END) as user_related_tables,
  COUNT(CASE WHEN TABLE_NAME LIKE '%summary' OR TABLE_NAME LIKE '%view' THEN 1 END) as views
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'citlogis_air_charters';

-- Commit the transaction
COMMIT;

SELECT 'Migration 12 completed: Final cleanup finished' AS status;
SELECT 'Database structure is now optimized and clean' AS summary; 