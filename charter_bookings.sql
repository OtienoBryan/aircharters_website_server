-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 15, 2025 at 09:35 PM
-- Server version: 10.6.23-MariaDB-cll-lve
-- PHP Version: 8.4.11

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `impulsep_air_charters`
--

-- --------------------------------------------------------

--
-- Table structure for table `charter_bookings`
--

CREATE TABLE `charter_bookings` (
  `id` int(11) NOT NULL,
  `userId` varchar(255) NOT NULL COMMENT 'ID of the user who made the booking',
  `companyId` int(11) NOT NULL,
  `aircraftId` int(11) DEFAULT NULL COMMENT 'ID of the aircraft if it is a direct charter',
  `bookingType` enum('direct','deal','experience') NOT NULL COMMENT 'Determines whether it is a direct charter, deal, or experience',
  `dealId` int(11) DEFAULT NULL COMMENT 'ID of the deal if it is a deal booking',
  `experienceScheduleId` int(11) DEFAULT NULL COMMENT 'ID of the experience schedule if it is an experience booking',
  `totalPrice` decimal(10,2) DEFAULT NULL COMMENT 'Total price of the booking including tax',
  `taxType` varchar(50) DEFAULT NULL COMMENT 'e.g., VAT, GST, Sales Tax, etc.',
  `taxAmount` decimal(10,2) DEFAULT NULL COMMENT 'Tax amount for the booking',
  `subtotal` decimal(10,2) DEFAULT NULL COMMENT 'Subtotal of the booking before tax',
  `bookingStatus` enum('pending','priced','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  `paymentStatus` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `referenceNumber` varchar(50) NOT NULL,
  `specialRequirements` text DEFAULT NULL,
  `adminNotes` text DEFAULT NULL COMMENT 'Notes or feedback from the admin regarding this booking',
  `originName` varchar(255) DEFAULT NULL COMMENT 'Name of the origin',
  `originLatitude` decimal(10,7) DEFAULT NULL,
  `originLongitude` decimal(10,7) DEFAULT NULL,
  `destinationName` varchar(255) DEFAULT NULL COMMENT 'Name of the destination',
  `destinationLatitude` decimal(10,7) DEFAULT NULL COMMENT 'Latitude of the destination',
  `destinationLongitude` decimal(10,7) DEFAULT NULL COMMENT 'Longitude of the destination',
  `departureDateTime` datetime DEFAULT NULL COMMENT 'Scheduled departure date and time of the flight if its a direct charter null if its a deal or experience',
  `estimatedFlightHours` decimal(5,2) DEFAULT NULL COMMENT 'Estimated duration of the flight in hours',
  `estimatedArrivalTime` datetime DEFAULT NULL COMMENT 'Estimated arrival date and time of the flight',
  `createdAt` datetime NOT NULL,
  `totalAdults` int(11) DEFAULT 0 COMMENT 'Number of adult passengers for the booking',
  `totalChildren` int(11) DEFAULT 0 COMMENT 'Number of child passengers for the booking',
  `onboardDining` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Indicates if onboard dining is included in the booking',
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `charter_bookings`
--

INSERT INTO `charter_bookings` (`id`, `userId`, `companyId`, `aircraftId`, `bookingType`, `dealId`, `experienceScheduleId`, `totalPrice`, `taxType`, `taxAmount`, `subtotal`, `bookingStatus`, `paymentStatus`, `referenceNumber`, `specialRequirements`, `adminNotes`, `originName`, `originLatitude`, `originLongitude`, `destinationName`, `destinationLatitude`, `destinationLongitude`, `departureDateTime`, `estimatedFlightHours`, `estimatedArrivalTime`, `createdAt`, `totalAdults`, `totalChildren`, `onboardDining`, `updatedAt`) VALUES
(47, 'user_1752093294468_5lug3jt2p', 11, 10, 'direct', NULL, NULL, 2494.00, NULL, NULL, NULL, 'pending', 'pending', 'ACCQN9P886', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-15 21:47:03', 1, 0, 0, '2025-09-15 21:47:03'),
(48, 'user_1752093294468_5lug3jt2p', 11, 5, 'direct', NULL, NULL, 1624.00, NULL, NULL, NULL, 'pending', 'pending', 'ACCJVK7KII', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-15 22:30:09', 1, 0, 0, '2025-09-15 22:30:09');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `charter_bookings`
--
ALTER TABLE `charter_bookings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `referenceNumber` (`referenceNumber`),
  ADD KEY `userId` (`userId`),
  ADD KEY `companyId` (`companyId`),
  ADD KEY `aircraftId` (`aircraftId`),
  ADD KEY `dealId` (`dealId`),
  ADD KEY `experienceScheduleId` (`experienceScheduleId`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `charter_bookings`
--
ALTER TABLE `charter_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `charter_bookings`
--
ALTER TABLE `charter_bookings`
  ADD CONSTRAINT `charter_bookings_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `charter_bookings_ibfk_2` FOREIGN KEY (`companyId`) REFERENCES `charters_companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `charter_bookings_ibfk_3` FOREIGN KEY (`aircraftId`) REFERENCES `aircrafts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `charter_bookings_ibfk_4` FOREIGN KEY (`dealId`) REFERENCES `charter_deals` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `charter_bookings_ibfk_5` FOREIGN KEY (`experienceScheduleId`) REFERENCES `experience_schedules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
