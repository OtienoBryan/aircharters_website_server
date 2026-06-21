-- Migration: Create transaction_ledger table
-- Date: 2024-01-XX
-- Description: Add comprehensive transaction ledger for all payment operations

CREATE TABLE `transaction_ledger` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transactionId` varchar(255) NOT NULL,
  `parentTransactionId` varchar(255) DEFAULT NULL,
  `companyId` int(11) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `bookingId` varchar(255) DEFAULT NULL,
  `transactionType` enum('payment_received','platform_fee','company_payout','refund','chargeback','adjustment','transfer') NOT NULL,
  `paymentProvider` enum('stripe','mpesa','paypal','bank_transfer') NOT NULL,
  `providerTransactionId` varchar(255) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `currency` enum('USD','KES','EUR','GBP') NOT NULL DEFAULT 'USD',
  `exchangeRate` decimal(10,6) NOT NULL DEFAULT 1.000000,
  `baseAmount` decimal(15,2) NOT NULL,
  `fee` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `netAmount` decimal(15,2) NOT NULL,
  `status` enum('pending','processing','completed','failed','cancelled','reversed') NOT NULL DEFAULT 'pending',
  `description` text DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `providerMetadata` json DEFAULT NULL,
  `errorMessage` text DEFAULT NULL,
  `processedAt` datetime DEFAULT NULL,
  `settledAt` datetime DEFAULT NULL,
  `reversedAt` datetime DEFAULT NULL,
  `reversalReason` text DEFAULT NULL,
  `ipAddress` varchar(45) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `isReconciled` tinyint(1) NOT NULL DEFAULT 0,
  `reconciledAt` datetime DEFAULT NULL,
  `reconciliationNotes` text DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_transaction_id` (`transactionId`),
  KEY `idx_parent_transaction` (`parentTransactionId`),
  KEY `idx_company_created` (`companyId`, `createdAt`),
  KEY `idx_provider_created` (`paymentProvider`, `createdAt`),
  KEY `idx_type_created` (`transactionType`, `createdAt`),
  KEY `idx_status_created` (`status`, `createdAt`),
  KEY `idx_booking_id` (`bookingId`),
  KEY `idx_user_id` (`userId`),
  KEY `idx_provider_transaction` (`paymentProvider`, `providerTransactionId`),
  KEY `idx_created_at` (`createdAt`),
  KEY `idx_updated_at` (`updatedAt`),
  KEY `idx_reconciled` (`isReconciled`),
  CONSTRAINT `fk_transaction_ledger_company` FOREIGN KEY (`companyId`) REFERENCES `charters_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transaction_ledger_parent` FOREIGN KEY (`parentTransactionId`) REFERENCES `transaction_ledger` (`transactionId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add additional indexes for performance
CREATE INDEX `idx_transaction_ledger_amount` ON `transaction_ledger` (`amount`);
CREATE INDEX `idx_transaction_ledger_currency` ON `transaction_ledger` (`currency`);
CREATE INDEX `idx_transaction_ledger_base_amount` ON `transaction_ledger` (`baseAmount`);
CREATE INDEX `idx_transaction_ledger_processed_at` ON `transaction_ledger` (`processedAt`);
CREATE INDEX `idx_transaction_ledger_settled_at` ON `transaction_ledger` (`settledAt`);
