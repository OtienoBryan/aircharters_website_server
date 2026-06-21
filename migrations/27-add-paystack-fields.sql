-- Migration: Add Paystack-specific fields to company_payment_accounts table
-- Date: 2025-01-15
-- Description: Add dedicated fields for Paystack subaccount management instead of using JSON

-- Add Paystack-specific fields to company_payment_accounts table
ALTER TABLE `company_payment_accounts` 
ADD COLUMN `paystackSubaccountId` VARCHAR(255) NULL AFTER `accountId`,
ADD COLUMN `paystackSplitCode` VARCHAR(255) NULL AFTER `paystackSubaccountId`,
ADD COLUMN `paystackPercentageCharge` DECIMAL(5,2) NULL DEFAULT 5.00 AFTER `paystackSplitCode`,
ADD COLUMN `paystackSettlementBank` VARCHAR(255) NULL AFTER `paystackPercentageCharge`,
ADD COLUMN `paystackSettlementAccountNumber` VARCHAR(50) NULL AFTER `paystackSettlementBank`,
ADD COLUMN `paystackSettlementAccountName` VARCHAR(255) NULL AFTER `paystackSettlementAccountNumber`,
ADD COLUMN `paystackBusinessName` VARCHAR(255) NULL AFTER `paystackSettlementAccountName`,
ADD COLUMN `paystackBusinessType` VARCHAR(100) NULL DEFAULT 'aviation' AFTER `paystackBusinessName`,
ADD COLUMN `paystackSupportEmail` VARCHAR(255) NULL AFTER `paystackBusinessType`,
ADD COLUMN `paystackSupportPhone` VARCHAR(50) NULL AFTER `paystackSupportEmail`,
ADD COLUMN `paystackWebsite` VARCHAR(500) NULL AFTER `paystackSupportPhone`,
ADD COLUMN `paystackDescription` TEXT NULL AFTER `paystackWebsite`,
ADD COLUMN `paystackBankCode` VARCHAR(10) NULL AFTER `paystackDescription`,
ADD COLUMN `paystackBankName` VARCHAR(255) NULL AFTER `paystackBankCode`,
ADD COLUMN `paystackAccountNumber` VARCHAR(50) NULL AFTER `paystackBankName`,
ADD COLUMN `paystackAccountName` VARCHAR(255) NULL AFTER `paystackAccountNumber`,
ADD COLUMN `paystackCapabilities` JSON NULL AFTER `paystackAccountName`,
ADD COLUMN `paystackRequirements` JSON NULL AFTER `paystackCapabilities`,
ADD COLUMN `paystackLastSync` DATETIME NULL AFTER `paystackRequirements`,
ADD COLUMN `paystackWebhookUrl` VARCHAR(500) NULL AFTER `paystackLastSync`;

-- Add indexes for better performance
ALTER TABLE `company_payment_accounts`
ADD INDEX `idx_paystack_subaccount_id` (`paystackSubaccountId`),
ADD INDEX `idx_paystack_split_code` (`paystackSplitCode`),
ADD INDEX `idx_paystack_business_name` (`paystackBusinessName`),
ADD INDEX `idx_paystack_settlement_bank` (`paystackSettlementBank`);

-- Add constraints
ALTER TABLE `company_payment_accounts`
ADD CONSTRAINT `chk_paystack_percentage_charge` CHECK (`paystackPercentageCharge` >= 0 AND `paystackPercentageCharge` <= 100);

-- Update existing records to populate new fields from JSON metadata
UPDATE `company_payment_accounts` 
SET 
  `paystackSubaccountId` = JSON_UNQUOTE(JSON_EXTRACT(`metadata`, '$.paystack_subaccount_id')),
  `paystackSplitCode` = JSON_UNQUOTE(JSON_EXTRACT(`metadata`, '$.split_code')),
  `paystackPercentageCharge` = JSON_UNQUOTE(JSON_EXTRACT(`metadata`, '$.percentage_charge')),
  `paystackSettlementBank` = JSON_UNQUOTE(JSON_EXTRACT(`metadata`, '$.settlement_bank')),
  `paystackSettlementAccountNumber` = JSON_UNQUOTE(JSON_EXTRACT(`metadata`, '$.settlement_account_number')),
  `paystackBusinessName` = JSON_UNQUOTE(JSON_EXTRACT(`businessProfile`, '$.business_name')),
  `paystackBusinessType` = JSON_UNQUOTE(JSON_EXTRACT(`businessProfile`, '$.business_type')),
  `paystackSupportEmail` = JSON_UNQUOTE(JSON_EXTRACT(`businessProfile`, '$.support_email')),
  `paystackSupportPhone` = JSON_UNQUOTE(JSON_EXTRACT(`businessProfile`, '$.support_phone')),
  `paystackWebsite` = JSON_UNQUOTE(JSON_EXTRACT(`businessProfile`, '$.website')),
  `paystackDescription` = JSON_UNQUOTE(JSON_EXTRACT(`businessProfile`, '$.description')),
  `paystackBankCode` = JSON_UNQUOTE(JSON_EXTRACT(`bankAccountInfo`, '$.bank_code')),
  `paystackBankName` = JSON_UNQUOTE(JSON_EXTRACT(`bankAccountInfo`, '$.bank_name')),
  `paystackAccountNumber` = JSON_UNQUOTE(JSON_EXTRACT(`bankAccountInfo`, '$.account_number')),
  `paystackAccountName` = JSON_UNQUOTE(JSON_EXTRACT(`bankAccountInfo`, '$.account_name')),
  `paystackCapabilities` = `capabilities`,
  `paystackRequirements` = `requirements`
