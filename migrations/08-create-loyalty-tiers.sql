-- Migration 08: Create Loyalty Tiers Configuration Table
-- Define loyalty tier rules and benefits

USE citlogis_air_charters;

-- Create loyalty_tiers table
CREATE TABLE `loyalty_tiers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tier_name` enum('bronze','silver','gold','platinum') NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `min_points` int(11) NOT NULL,
  `max_points` int(11) NULL,
  
  -- Benefits
  `points_multiplier` decimal(3,2) DEFAULT 1.00,
  `discount_percentage` decimal(5,2) DEFAULT 0.00,
  `free_upgrades` tinyint(1) DEFAULT 0,
  `priority_booking` tinyint(1) DEFAULT 0,
  `dedicated_support` tinyint(1) DEFAULT 0,
  
  -- Features
  `features` JSON,
  `description` text,
  
  -- Status
  `is_active` tinyint(1) DEFAULT 1,
  
  -- Timestamps
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_loyalty_tier_name` (`tier_name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Insert default loyalty tiers
INSERT INTO `loyalty_tiers` (
  `tier_name`, `display_name`, `min_points`, `max_points`,
  `points_multiplier`, `discount_percentage`, `free_upgrades`, `priority_booking`, `dedicated_support`,
  `features`, `description`
) VALUES
('bronze', 'Bronze Member', 0, 999, 1.00, 0.00, 0, 0, 0, 
 '["Basic booking", "Email support"]', 'Start your journey with basic benefits'),
 
('silver', 'Silver Member', 1000, 4999, 1.25, 5.00, 0, 0, 0,
 '["5% discount", "25% bonus points", "Priority email support"]', 'Enjoy enhanced benefits with silver status'),
 
('gold', 'Gold Member', 5000, 19999, 1.50, 10.00, 1, 1, 0,
 '["10% discount", "50% bonus points", "Free upgrades", "Priority booking", "Phone support"]', 'Premium benefits for frequent travelers'),
 
('platinum', 'Platinum Member', 20000, NULL, 2.00, 15.00, 2, 1, 1,
 '["15% discount", "100% bonus points", "Free upgrades", "Priority booking", "Dedicated support", "Exclusive offers"]', 'Ultimate benefits for VIP members');

-- Add indexes
CREATE INDEX `idx_loyalty_tiers_active` ON `loyalty_tiers` (`is_active`);
CREATE INDEX `idx_loyalty_tiers_points` ON `loyalty_tiers` (`min_points`, `max_points`);

-- Verify the table
DESCRIBE loyalty_tiers;
SELECT * FROM loyalty_tiers;

SELECT 'Migration 08 completed: Loyalty tiers configuration table created' AS status; 