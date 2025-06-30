-- Add database constraints to prevent zero price offers
-- This ensures data integrity at the database level

-- Add CHECK constraint for price_per_kwh_eth > 0
ALTER TABLE energy_offers 
ADD CONSTRAINT check_price_per_kwh_eth_positive 
CHECK (price_per_kwh_eth > 0);

-- Add CHECK constraint for total_price_eth > 0  
ALTER TABLE energy_offers 
ADD CONSTRAINT check_total_price_eth_positive 
CHECK (total_price_eth > 0);

-- Add CHECK constraint for price_per_kwh_vnd > 0
ALTER TABLE energy_offers 
ADD CONSTRAINT check_price_per_kwh_vnd_positive 
CHECK (price_per_kwh_vnd > 0);

-- Add CHECK constraint for total_price_vnd > 0
ALTER TABLE energy_offers 
ADD CONSTRAINT check_total_price_vnd_positive 
CHECK (total_price_vnd > 0);

-- Add CHECK constraint for quantity > 0
ALTER TABLE energy_offers 
ADD CONSTRAINT check_quantity_positive 
CHECK (quantity > 0);

-- Add reasonable upper limits
ALTER TABLE energy_offers 
ADD CONSTRAINT check_price_per_kwh_eth_reasonable 
CHECK (price_per_kwh_eth <= 1.0);

ALTER TABLE energy_offers 
ADD CONSTRAINT check_quantity_reasonable 
CHECK (quantity <= 10000);

-- Add comments for documentation
COMMENT ON CONSTRAINT check_price_per_kwh_eth_positive ON energy_offers 
IS 'Ensures ETH price per kWh is greater than 0';

COMMENT ON CONSTRAINT check_total_price_eth_positive ON energy_offers 
IS 'Ensures total ETH price is greater than 0';

COMMENT ON CONSTRAINT check_price_per_kwh_vnd_positive ON energy_offers 
IS 'Ensures VND price per kWh is greater than 0';

COMMENT ON CONSTRAINT check_total_price_vnd_positive ON energy_offers 
IS 'Ensures total VND price is greater than 0';

COMMENT ON CONSTRAINT check_quantity_positive ON energy_offers 
IS 'Ensures quantity is greater than 0';

COMMENT ON CONSTRAINT check_price_per_kwh_eth_reasonable ON energy_offers 
IS 'Ensures ETH price per kWh does not exceed 1.0 ETH';

COMMENT ON CONSTRAINT check_quantity_reasonable ON energy_offers 
IS 'Ensures quantity does not exceed 10,000 kWh';
