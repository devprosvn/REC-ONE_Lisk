-- REC-ONE Offer Lifecycle Management Migration
-- Add fields for offer expiration, restoration, and lifecycle management

-- Add new columns to energy_offers table
ALTER TABLE energy_offers 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_restored BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS restore_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_delete_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Update existing offers to have expiration dates (7 days from creation)
UPDATE energy_offers 
SET expires_at = created_at + INTERVAL '7 days',
    auto_delete_at = created_at + INTERVAL '10 days'
WHERE expires_at IS NULL;

-- Create index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_energy_offers_expires_at ON energy_offers(expires_at);
CREATE INDEX IF NOT EXISTS idx_energy_offers_auto_delete_at ON energy_offers(auto_delete_at);
CREATE INDEX IF NOT EXISTS idx_energy_offers_is_expired ON energy_offers(is_expired);
CREATE INDEX IF NOT EXISTS idx_energy_offers_is_cancelled ON energy_offers(is_cancelled);

-- Update status check constraint to include new statuses
ALTER TABLE energy_offers DROP CONSTRAINT IF EXISTS energy_offers_status_check;
ALTER TABLE energy_offers ADD CONSTRAINT energy_offers_status_check 
CHECK (status IN ('active', 'sold', 'cancelled', 'expired', 'deleted'));

-- Function to automatically expire offers after 7 days
CREATE OR REPLACE FUNCTION expire_old_offers()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Mark offers as expired if they're past expiration date and still active
    UPDATE energy_offers 
    SET 
        status = 'expired',
        is_expired = TRUE,
        updated_at = NOW()
    WHERE 
        status = 'active' 
        AND expires_at < NOW() 
        AND NOT is_expired;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically delete offers after auto_delete_at date
CREATE OR REPLACE FUNCTION delete_old_offers()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete offers that have passed their auto-delete date
    UPDATE energy_offers 
    SET 
        status = 'deleted',
        updated_at = NOW()
    WHERE 
        auto_delete_at < NOW() 
        AND status IN ('expired', 'cancelled')
        AND status != 'deleted';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to restore an expired offer
