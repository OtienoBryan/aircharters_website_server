-- Simple Paystack setup using existing table structure
-- Run this AFTER running the migration

-- First, check available companies
SELECT id, companyName, status FROM charters_companies WHERE status = 'active' LIMIT 5;

-- Insert Paystack subaccount for company ID 11 (SPAir Services)
INSERT INTO `company_payment_accounts` (
  `companyId`,
  `paymentProvider`,
  `accountType`,
  `accountId`,
  `accountStatus`,
  `verificationStatus`,
  `country`,
  `currency`,
  `capabilities`,
  `requirements`,
  `businessProfile`,
  `bankAccountInfo`,
  `metadata`,
  `createdAt`,
  `updatedAt`,
  `isActive`,
  -- Paystack-specific fields (after migration)
  `paystackSubaccountId`,
  `paystackSplitCode`,
  `paystackPercentageCharge`,
  `paystackSettlementBank`,
  `paystackSettlementAccountNumber`,
  `paystackSettlementAccountName`,
  `paystackBusinessName`,
  `paystackBusinessType`,
  `paystackSupportEmail`,
  `paystackSupportPhone`,
  `paystackWebsite`,
  `paystackDescription`,
  `paystackBankCode`,
  `paystackBankName`,
  `paystackAccountNumber`,
  `paystackAccountName`,
  `paystackCapabilities`,
  `paystackRequirements`,
  `paystackLastSync`
) VALUES (
  11, -- Company ID for SPAir Services
  'paystack',
  'custom',
  'ACCT_4evq96sxvwuf7va', -- Your existing Paystack subaccount ID
  'active',
  'unverified',
  'KE',
  'KES',
  JSON_OBJECT(
    'transfers', true,
    'card_payments', true,
    'bank_transfers', true,
    'mobile_money', true,
    'split_payments', true
  ),
  JSON_OBJECT(
    'bank_verification', 'pending',
    'business_verification', 'pending',
    'identity_verification', 'pending'
  ),
  JSON_OBJECT(
    'business_name', 'SPAir Services',
    'business_type', 'aviation',
    'description', 'Charter flight services',
    'website', NULL,
    'support_email', 'support@spairservices.com',
    'support_phone', '+254700000000'
  ),
  JSON_OBJECT(
    'bank_name', 'Absa Bank Kenya Plc',
    'account_number', '2051951312',
    'account_name', 'SPAir Services',
    'bank_code', '031',
    'country', 'KE'
  ),
  JSON_OBJECT(
    'integration_type', 'paystack',
    'subaccount_type', 'custom'
  ),
  NOW(),
  NOW(),
  1,
  -- Paystack-specific field values
  'ACCT_4evq96sxvwuf7va', -- paystackSubaccountId
  NULL, -- paystackSplitCode (will be generated when you create split)
  5.00, -- paystackPercentageCharge (5% platform fee)
  'Absa Bank Kenya Plc', -- paystackSettlementBank
  '2051951312', -- paystackSettlementAccountNumber
  'SPAir Services', -- paystackSettlementAccountName
  'SPAir Services', -- paystackBusinessName
  'aviation', -- paystackBusinessType
  'support@spairservices.com', -- paystackSupportEmail
  '+254700000000', -- paystackSupportPhone
  NULL, -- paystackWebsite
  'Charter flight services', -- paystackDescription
  '031', -- paystackBankCode
  'Absa Bank Kenya Plc', -- paystackBankName
  '2051951312', -- paystackAccountNumber
  'SPAir Services', -- paystackAccountName
  JSON_OBJECT(
    'transfers', true,
    'card_payments', true,
    'bank_transfers', true,
    'mobile_money', true,
    'split_payments', true
  ), -- paystackCapabilities
  JSON_OBJECT(
    'bank_verification', 'pending',
    'business_verification', 'pending',
    'identity_verification', 'pending'
  ), -- paystackRequirements
  NOW() -- paystackLastSync
);

-- Verify the setup
SELECT 
  cpa.id,
  cpa.companyId,
  cc.companyName,
  cpa.paymentProvider,
  cpa.accountId,
  cpa.accountStatus,
  cpa.verificationStatus,
  cpa.country,
  cpa.currency,
  -- Paystack-specific fields
  cpa.paystackSubaccountId,
  cpa.paystackSplitCode,
  cpa.paystackPercentageCharge,
  cpa.paystackSettlementBank,
  cpa.paystackSettlementAccountNumber,
  cpa.paystackBusinessName,
  cpa.paystackBusinessType,
  cpa.paystackSupportEmail,
  cpa.paystackSupportPhone,
  cpa.paystackBankName,
  cpa.paystackAccountNumber,
  cpa.paystackLastSync
FROM company_payment_accounts cpa
LEFT JOIN charters_companies cc ON cpa.companyId = cc.id
WHERE cpa.paymentProvider = 'paystack';
