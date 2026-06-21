-- Migration: Create company_payment_accounts table
-- Date: 2024-01-XX
-- Description: Add company payment accounts for Stripe Connect and M-Pesa integration

CREATE TABLE `company_payment_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `companyId` int(11) NOT NULL,
  `paymentProvider` enum('stripe','mpesa') NOT NULL,
  `accountType` enum('express','custom','standard') NOT NULL DEFAULT 'express',
  `accountId` varchar(255) NOT NULL,
  `accountStatus` enum('pending','active','suspended','rejected') NOT NULL DEFAULT 'pending',
  `verificationStatus` varchar(50) NOT NULL DEFAULT 'pending',
  `country` varchar(2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'USD',
  `capabilities` json DEFAULT NULL,
  `requirements` json DEFAULT NULL,
  `businessProfile` json DEFAULT NULL,
  `bankAccountInfo` json DEFAULT NULL,
  `onboardingUrl` varchar(500) DEFAULT NULL,
  `dashboardUrl` varchar(500) DEFAULT NULL,
  `lastPayoutDate` datetime DEFAULT NULL,
  `totalPayouts` decimal(15,2) NOT NULL DEFAULT 0.00,
  `pendingBalance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `availableBalance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `metadata` json DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_account_id` (`accountId`),
  KEY `idx_company_provider` (`companyId`, `paymentProvider`),
  KEY `idx_account_status` (`accountStatus`),
  KEY `idx_is_active` (`isActive`),
  CONSTRAINT `fk_company_payment_accounts_company` FOREIGN KEY (`companyId`) REFERENCES `charters_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better performance
CREATE INDEX `idx_company_payment_accounts_created_at` ON `company_payment_accounts` (`createdAt`);
CREATE INDEX `idx_company_payment_accounts_updated_at` ON `company_payment_accounts` (`updatedAt`);