WHERE `paymentProvider` = 'paystack' 
  AND `metadata` IS NOT NULL;

-- Set default values for new fields where NULL
UPDATE `company_payment_accounts` 
SET 
  `paystackPercentageCharge` = 5.00,
  `paystackBusinessType` = 'aviation'
WHERE `paymentProvider` = 'paystack' 
  AND (`paystackPercentageCharge` IS NULL OR `paystackBusinessType` IS NULL);

-- Add comments for documentation
ALTER TABLE `company_payment_accounts` 
MODIFY COLUMN `paystackSubaccountId` VARCHAR(255) NULL COMMENT 'Paystack subaccount ID (e.g., ACCT_xxxxx)',
MODIFY COLUMN `paystackSplitCode` VARCHAR(255) NULL COMMENT 'Paystack split code for automatic transfers',
MODIFY COLUMN `paystackPercentageCharge` DECIMAL(5,2) NULL DEFAULT 5.00 COMMENT 'Platform fee percentage (0-100)',
MODIFY COLUMN `paystackSettlementBank` VARCHAR(255) NULL COMMENT 'Bank name for settlements',
MODIFY COLUMN `paystackSettlementAccountNumber` VARCHAR(50) NULL COMMENT 'Bank account number for settlements',
MODIFY COLUMN `paystackSettlementAccountName` VARCHAR(255) NULL COMMENT 'Bank account name for settlements',
MODIFY COLUMN `paystackBusinessName` VARCHAR(255) NULL COMMENT 'Business name as registered with Paystack',
MODIFY COLUMN `paystackBusinessType` VARCHAR(100) NULL DEFAULT 'aviation' COMMENT 'Type of business (aviation, etc.)',
MODIFY COLUMN `paystackSupportEmail` VARCHAR(255) NULL COMMENT 'Support email for Paystack account',
MODIFY COLUMN `paystackSupportPhone` VARCHAR(50) NULL COMMENT 'Support phone for Paystack account',
MODIFY COLUMN `paystackWebsite` VARCHAR(500) NULL COMMENT 'Business website URL',
MODIFY COLUMN `paystackDescription` TEXT NULL COMMENT 'Business description',
MODIFY COLUMN `paystackBankCode` VARCHAR(10) NULL COMMENT 'Bank code (e.g., 031 for Absa)',
MODIFY COLUMN `paystackBankName` VARCHAR(255) NULL COMMENT 'Bank name for account',
MODIFY COLUMN `paystackAccountNumber` VARCHAR(50) NULL COMMENT 'Bank account number',
MODIFY COLUMN `paystackAccountName` VARCHAR(255) NULL COMMENT 'Bank account name',
MODIFY COLUMN `paystackCapabilities` JSON NULL COMMENT 'Paystack account capabilities',
MODIFY COLUMN `paystackRequirements` JSON NULL COMMENT 'Paystack verification requirements',
MODIFY COLUMN `paystackLastSync` DATETIME NULL COMMENT 'Last sync with Paystack API',
MODIFY COLUMN `paystackWebhookUrl` VARCHAR(500) NULL COMMENT 'Webhook URL for Paystack events';

-- Verify the migration
SELECT 
  'Migration completed successfully' as status,
  COUNT(*) as total_paystack_accounts,
  COUNT(paystackSubaccountId) as accounts_with_subaccount_id,
  COUNT(paystackSplitCode) as accounts_with_split_code,
  AVG(paystackPercentageCharge) as avg_percentage_charge
FROM company_payment_accounts 
WHERE paymentProvider = 'paystack';
