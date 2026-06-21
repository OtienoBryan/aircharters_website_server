-- Adminer 4.8.1 MySQL 8.4.6-0ubuntu0.25.04.3 dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `adminNotifications`;
CREATE TABLE `adminNotifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `target` enum('citAdmin','superadmin','companyAdmin','agent','vehicleCompanyAdmin','yachtCompanyAdmin') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `read` tinyint(1) DEFAULT '0',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `userId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `agent_details`;
CREATE TABLE `agent_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `adminId` int NOT NULL,
  `imageUrl` varchar(255) DEFAULT NULL,
  `imagePublicIdUrl` varchar(255) DEFAULT NULL,
  `licenseUrl` varchar(255) DEFAULT NULL,
  `licensePublicIdUrl` varchar(255) DEFAULT NULL,
  `agreementFormUrl` varchar(255) DEFAULT NULL,
  `agreementFormPublicIdUrl` varchar(255) DEFAULT NULL,
  `idPassportNumber` varchar(255) DEFAULT NULL,
  `mobileNumber` varchar(255) DEFAULT NULL,
  `aocNumber` varchar(255) DEFAULT NULL,
  `companyName` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `adminId` (`adminId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `aircraft_amenities`;
CREATE TABLE `aircraft_amenities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `aircraftId` int DEFAULT NULL,
  `amenityId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `aircraftId` (`aircraftId`),
  KEY `amenityId` (`amenityId`),
  CONSTRAINT `aircraft_amenities_ibfk_1` FOREIGN KEY (`aircraftId`) REFERENCES `aircrafts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `aircraft_amenities_ibfk_2` FOREIGN KEY (`amenityId`) REFERENCES `amenities` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `aircraft_blockouts`;
CREATE TABLE `aircraft_blockouts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `aircraftId` int NOT NULL COMMENT 'Reference to the aircraft that is being blocked.',
  `companyId` int NOT NULL COMMENT 'The company that owns the aircraft and is creating the block.',
  `startDateTime` datetime NOT NULL COMMENT 'The precise start date and time of the blockout period.',
  `endDateTime` datetime NOT NULL COMMENT 'The precise end date and time of the blockout period.',
  `type` enum('BOOKING','MAINTENANCE') NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `aircraftId` (`aircraftId`),
  KEY `companyId` (`companyId`),
  CONSTRAINT `aircraft_blockouts_ibfk_1` FOREIGN KEY (`aircraftId`) REFERENCES `aircrafts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `aircraft_blockouts_ibfk_2` FOREIGN KEY (`companyId`) REFERENCES `charters_companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


SET NAMES utf8mb4;

