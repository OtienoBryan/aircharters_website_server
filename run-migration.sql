-- Run this migration first to add Paystack-specific fields
-- Copy and paste this into phpMyAdmin SQL tab

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

-- Verify the migration
SELECT 
  'Migration completed successfully' as status,
  COUNT(*) as total_paystack_accounts
FROM company_payment_accounts 
WHERE paymentProvider = 'paystack';
