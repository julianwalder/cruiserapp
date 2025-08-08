-- Create normalized_addresses table for storing OpenAI-processed address data
CREATE TABLE IF NOT EXISTS normalized_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Normalized address fields
    street_address TEXT,
    city TEXT,
    state_region TEXT,
    country TEXT,
    postal_code TEXT,
    
    -- Source information
    source_type TEXT NOT NULL, -- 'invoice_import', 'veriff_validation', 'manual_update'
    source_data JSONB, -- Original raw address data for reference
    
    -- Processing information
    openai_processing_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one normalized address per user (latest wins)
    UNIQUE(user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_normalized_addresses_user_id ON normalized_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_normalized_addresses_source_type ON normalized_addresses(source_type);
CREATE INDEX IF NOT EXISTS idx_normalized_addresses_confidence ON normalized_addresses(confidence_score);

-- Add RLS policies
ALTER TABLE normalized_addresses ENABLE ROW LEVEL SECURITY;

-- Users can view their own normalized addresses
CREATE POLICY "Users can view their own normalized addresses" ON normalized_addresses
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own normalized addresses
CREATE POLICY "Users can update their own normalized addresses" ON normalized_addresses
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own normalized addresses
CREATE POLICY "Users can insert their own normalized addresses" ON normalized_addresses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all normalized addresses
CREATE POLICY "Admins can view all normalized addresses" ON normalized_addresses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur."userId"
            JOIN roles r ON ur."roleId" = r.id
            WHERE u.id = auth.uid() AND r.name IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_normalized_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_normalized_addresses_updated_at
    BEFORE UPDATE ON normalized_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_normalized_addresses_updated_at();

-- Add comment
COMMENT ON TABLE normalized_addresses IS 'Stores OpenAI-normalized address data as single source of truth for user addresses';