DROP TABLE IF EXISTS `aircraft_calendar`;
CREATE TABLE `aircraft_calendar` (
  `id` int NOT NULL AUTO_INCREMENT,
  `aircraftId` int NOT NULL,
  `companyId` int NOT NULL,
  `startDateTime` datetime NOT NULL,
  `endDateTime` datetime NOT NULL,
  `eventType` enum('available','booked','maintenance','blocked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `bookingId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `originAirport` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destinationAirport` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passengerCount` int DEFAULT NULL,
  `totalPrice` decimal(10,2) DEFAULT NULL,
  `pricePerHour` decimal(10,2) DEFAULT NULL,
  `repositioningCost` decimal(10,2) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_aircraft_time` (`aircraftId`,`startDateTime`,`endDateTime`),
  KEY `idx_event_type` (`eventType`),
  KEY `idx_booking` (`bookingId`),
  KEY `companyId` (`companyId`),
  KEY `idx_aircraft_calendar_search` (`aircraftId`,`startDateTime`,`endDateTime`,`eventType`),
  KEY `idx_aircraft_calendar_availability` (`eventType`,`startDateTime`,`endDateTime`),
  CONSTRAINT `aircraft_calendar_ibfk_1` FOREIGN KEY (`aircraftId`) REFERENCES `aircrafts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `aircraft_calendar_ibfk_2` FOREIGN KEY (`companyId`) REFERENCES `charters_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `aircraft_images`;
CREATE TABLE `aircraft_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `aircraftId` int NOT NULL,
  `category` varchar(50) NOT NULL,
  `url` text NOT NULL,
  `publicId` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `aircraftId` (`aircraftId`),
  KEY `idx_aircraft_images_aircraft_id` (`aircraftId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `aircraft_type_image_placeholders`;
CREATE TABLE `aircraft_type_image_placeholders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('helicopter','fixedWing','jet','glider','seaplane','ultralight','balloon','tiltrotor','gyroplane','airship') NOT NULL,
  `placeholderImageUrl` varchar(255) NOT NULL COMMENT 'Full URL to the placeholder image',
  `placeholderImagePublicId` varchar(255) NOT NULL COMMENT 'Cloud storage public ID (e.g., Cloudinary public_id)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `aircrafts`;
CREATE TABLE `aircrafts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `companyId` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `registrationNumber` varchar(20) NOT NULL,
  `type` enum('helicopter','fixedWing','jet','glider','seaplane','ultralight','balloon','tiltrotor','gyroplane','airship') NOT NULL,
  `model` varchar(100) DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `yearManufactured` int DEFAULT NULL,
  `capacity` int NOT NULL,
  `isAvailable` tinyint NOT NULL DEFAULT '1',
  `maintenanceStatus` enum('operational','maintenance','out_of_service') NOT NULL DEFAULT 'operational',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `pricePerHour` decimal(10,2) DEFAULT NULL,
  `cruiseSpeedKnots` int DEFAULT NULL,
  `baseAirport` varchar(100) DEFAULT NULL COMMENT 'Specific airport or airstrip where the aircraft is stationed',
  `baseCity` varchar(100) DEFAULT NULL COMMENT 'City or town associated with the base airport',
  `aircraftTypeImagePlaceholderId` int DEFAULT NULL,
  `serviceType` enum('cargo','medical') DEFAULT NULL COMMENT 'Specifies if the aircraft is for cargo, medical, or null for normal charters',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_f07333b2229059cc039b6bc2c8` (`registrationNumber`),
  KEY `idx_aircrafts_company_id` (`companyId`),
  KEY `idx_aircrafts_type` (`type`),
  KEY `idx_aircrafts_is_available` (`isAvailable`),
  KEY `idx_aircrafts_maintenance_status` (`maintenanceStatus`),
  KEY `idx_aircrafts_available_maintenance` (`isAvailable`,`maintenanceStatus`),
  KEY `idx_aircrafts_type_available` (`type`,`isAvailable`),
  KEY `idx_aircrafts_complete` (`companyId`,`type`,`isAvailable`,`maintenanceStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `amenities`;
CREATE TABLE `amenities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `booking_timeline`;
CREATE TABLE `booking_timeline` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookingId` varchar(255) NOT NULL,
  `eventType` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `oldValue` varchar(255) DEFAULT NULL,
  `newValue` varchar(255) DEFAULT NULL,
  `metadata` longtext,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `bookingId` (`bookingId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `charter_booking_stops`;
CREATE TABLE `charter_booking_stops` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `stop_name` varchar(255) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `datetime` datetime DEFAULT NULL,
  `stop_order` int NOT NULL DEFAULT '1',
  `location_type` enum('airport','city','custom') DEFAULT 'custom',
  `location_code` varchar(10) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  CONSTRAINT `charter_booking_stops_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `charter_bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `charter_bookings`;
CREATE TABLE `charter_bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` varchar(255) NOT NULL COMMENT 'ID of the user who made the booking',
  `companyId` int NOT NULL,
  `aircraftId` int DEFAULT NULL COMMENT 'ID of the aircraft if it is a direct charter',
  `bookingType` enum('direct','deal','experience') NOT NULL COMMENT 'Determines whether it is a direct charter, deal, or experience',
  `dealId` int DEFAULT NULL COMMENT 'ID of the deal if it is a deal booking',
  `experienceTemplateId` int DEFAULT NULL,
  `totalPrice` decimal(10,2) DEFAULT NULL COMMENT 'Total price of the booking including tax',
  `taxType` varchar(50) DEFAULT NULL COMMENT 'e.g., VAT, GST, Sales Tax, etc.',
  `taxAmount` decimal(10,2) DEFAULT NULL COMMENT 'Tax amount for the booking',
  `subtotal` decimal(10,2) DEFAULT NULL COMMENT 'Subtotal of the booking before tax',
  `bookingStatus` enum('pending','priced','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  `paymentStatus` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `referenceNumber` varchar(50) NOT NULL,
  `specialRequirements` text,
  `adminNotes` text COMMENT 'Notes or feedback from the admin regarding this booking',
  `originName` varchar(255) DEFAULT NULL COMMENT 'Name of the origin',
  `originLatitude` decimal(10,7) DEFAULT NULL,
  `originLongitude` decimal(10,7) DEFAULT NULL,
  `destinationName` varchar(255) DEFAULT NULL COMMENT 'Name of the destination',
  `destinationLatitude` decimal(10,7) DEFAULT NULL COMMENT 'Latitude of the destination',
  `destinationLongitude` decimal(10,7) DEFAULT NULL COMMENT 'Longitude of the destination',
  `departureDateTime` datetime DEFAULT NULL COMMENT 'Scheduled departure date and time of the flight if its a direct charter null if its a deal or experience',
  `estimatedFlightHours` decimal(5,2) DEFAULT NULL COMMENT 'Estimated duration of the flight in hours',
  `distanceNm` decimal(10,2) DEFAULT NULL,
  `estimatedArrivalTime` datetime DEFAULT NULL COMMENT 'Estimated arrival date and time of the flight',
  `createdAt` datetime NOT NULL,
  `totalAdults` int DEFAULT '0' COMMENT 'Number of adult passengers for the booking',
  `totalChildren` int DEFAULT '0' COMMENT 'Number of child passengers for the booking',
  `onboardDining` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Indicates if onboard dining is included in the booking',
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referenceNumber` (`referenceNumber`),
  KEY `userId` (`userId`),
  KEY `companyId` (`companyId`),
  KEY `aircraftId` (`aircraftId`),
  KEY `dealId` (`dealId`),
  KEY `experienceScheduleId` (`experienceTemplateId`),
  CONSTRAINT `charter_bookings_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `charter_bookings_ibfk_2` FOREIGN KEY (`companyId`) REFERENCES `charters_companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `charter_bookings_ibfk_3` FOREIGN KEY (`aircraftId`) REFERENCES `aircrafts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `charter_bookings_ibfk_4` FOREIGN KEY (`dealId`) REFERENCES `charter_deals` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `charter_bookings_ibfk_5` FOREIGN KEY (`experienceTemplateId`) REFERENCES `experience_schedules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `charter_deal_amenities`;
CREATE TABLE `charter_deal_amenities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dealId` int DEFAULT NULL,
  `amenityId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `dealId` (`dealId`),
  KEY `amenityId` (`amenityId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `charter_deals`;
CREATE TABLE `charter_deals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `companyId` int NOT NULL,
  `aircraftId` int NOT NULL,
  `originName` varchar(255) NOT NULL,
  `originLatitude` decimal(10,7) NOT NULL,
  `originLongitude` decimal(10,7) NOT NULL,
  `destinationName` varchar(255) NOT NULL,
  `destinationLatitude` decimal(10,7) NOT NULL,
  `destinationLongitude` decimal(10,7) NOT NULL,
  `date` date NOT NULL,
  `time` time NOT NULL,
  `pricePerSeat` decimal(10,2) NOT NULL,
  `discountPerSeat` int DEFAULT '0',
  `taxType` varchar(255) DEFAULT NULL COMMENT 'Type of tax applied to the deal',
  `taxAmount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Tax amount applied to the deal',
  `total` decimal(10,2) NOT NULL COMMENT 'Total amount of the deal',
  `availableSeats` int NOT NULL,
  `estimatedFlightTimeMinutes` int NOT NULL COMMENT 'Estimated flight time in minutes',
  `turnaroundBufferMinutes` int DEFAULT '30' COMMENT 'Buffer time after landing before aircraft is available again',
  `pilotId` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `fixedRouteId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pilotId` (`pilotId`),
  KEY `fixedRouteId` (`fixedRouteId`),
  KEY `idx_charter_deals_company_id` (`companyId`),
  KEY `idx_charter_deals_aircraft_id` (`aircraftId`),
  KEY `idx_charter_deals_date` (`date`),
  KEY `idx_charter_deals_origin_destination` (`originName`,`destinationName`),
  KEY `idx_charter_deals_company_date` (`companyId`,`date`),
  KEY `idx_charter_deals_aircraft_date` (`aircraftId`,`date`),
  KEY `idx_charter_deals_complete` (`companyId`,`aircraftId`,`date`,`availableSeats`),
  CONSTRAINT `charter_deals_ibfk_1` FOREIGN KEY (`companyId`) REFERENCES `charters_companies` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `charter_deals_ibfk_2` FOREIGN KEY (`aircraftId`) REFERENCES `aircrafts` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `charter_deals_ibfk_3` FOREIGN KEY (`pilotId`) REFERENCES `pilots` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `charter_deals_ibfk_4` FOREIGN KEY (`fixedRouteId`) REFERENCES `fixed_routes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `charter_passengers`;
CREATE TABLE `charter_passengers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `age` int DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `id_passport_number` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `is_user` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  CONSTRAINT `charter_passengers_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `charter_bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `charters_admins`;
CREATE TABLE `charters_admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `firstName` varchar(255) NOT NULL,
  `middleName` varchar(255) DEFAULT NULL,
  `lastName` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `isDefaultPassword` tinyint(1) NOT NULL DEFAULT '1',
  `role` enum('citAdmin','superadmin','companyAdmin','agent','vehicleCompanyAdmin','yachtCompanyAdmin') DEFAULT 'citAdmin',
  `companyId` int DEFAULT NULL,
  `agentDetailsId` int DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `vehicleCompanyId` int DEFAULT NULL COMMENT 'Reference to vehicle company for vehicle admins',
  `yachtCompanyId` int DEFAULT NULL COMMENT 'Reference to yacht company for yacht admins',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `email_4` (`email`),
  KEY `companyId` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `charters_companies`;
CREATE TABLE `charters_companies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `companyName` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `contactPersonFirstName` varchar(255) NOT NULL,
  `contactPersonLastName` varchar(255) NOT NULL,
  `mobileNumber` varchar(255) NOT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `country` varchar(255) NOT NULL,
  `licenseNumber` varchar(255) NOT NULL,
  `license` varchar(255) DEFAULT NULL,
  `licensePublicId` varchar(255) DEFAULT NULL,
  `logoPublicId` varchar(255) DEFAULT NULL,
  `onboardedBy` varchar(255) NOT NULL,
  `adminId` int NOT NULL,
  `status` enum('pendingReview','active','inactive','rejected','draft') NOT NULL DEFAULT 'draft',
  `agreementForm` varchar(255) DEFAULT NULL,
  `agreementFormPublicId` varchar(255) DEFAULT NULL,
  `approvedBy` varchar(255) DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `reviewRemarks` text,
  `revenueShareRate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_charters_companies_status` (`status`),
  KEY `idx_charters_companies_name` (`companyName`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `commission_payout_transactions`;
CREATE TABLE `commission_payout_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transactionId` varchar(255) NOT NULL COMMENT 'Stripe PaymentIntent ID or Charge ID',
  `amount` decimal(10,2) NOT NULL COMMENT 'Total transaction amount paid',
  `currency` varchar(10) NOT NULL DEFAULT 'usd' COMMENT 'Currency of the transaction',
  `status` enum('succeeded','pending','failed','refunded') NOT NULL DEFAULT 'pending' COMMENT 'Status of the transaction',
  `paymentMethod` varchar(255) DEFAULT NULL COMMENT 'Card, wallet, or other payment method used',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Extra data from Stripe (customer email, last4, etc.)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `companyId` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transactionId` (`transactionId`),
  CONSTRAINT `commission_payout_transactions_chk_1` CHECK (json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `commissions`;
CREATE TABLE `commissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookingId` int NOT NULL COMMENT 'ID of the booking this commission is for',
  `companyId` int NOT NULL COMMENT 'ID of the company that owes this commission',
  `bookingTotal` decimal(10,2) NOT NULL COMMENT 'Original booking total amount',
  `taxAmount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Tax amount deducted from booking total',
  `revenueShareRate` decimal(5,2) NOT NULL COMMENT 'Commission rate as percentage (e.g., 15.00 for 15%)',
  `commissionAmount` decimal(10,2) NOT NULL COMMENT 'Calculated commission amount: (bookingTotal - taxAmount) * revenueShareRate / 100',
  `status` enum('pending','owed','paid','cancelled') NOT NULL DEFAULT 'pending' COMMENT 'Current status of this commission',
  `paidAt` datetime DEFAULT NULL COMMENT 'Date when commission was paid by company',
  `transactionId` varchar(255) DEFAULT NULL COMMENT 'Transaction ID for the payment, can be null if not paid yet',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bookingId` (`bookingId`),
  KEY `companyId` (`companyId`),
  CONSTRAINT `commissions_ibfk_1` FOREIGN KEY (`bookingId`) REFERENCES `charter_bookings` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `commissions_ibfk_2` FOREIGN KEY (`companyId`) REFERENCES `charters_companies` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `company_payment_accounts`;
CREATE TABLE `company_payment_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `companyId` int NOT NULL,
  `paymentProvider` enum('stripe','mpesa','paystack') COLLATE utf8mb4_unicode_ci NOT NULL,
  `accountType` enum('express','custom','standard') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'express',
  `accountId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paystackSubaccountId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accountStatus` enum('pending','active','suspended','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `verificationStatus` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `country` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `capabilities` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `requirements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `businessProfile` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `bankAccountInfo` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `onboardingUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dashboardUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastPayoutDate` datetime DEFAULT NULL,
  `totalPayouts` decimal(15,2) NOT NULL DEFAULT '0.00',
  `pendingBalance` decimal(15,2) NOT NULL DEFAULT '0.00',
  `availableBalance` decimal(15,2) NOT NULL DEFAULT '0.00',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_account_id` (`accountId`),
  KEY `idx_company_provider` (`companyId`,`paymentProvider`),
  KEY `idx_account_status` (`accountStatus`),
  KEY `idx_is_active` (`isActive`),
  KEY `idx_company_payment_accounts_created_at` (`createdAt`),
  KEY `idx_company_payment_accounts_updated_at` (`updatedAt`),
  CONSTRAINT `fk_company_payment_accounts_company` FOREIGN KEY (`companyId`) REFERENCES `charters_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `company_payment_accounts_chk_1` CHECK (json_valid(`capabilities`)),
  CONSTRAINT `company_payment_accounts_chk_2` CHECK (json_valid(`requirements`)),
  CONSTRAINT `company_payment_accounts_chk_3` CHECK (json_valid(`businessProfile`)),
  CONSTRAINT `company_payment_accounts_chk_4` CHECK (json_valid(`bankAccountInfo`)),
  CONSTRAINT `company_payment_accounts_chk_5` CHECK (json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `drivers`;
CREATE TABLE `drivers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `idNumber` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `imageUrl` varchar(255) DEFAULT NULL,
  `imagePublicId` varchar(255) DEFAULT NULL,
  `rate` float NOT NULL DEFAULT '0',
  `companyId` int NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `companyId` (`companyId`),
  CONSTRAINT `drivers_ibfk_1` FOREIGN KEY (`companyId`) REFERENCES `vehicle_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `experience_images`;
CREATE TABLE `experience_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `experienceId` int NOT NULL,
  `imageSlot` varchar(50) NOT NULL COMMENT 'eg: image1, image2, image3 etc.',
  `url` text NOT NULL,
  `publicId` varchar(255) NOT NULL,
  `sortOrder` int DEFAULT '0' COMMENT 'For controlling display sequence',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `experienceId` (`experienceId`),
  CONSTRAINT `experience_images_ibfk_1` FOREIGN KEY (`experienceId`) REFERENCES `experience_templates` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `experience_schedules`;
CREATE TABLE `experience_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `experienceId` int NOT NULL,
  `companyId` int NOT NULL,
  `aircraftId` int DEFAULT NULL,
  `startTime` datetime NOT NULL,
  `endTime` datetime DEFAULT NULL,
  `priceUnit` enum('per_person','per_group','per_hour','per_flight') DEFAULT 'per_person',
  `durationMinutes` int NOT NULL COMMENT 'Total experience duration in minutes',
  `seatsAvailable` int NOT NULL COMMENT 'Number of seats available',
  `status` enum('scheduled','cancelled','completed') NOT NULL DEFAULT 'scheduled',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `taxType` varchar(255) DEFAULT NULL COMMENT 'Type of tax applied (e.g., VAT, GST, Service Tax, etc.)',
  `subTotal` decimal(10,2) NOT NULL COMMENT 'Amount before tax',
  `total` decimal(10,2) NOT NULL COMMENT 'Amount after tax',
  `taxAmount` decimal(10,2) DEFAULT '0.00' COMMENT 'Tax amount for the experience',
  PRIMARY KEY (`id`),
  KEY `experienceId` (`experienceId`),
  KEY `companyId` (`companyId`),
  KEY `aircraftId` (`aircraftId`),
  CONSTRAINT `experience_schedules_ibfk_1` FOREIGN KEY (`experienceId`) REFERENCES `experience_templates` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `experience_schedules_ibfk_2` FOREIGN KEY (`companyId`) REFERENCES `charters_companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `experience_schedules_ibfk_3` FOREIGN KEY (`aircraftId`) REFERENCES `aircrafts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `experience_templates`;
CREATE TABLE `experience_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `companyId` int NOT NULL,
  `title` varchar(100) NOT NULL COMMENT 'Experience title',
  `description` text NOT NULL COMMENT 'Experience description',
  `country` varchar(100) NOT NULL,
  `city` varchar(100) NOT NULL,
  `locationName` varchar(150) DEFAULT NULL COMMENT 'E.g., Maasai Mara National Reserve, Diani Beach, Wilson Airport',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `termsConditions` text,
  `taxType` varchar(255) DEFAULT NULL COMMENT 'Type of tax applied (e.g., VAT, GST, Service Tax, etc.)',
  `taxAmount` decimal(10,2) DEFAULT '0.00' COMMENT 'Tax amount for the experience',
  `subTotal` decimal(10,2) NOT NULL COMMENT 'Amount before tax',
  `total` decimal(10,2) NOT NULL COMMENT 'Amount after tax',
  `durationMinutes` int NOT NULL COMMENT 'Total experience duration in minutes',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `companyId` (`companyId`),
  CONSTRAINT `experience_templates_ibfk_1` FOREIGN KEY (`companyId`) REFERENCES `charters_companies` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `locations`;
CREATE TABLE `locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(10) NOT NULL,
  `country` varchar(100) NOT NULL,
  `type` enum('airport','city','region') NOT NULL DEFAULT 'city',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_locations_type` (`type`),
  KEY `idx_locations_country` (`country`),
  KEY `idx_locations_coordinates` (`latitude`,`longitude`),
  KEY `idx_locations_search` (`name`,`code`,`country`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `monetary_transactions_view`;
CREATE TABLE `monetary_transactions_view` (
  `id` varchar(255) DEFAULT NULL,
  `user_id` varchar(255) DEFAULT NULL,
  `booking_id` varchar(255) DEFAULT NULL,
  `transaction_type` enum('deposit','withdrawal','payment','refund','bonus','fee','loyalty_earned','loyalty_redeemed','loyalty_expired','loyalty_adjustment') DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `currency` varchar(3) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `balance_before` decimal(10,2) DEFAULT NULL,
  `balance_after` decimal(10,2) DEFAULT NULL,
  `payment_method` enum('card','mpesa','wallet','loyalty_points') DEFAULT NULL,
  `payment_reference` varchar(255) DEFAULT NULL,
  `status` enum('pending','completed','failed','cancelled') DEFAULT NULL,
  `metadata` longtext,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `passengers`;
CREATE TABLE `passengers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `age` int DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `id_passport_number` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_user` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  KEY `idx_passengers_is_user` (`is_user`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` varchar(255) NOT NULL,
  `booking_id` varchar(255) DEFAULT NULL,
  `bookingId` varchar(255) NOT NULL,
  `userId` varchar(255) NOT NULL,
  `company_id` int DEFAULT NULL,
  `paymentMethod` enum('card','mpesa','wallet','paystack') NOT NULL,
  `totalAmount` decimal(10,2) NOT NULL,
  `platformFee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `companyAmount` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'USD',
  `transactionId` varchar(255) DEFAULT NULL,
  `paymentStatus` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  `paymentGatewayResponse` text,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `payment_method` enum('card','mpesa','wallet','paystack') NOT NULL DEFAULT 'card',
  `payment_status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
  `platform_fee` decimal(10,2) DEFAULT '0.00',
  `company_amount` decimal(10,2) DEFAULT '0.00',
  `transaction_id` varchar(255) DEFAULT NULL,
  `payment_gateway_response` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bookingId` (`bookingId`),
  KEY `userId` (`userId`),
  KEY `payment_status` (`paymentStatus`),
  KEY `idx_payments_booking_id` (`booking_id`),
  KEY `idx_payments_user_id` (`userId`),
  KEY `idx_payments_company_id` (`company_id`),
  KEY `idx_payments_status` (`paymentStatus`),
  CONSTRAINT `payments_chk_1` CHECK (json_valid(`payment_gateway_response`))
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `pilots`;
CREATE TABLE `pilots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `idNumber` varchar(255) NOT NULL,
  `licenseNumber` varchar(255) NOT NULL,
  `licenseExpiry` datetime NOT NULL,
  `medicalExpiry` datetime NOT NULL,
  `licenseDocumentUrl` varchar(255) DEFAULT NULL,
  `licenseDocumentPublicId` varchar(255) DEFAULT NULL,
  `medicalDocumentUrl` varchar(255) DEFAULT NULL,
  `medicalDocumentPublicId` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `imageUrl` varchar(255) DEFAULT NULL,
  `rate` float NOT NULL DEFAULT '0',
  `imagePublicId` varchar(255) DEFAULT NULL,
  `companyId` int NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `companyId` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `transaction_ledger`;
CREATE TABLE `transaction_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transactionId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parentTransactionId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `companyId` int DEFAULT NULL,
  `userId` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bookingId` int DEFAULT NULL,
  `transactionType` enum('payment_received','platform_fee','company_payout','refund','chargeback','adjustment','transfer') COLLATE utf8mb4_unicode_ci NOT NULL,
  `paymentProvider` enum('stripe','mpesa','paypal','bank_transfer','paystack') COLLATE utf8mb4_unicode_ci NOT NULL,
  `providerTransactionId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `currency` enum('USD','KES','EUR','GBP') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `exchangeRate` decimal(10,6) NOT NULL DEFAULT '1.000000',
  `baseAmount` decimal(15,2) NOT NULL,
  `fee` decimal(15,2) NOT NULL DEFAULT '0.00',
  `tax` decimal(15,2) NOT NULL DEFAULT '0.00',
  `netAmount` decimal(15,2) NOT NULL,
  `status` enum('pending','processing','completed','failed','cancelled','reversed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `description` text COLLATE utf8mb4_unicode_ci,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `providerMetadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `errorMessage` text COLLATE utf8mb4_unicode_ci,
  `processedAt` datetime DEFAULT NULL,
  `settledAt` datetime DEFAULT NULL,
  `reversedAt` datetime DEFAULT NULL,
  `reversalReason` text COLLATE utf8mb4_unicode_ci,
  `ipAddress` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userAgent` text COLLATE utf8mb4_unicode_ci,
  `isReconciled` tinyint(1) NOT NULL DEFAULT '0',
  `reconciledAt` datetime DEFAULT NULL,
  `reconciliationNotes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_transaction_id` (`transactionId`),
  KEY `idx_parent_transaction` (`parentTransactionId`),
  KEY `idx_company_created` (`companyId`,`createdAt`),
  KEY `idx_provider_created` (`paymentProvider`,`createdAt`),
  KEY `idx_type_created` (`transactionType`,`createdAt`),
  KEY `idx_status_created` (`status`,`createdAt`),
  KEY `idx_booking_id` (`bookingId`),
  KEY `idx_user_id` (`userId`),
  KEY `idx_provider_transaction` (`paymentProvider`,`providerTransactionId`),
  KEY `idx_created_at` (`createdAt`),
  KEY `idx_updated_at` (`updatedAt`),
  KEY `idx_reconciled` (`isReconciled`),
  KEY `idx_transaction_ledger_amount` (`amount`),
  KEY `idx_transaction_ledger_currency` (`currency`),
  KEY `idx_transaction_ledger_base_amount` (`baseAmount`),
  KEY `idx_transaction_ledger_processed_at` (`processedAt`),
  KEY `idx_transaction_ledger_settled_at` (`settledAt`),
  CONSTRAINT `fk_transaction_ledger_company` FOREIGN KEY (`companyId`) REFERENCES `charters_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transaction_ledger_parent` FOREIGN KEY (`parentTransactionId`) REFERENCES `transaction_ledger` (`transactionId`) ON DELETE SET NULL,
  CONSTRAINT `transaction_ledger_ibfk_1` FOREIGN KEY (`bookingId`) REFERENCES `charter_bookings` (`id`),
  CONSTRAINT `transaction_ledger_chk_1` CHECK (json_valid(`metadata`)),
  CONSTRAINT `transaction_ledger_chk_2` CHECK (json_valid(`providerMetadata`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `user_event_summary`;
CREATE TABLE `user_event_summary` (
  `user_id` varchar(255) DEFAULT NULL,
  `total_events` bigint DEFAULT NULL,
  `flight_events` bigint DEFAULT NULL,
  `reminders` bigint DEFAULT NULL,
  `personal_events` bigint DEFAULT NULL,
  `upcoming_events` bigint DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `user_events`;
CREATE TABLE `user_events` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `booking_id` varchar(255) DEFAULT NULL,
  `type` enum('flight','reminder','personal') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `event_date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `is_all_day` tinyint(1) DEFAULT '0',
  `location` varchar(255) DEFAULT NULL,
  `reminder_minutes` int DEFAULT '60',
  `reminder_sent` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_user_events_booking` (`booking_id`),
  KEY `idx_user_events_user_date` (`user_id`,`event_date`),
  KEY `idx_user_events_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `user_file_summary`;
CREATE TABLE `user_file_summary` (
  `user_id` varchar(255) DEFAULT NULL,
  `total_files` bigint DEFAULT NULL,
  `receipts` bigint DEFAULT NULL,
  `tickets` bigint DEFAULT NULL,
  `boarding_passes` bigint DEFAULT NULL,
  `favorite_files` bigint DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `user_files`;
CREATE TABLE `user_files` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `booking_id` varchar(255) DEFAULT NULL,
  `type` enum('receipt','ticket','invoice','boarding_pass','itinerary','other') NOT NULL,
  `name` varchar(255) NOT NULL,
  `url` text NOT NULL,
  `public_id` varchar(255) NOT NULL,
  `file_size` int DEFAULT NULL,
  `file_format` varchar(10) DEFAULT NULL,
  `is_favorite` tinyint(1) DEFAULT '0',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_user_files_booking` (`booking_id`),
  KEY `idx_user_files_user_type` (`user_id`,`type`),
  KEY `idx_user_files_favorite` (`is_favorite`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `user_profile`;
CREATE TABLE `user_profile` (
  `user_id` varchar(255) NOT NULL,
  `seat_preference` enum('window','aisle','any') DEFAULT 'any',
  `meal_preference` text,
  `special_assistance` text,
  `email_notifications` tinyint(1) DEFAULT '1',
  `sms_notifications` tinyint(1) DEFAULT '1',
  `push_notifications` tinyint(1) DEFAULT '1',
  `marketing_emails` tinyint(1) DEFAULT '1',
  `profile_visible` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `data_sharing` tinyint(1) DEFAULT '0',
  `location_tracking` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`user_id`),
  KEY `idx_user_profile_visible` (`profile_visible`),
  KEY `idx_user_profile_data_sharing` (`data_sharing`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `user_trips`;
CREATE TABLE `user_trips` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `booking_id` varchar(255) NOT NULL,
  `status` enum('upcoming','completed','cancelled') NOT NULL,
  `rating` int DEFAULT NULL,
  `review` text,
  `review_date` timestamp NULL DEFAULT NULL,
  `photos` text,
  `videos` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_user_trips_booking` (`booking_id`),
  KEY `idx_user_trips_user_status` (`user_id`,`status`),
  KEY `idx_user_trips_rating` (`rating`),
  KEY `idx_user_trips_created` (`created_at`),
  CONSTRAINT `user_trips_chk_1` CHECK (((`rating` >= 1) and (`rating` <= 5)))
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `country_code` varchar(5) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `language` varchar(50) DEFAULT 'en',
  `currency` varchar(20) DEFAULT 'USD',
  `timezone` varchar(50) DEFAULT 'UTC',
  `theme` enum('light','dark','auto') DEFAULT 'auto',
  `profile_image_url` text,
  `profile_image_public_id` varchar(255) DEFAULT NULL,
  `loyalty_points` int NOT NULL DEFAULT '0',
  `loyalty_tier` enum('bronze','silver','gold','platinum') DEFAULT 'bronze',
  `wallet_balance` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `email_verified` tinyint NOT NULL DEFAULT '0',
  `phone_verified` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `password` varchar(255) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deletion_reason` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`),
  UNIQUE KEY `IDX_17d1817f241f10a3dbafb169fd` (`phone_number`),
  KEY `idx_users_loyalty_tier` (`loyalty_tier`),
  KEY `idx_users_loyalty_points` (`loyalty_points`),
  KEY `idx_users_deleted_at` (`deleted_at`),
  KEY `idx_users_is_active` (`is_active`),
  KEY `users_loyalty_points` (`loyalty_points`),
  KEY `users_loyalty_tier` (`loyalty_tier`),
  KEY `users_is_active` (`is_active`),
  KEY `users_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `vehicle_companies`;
CREATE TABLE `vehicle_companies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `companyName` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `contactPersonFirstName` varchar(255) NOT NULL,
  `contactPersonLastName` varchar(255) NOT NULL,
  `mobileNumber` varchar(255) NOT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `logoPublicId` varchar(255) DEFAULT NULL,
  `country` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `onboardedBy` varchar(255) NOT NULL,
  `adminId` int NOT NULL,
  `status` enum('pendingReview','active','inactive','rejected','draft') NOT NULL DEFAULT 'draft',
  `licenseDocument` varchar(255) DEFAULT NULL,
  `licenseDocumentPublicId` varchar(255) DEFAULT NULL,
  `agreementForm` varchar(255) DEFAULT NULL,
  `agreementFormPublicId` varchar(255) DEFAULT NULL,
  `approvedBy` varchar(255) DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `reviewRemarks` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `vehicle_images`;
CREATE TABLE `vehicle_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehicleId` int NOT NULL,
  `url` text NOT NULL,
  `publicId` varchar(255) NOT NULL,
  `imageSlot` varchar(50) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `vehicleId` (`vehicleId`),
  CONSTRAINT `vehicle_images_ibfk_1` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `vehicles`;
CREATE TABLE `vehicles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `companyId` int NOT NULL,
  `name` varchar(100) NOT NULL COMMENT 'Display name for the vehicle (e.g., "Executive Sedan")',
  `registrationNumber` varchar(20) NOT NULL COMMENT 'License plate number',
  `type` enum('sedan','suv','luxury','minivan','limousine','executive_van','coach','electric','hybrid','motorcycle') NOT NULL,
  `make` varchar(100) NOT NULL COMMENT 'Vehicle brand (e.g., Mercedes-Benz)',
  `model` varchar(100) NOT NULL COMMENT 'Vehicle model (e.g., S-Class)',
  `year` int NOT NULL,
  `capacity` int NOT NULL COMMENT 'Passenger capacity including driver',
  `luggageCapacity` int NOT NULL DEFAULT '2' COMMENT 'Number of standard suitcases',
  `isAvailable` tinyint(1) NOT NULL DEFAULT '1',
  `pricePerDay` decimal(10,2) DEFAULT NULL COMMENT 'Optional daily pricing',
  `description` text COMMENT 'Description of the vehicle',
  `maintenanceStatus` enum('operational','maintenance','out_of_service') DEFAULT 'operational',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `registrationNumber` (`registrationNumber`),
  KEY `companyId` (`companyId`),
  CONSTRAINT `vehicles_ibfk_1` FOREIGN KEY (`companyId`) REFERENCES `vehicle_companies` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='Ground transportation vehicles for chauffer services';


DROP TABLE IF EXISTS `wallet_transactions`;
CREATE TABLE `wallet_transactions` (
  `id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `booking_id` varchar(255) DEFAULT NULL,
  `transaction_type` enum('deposit','withdrawal','payment','refund','bonus','fee','loyalty_earned','loyalty_redeemed','loyalty_expired','loyalty_adjustment') NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `points_amount` int NOT NULL DEFAULT '0',
  `currency` varchar(3) DEFAULT 'USD',
  `description` varchar(255) NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `balance_before` decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance_after` decimal(10,2) NOT NULL DEFAULT '0.00',
  `points_before` int NOT NULL DEFAULT '0',
  `points_after` int NOT NULL DEFAULT '0',
  `payment_method` enum('card','mpesa','wallet','loyalty_points') DEFAULT NULL,
  `payment_reference` varchar(255) DEFAULT NULL,
  `status` enum('pending','completed','failed','cancelled') DEFAULT 'pending',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wallet_user_type` (`user_id`,`transaction_type`),
  KEY `idx_wallet_status` (`status`),
  KEY `idx_wallet_created` (`created_at`),
  KEY `idx_wallet_booking` (`booking_id`),
  KEY `idx_wallet_payment_method` (`payment_method`),
  KEY `idx_wallet_expires` (`expires_at`),
  KEY `idx_wallet_loyalty` (`transaction_type`),
  CONSTRAINT `wallet_transactions_chk_1` CHECK (json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `yacht_amenities`;
CREATE TABLE `yacht_amenities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `yacht_amenity`;
CREATE TABLE `yacht_amenity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `yachtId` int NOT NULL,
  `amenityId` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `yachtId` (`yachtId`),
  KEY `amenityId` (`amenityId`),
  CONSTRAINT `yacht_amenity_ibfk_1` FOREIGN KEY (`yachtId`) REFERENCES `yachts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `yacht_amenity_ibfk_2` FOREIGN KEY (`amenityId`) REFERENCES `yacht_amenities` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `yacht_images`;
CREATE TABLE `yacht_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `yachtId` int NOT NULL,
  `category` varchar(50) NOT NULL,
  `url` text NOT NULL,
  `publicId` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `yachtId` (`yachtId`),
  CONSTRAINT `yacht_images_ibfk_1` FOREIGN KEY (`yachtId`) REFERENCES `yachts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `yacht_type_image_placeholders`;
CREATE TABLE `yacht_type_image_placeholders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('dhows','yachts','boat','raft') NOT NULL,
  `placeholderImageUrl` varchar(255) NOT NULL COMMENT 'Full URL to the placeholder image',
  `placeholderImagePublicId` varchar(255) NOT NULL COMMENT 'Cloud storage public ID (e.g., Cloudinary public_id)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `yachts`;
CREATE TABLE `yachts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `companyId` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('dhows','yachts','boat','raft') NOT NULL,
  `description` text COMMENT 'Additional details or description about the yacht',
  `capacity` int NOT NULL,
  `isAvailable` tinyint(1) DEFAULT '1',
  `pricePerHour` decimal(10,2) DEFAULT NULL,
  `pricePerDay` decimal(10,2) DEFAULT NULL,
  `maintenanceStatus` enum('operational','maintenance','out_of_service') DEFAULT 'operational',
  `location` varchar(100) DEFAULT NULL COMMENT 'General location e.g., Baobab, Malindi Marine Park',
  `city` varchar(100) DEFAULT NULL COMMENT 'City associated with the yacht location',
  `yachtTypeImagePlaceholderId` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `companyId` (`companyId`),
  KEY `yachtTypeImagePlaceholderId` (`yachtTypeImagePlaceholderId`),
  CONSTRAINT `yachts_ibfk_1` FOREIGN KEY (`companyId`) REFERENCES `yachts_companies` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `yachts_ibfk_2` FOREIGN KEY (`yachtTypeImagePlaceholderId`) REFERENCES `yacht_type_image_placeholders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `yachts_companies`;
CREATE TABLE `yachts_companies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `companyName` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `contactPersonFirstName` varchar(255) NOT NULL,
  `contactPersonLastName` varchar(255) NOT NULL,
  `mobileNumber` varchar(255) NOT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `country` varchar(255) NOT NULL,
  `licenseNumber` varchar(255) NOT NULL,
  `logoPublicId` varchar(255) DEFAULT NULL,
  `onboardedBy` varchar(255) NOT NULL,
  `adminId` int NOT NULL,
  `status` enum('pendingReview','active','inactive','rejected','draft') NOT NULL DEFAULT 'draft',
  `agreementForm` varchar(255) DEFAULT NULL,
  `agreementFormPublicId` varchar(255) DEFAULT NULL,
  `license` varchar(255) DEFAULT NULL,
  `licensePublicId` varchar(255) DEFAULT NULL,
  `approvedBy` varchar(255) DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `reviewRemarks` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 2025-10-01 10:55:01