CREATE OR REPLACE FUNCTION restore_offer(
    offer_id_param BIGINT,
    user_wallet TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    offer_exists BOOLEAN;
    is_owner BOOLEAN;
BEGIN
    -- Check if offer exists and is expired
    SELECT EXISTS(
        SELECT 1 FROM energy_offers 
        WHERE offer_id = offer_id_param 
        AND status = 'expired'
        AND is_expired = TRUE
    ) INTO offer_exists;
    
    IF NOT offer_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is the owner
    SELECT EXISTS(
        SELECT 1 FROM energy_offers 
        WHERE offer_id = offer_id_param 
        AND seller_wallet = LOWER(user_wallet)
    ) INTO is_owner;
    
    IF NOT is_owner THEN
        RETURN FALSE;
    END IF;
    
    -- Restore the offer
    UPDATE energy_offers 
    SET 
        status = 'active',
        is_expired = FALSE,
        is_restored = TRUE,
        restored_at = NOW(),
        restore_count = restore_count + 1,
        expires_at = NOW() + INTERVAL '7 days',
        auto_delete_at = NOW() + INTERVAL '14 days', -- Extended for restored offers
        updated_at = NOW()
    WHERE 
        offer_id = offer_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel an offer
CREATE OR REPLACE FUNCTION cancel_offer(
    offer_id_param BIGINT,
    user_wallet TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    offer_exists BOOLEAN;
    is_owner BOOLEAN;
BEGIN
    -- Check if offer exists and is active/expired
    SELECT EXISTS(
        SELECT 1 FROM energy_offers 
        WHERE offer_id = offer_id_param 
        AND status IN ('active', 'expired')
    ) INTO offer_exists;
    
    IF NOT offer_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is the owner
    SELECT EXISTS(
        SELECT 1 FROM energy_offers 
        WHERE offer_id = offer_id_param 
        AND seller_wallet = LOWER(user_wallet)
    ) INTO is_owner;
    
    IF NOT is_owner THEN
        RETURN FALSE;
    END IF;
    
    -- Cancel the offer
    UPDATE energy_offers 
    SET 
        status = 'cancelled',
        is_cancelled = TRUE,
        cancelled_at = NOW(),
        cancelled_by = LOWER(user_wallet),
        auto_delete_at = NOW() + INTERVAL '3 days', -- Quick deletion for cancelled offers
        updated_at = NOW()
    WHERE 
        offer_id = offer_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to edit an offer
CREATE OR REPLACE FUNCTION edit_offer(
    offer_id_param BIGINT,
    user_wallet TEXT,
    new_quantity DECIMAL DEFAULT NULL,
    new_price_eth DECIMAL DEFAULT NULL,
    new_price_vnd DECIMAL DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    offer_exists BOOLEAN;
    is_owner BOOLEAN;
    current_quantity DECIMAL;
    new_total_eth DECIMAL;
    new_total_vnd DECIMAL;
BEGIN
    -- Check if offer exists and is active
    SELECT EXISTS(
        SELECT 1 FROM energy_offers 
        WHERE offer_id = offer_id_param 
        AND status = 'active'
        AND NOT is_expired
    ) INTO offer_exists;
    
    IF NOT offer_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is the owner
    SELECT EXISTS(
        SELECT 1 FROM energy_offers 
        WHERE offer_id = offer_id_param 
        AND seller_wallet = LOWER(user_wallet)
    ) INTO is_owner;
    
    IF NOT is_owner THEN
        RETURN FALSE;
    END IF;
    
    -- Get current quantity for total price calculation
    SELECT quantity INTO current_quantity 
    FROM energy_offers 
    WHERE offer_id = offer_id_param;
    
    -- Use new quantity if provided, otherwise keep current
    IF new_quantity IS NOT NULL THEN
        current_quantity = new_quantity;
    END IF;
    
    -- Calculate new total prices
    SELECT 
        CASE WHEN new_price_eth IS NOT NULL THEN current_quantity * new_price_eth 
             ELSE total_price_eth END,
        CASE WHEN new_price_vnd IS NOT NULL THEN current_quantity * new_price_vnd 
             ELSE total_price_vnd END
    INTO new_total_eth, new_total_vnd
    FROM energy_offers 
    WHERE offer_id = offer_id_param;
    
    -- Update the offer
    UPDATE energy_offers 
    SET 
        quantity = COALESCE(new_quantity, quantity),
        price_per_kwh_eth = COALESCE(new_price_eth, price_per_kwh_eth),
        price_per_kwh_vnd = COALESCE(new_price_vnd, price_per_kwh_vnd),
        total_price_eth = new_total_eth,
        total_price_vnd = new_total_vnd,
        last_edited_at = NOW(),
        edit_count = edit_count + 1,
        updated_at = NOW()
    WHERE 
        offer_id = offer_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a view for active offers (excluding expired/deleted)
CREATE OR REPLACE VIEW active_offers AS
SELECT * FROM energy_offers 
WHERE status = 'active' 
AND NOT is_expired 
AND NOT is_cancelled 
AND expires_at > NOW();

-- Create a view for user's offers with status info
CREATE OR REPLACE VIEW user_offers_with_status AS
SELECT 
    eo.*,
    CASE 
        WHEN eo.status = 'deleted' THEN 'Đã xóa'
        WHEN eo.status = 'cancelled' THEN 'Đã hủy'
        WHEN eo.status = 'sold' THEN 'Đã bán'
        WHEN eo.status = 'expired' OR eo.is_expired THEN 'Hết hạn'
        WHEN eo.status = 'active' AND eo.expires_at > NOW() THEN 'Đang hoạt động'
        ELSE 'Không xác định'
    END as status_vietnamese,
    CASE 
        WHEN eo.expires_at > NOW() THEN EXTRACT(EPOCH FROM (eo.expires_at - NOW())) / 86400
        ELSE 0
    END as days_until_expiry,
    CASE 
        WHEN eo.auto_delete_at > NOW() THEN EXTRACT(EPOCH FROM (eo.auto_delete_at - NOW())) / 86400
        ELSE 0
    END as days_until_deletion
FROM energy_offers eo;

-- Add comments for documentation
COMMENT ON COLUMN energy_offers.expires_at IS 'When the offer expires (7 days from creation, 7 days from restoration)';
COMMENT ON COLUMN energy_offers.is_expired IS 'Whether the offer has expired';
COMMENT ON COLUMN energy_offers.is_restored IS 'Whether the offer has been restored after expiration';
COMMENT ON COLUMN energy_offers.restored_at IS 'When the offer was last restored';
COMMENT ON COLUMN energy_offers.restore_count IS 'Number of times the offer has been restored';
COMMENT ON COLUMN energy_offers.auto_delete_at IS 'When the offer will be automatically deleted (10 days normal, 14 days restored)';
COMMENT ON COLUMN energy_offers.is_cancelled IS 'Whether the offer was manually cancelled by user';
COMMENT ON COLUMN energy_offers.cancelled_at IS 'When the offer was cancelled';
COMMENT ON COLUMN energy_offers.cancelled_by IS 'Wallet address of user who cancelled the offer';
COMMENT ON COLUMN energy_offers.last_edited_at IS 'When the offer was last edited';
COMMENT ON COLUMN energy_offers.edit_count IS 'Number of times the offer has been edited';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION expire_old_offers() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_old_offers() TO authenticated;
GRANT EXECUTE ON FUNCTION restore_offer(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_offer(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION edit_offer(BIGINT, TEXT, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT SELECT ON active_offers TO authenticated;
GRANT SELECT ON user_offers_with_status TO authenticated;
