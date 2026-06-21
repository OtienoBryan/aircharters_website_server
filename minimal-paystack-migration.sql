-- MINIMAL PAYSTACK MIGRATION - Option 1
-- Only adds the ONE field we need for Paystack integration

-- Step 1: Add only the essential Paystack field
ALTER TABLE `company_payment_accounts` 
ADD COLUMN `paystackSubaccountId` VARCHAR(255) NULL AFTER `accountId`;

-- Step 2: Add index for performance
ALTER TABLE `company_payment_accounts`
ADD INDEX `idx_paystack_subaccount_id` (`paystackSubaccountId`);

-- Step 3: Verify the migration
SELECT 
  'Migration completed successfully' as status,
  COUNT(*) as total_paystack_accounts
FROM company_payment_accounts 
WHERE paymentProvider = 'paystack';
