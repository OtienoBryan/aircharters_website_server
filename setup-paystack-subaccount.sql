-- Setup Paystack Subaccount for SPAir Services
-- Based on your existing Paystack subaccount: ACCT_4evq96sxvwuf7va

-- First, let's check if we have any companies to associate with
-- You can run this query to see available companies:
-- SELECT id, companyName FROM charters_companies WHERE status = 'active' LIMIT 5;

-- Insert Paystack subaccount for a company (replace companyId with actual company ID)
-- For now, using company ID 1 as an example - you should replace this with the actual company ID

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
  -- Paystack-specific fields
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
  11, -- Replace with actual company ID
  'paystack',
  'custom',
  'ACCT_4evq96sxvwuf7va', -- Your existing Paystack subaccount ID
  'active', -- Set to 'pending' if subaccount needs verification
  'unverified', -- Based on your Paystack dashboard status
  'KE', -- Kenya
  'KES', -- Kenyan Shilling
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

-- If you have multiple companies, you can create additional entries
-- Just change the companyId and accountId for each company

-- Example for additional companies (uncomment and modify as needed):
/*
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
  `isActive`
) VALUES (
  2, -- Another company ID
  'paystack',
  'custom',
  'ACCT_another_subaccount_id', -- Another Paystack subaccount ID
  'pending',
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
    'business_name', 'Another Airline Company',
    'business_type', 'aviation',
    'description', 'Charter flight services',
    'website', NULL,
    'support_email', 'support@anothercompany.com',
    'support_phone', '+254700000001'
  ),
  JSON_OBJECT(
    'bank_name', 'KCB Bank Kenya',
    'account_number', '1234567890',
    'account_name', 'Another Airline Company',
    'bank_code', '001',
    'country', 'KE'
  ),
  JSON_OBJECT(
    'paystack_subaccount_id', 'ACCT_another_subaccount_id',
    'split_code', NULL,
    'percentage_charge', 5.0,
    'settlement_bank', 'KCB Bank Kenya',
    'settlement_account_number', '1234567890',
    'subaccount_type', 'custom',
    'integration_type', 'paystack'
  ),
  NOW(),
  NOW(),
  1
);
*/

-- Query to verify the setup
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
