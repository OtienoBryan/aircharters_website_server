-- Migration 09: Cleanup Old Tables
-- Remove old redundant tables after successful migration
-- WARNING: Only run this after confirming all migrations work correctly!

USE citlogis_air_charters;

-- Check if new tables exist before dropping old ones
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loyalty_transactions') 
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loyalty_tiers')
    THEN 'New tables exist - proceeding with cleanup'
    ELSE 'New tables missing - skipping cleanup'
  END AS status;

-- Only proceed if new tables exist
-- Uncomment the following lines after confirming everything works:

/*
-- Drop old redundant tables (if they exist and are no longer needed)
-- DROP TABLE IF EXISTS `user_calendar_events`;
-- DROP TABLE IF EXISTS `company_users`;

-- Note: user_trip_history and user_documents have been replaced with enhanced versions
-- The old versions were already handled in migrations 04 and 05

SELECT 'Migration 09 completed: Old redundant tables cleaned up' AS status;
*/

SELECT 'Migration 09 completed: Cleanup ready (tables preserved for safety)' AS status; 