-- Migration to update booking inquiry IDs to auto-incrementing integers

-- First, drop the existing foreign key constraints
ALTER TABLE `inquiry_stops` DROP FOREIGN KEY IF EXISTS `inquiry_stops_ibfk_1`;

-- Update booking_inquiries table
ALTER TABLE `booking_inquiries` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- Update inquiry_stops table
ALTER TABLE `inquiry_stops` MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `inquiry_stops` MODIFY `bookingInquiryId` int(11) NOT NULL;

-- Re-add the foreign key constraint
ALTER TABLE `inquiry_stops` 
ADD CONSTRAINT `inquiry_stops_ibfk_1` 
FOREIGN KEY (`bookingInquiryId`) REFERENCES `booking_inquiries` (`id`) ON DELETE CASCADE;

-- Set auto-increment values
ALTER TABLE `booking_inquiries` AUTO_INCREMENT = 1;
ALTER TABLE `inquiry_stops` AUTO_INCREMENT = 1; 