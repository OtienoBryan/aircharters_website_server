-- MINIMAL PAYSTACK SETUP - Option 1
-- Uses existing fields + one new field for Paystack integration

-- Step 1: Check available companies
SELECT id, companyName, status FROM charters_companies WHERE status = 'active' LIMIT 5;

-- Step 2: Insert Paystack subaccount for company ID 11 (SPAir Services)
-- Using existing fields + new paystackSubaccountId field
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
  `paystackSubaccountId`  -- NEW FIELD
) VALUES (
  11, -- Company ID for SPAir Services
  'paystack',
  'custom',
  'ACCT_4evq96sxvwuf7va', -- Your existing Paystack subaccount ID (stored in accountId)
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
    'subaccount_type', 'custom',
    'percentage_charge', 5.0,
    'settlement_bank', 'Absa Bank Kenya Plc',
    'settlement_account_number', '2051951312',
    'split_code', NULL
  ),
  NOW(),
  NOW(),
  1,
  'ACCT_4evq96sxvwuf7va'  -- NEW FIELD: Paystack subaccount ID
);

-- Step 3: Verify the setup
SELECT 
  cpa.id,
  cpa.companyId,
  cc.companyName,
  cpa.paymentProvider,
  cpa.accountId,
  cpa.paystackSubaccountId,  -- NEW FIELD
  cpa.accountStatus,
  cpa.verificationStatus,
  cpa.country,
  cpa.currency,
  JSON_EXTRACT(cpa.metadata, '$.percentage_charge') as percentage_charge,
  JSON_EXTRACT(cpa.metadata, '$.settlement_bank') as settlement_bank,
  JSON_EXTRACT(cpa.metadata, '$.settlement_account_number') as settlement_account_number
FROM company_payment_accounts cpa
LEFT JOIN charters_companies cc ON cpa.companyId = cc.id
WHERE cpa.paymentProvider = 'paystack';