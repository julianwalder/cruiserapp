-- Create hour_package_templates table for managing hour packages
CREATE TABLE IF NOT EXISTS hour_package_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hours INTEGER NOT NULL,
    price_per_hour DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    validity_days INTEGER DEFAULT 365,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hour_package_templates_active ON hour_package_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_hour_package_templates_created_by ON hour_package_templates(created_by);

-- Add RLS policies
ALTER TABLE hour_package_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Only super admins can view all templates
CREATE POLICY "Super admins can view all hour package templates" ON hour_package_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur.userId
            JOIN roles r ON ur.roleId = r.id
            WHERE u.id = auth.uid() AND r.name = 'SUPER_ADMIN'
        )
    );

-- Policy: Only super admins can insert templates
CREATE POLICY "Super admins can insert hour package templates" ON hour_package_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur.userId
            JOIN roles r ON ur.roleId = r.id
            WHERE u.id = auth.uid() AND r.name = 'SUPER_ADMIN'
        )
    );

-- Policy: Only super admins can update templates
CREATE POLICY "Super admins can update hour package templates" ON hour_package_templates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur.userId
            JOIN roles r ON ur.roleId = r.id
            WHERE u.id = auth.uid() AND r.name = 'SUPER_ADMIN'
        )
    );

-- Policy: Only super admins can delete templates
CREATE POLICY "Super admins can delete hour package templates" ON hour_package_templates
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur.userId
            JOIN roles r ON ur.roleId = r.id
            WHERE u.id = auth.uid() AND r.name = 'SUPER_ADMIN'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hour_package_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_hour_package_templates_updated_at
    BEFORE UPDATE ON hour_package_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_hour_package_templates_updated_at();

-- Insert some default templates
INSERT INTO hour_package_templates (name, description, hours, price_per_hour, total_price, currency, validity_days) VALUES
('5 Hours Package', '5 flight hours package for beginners', 5, 120.00, 600.00, 'EUR', 365),
('10 Hours Package', '10 flight hours package for regular pilots', 10, 115.00, 1150.00, 'EUR', 365),
('20 Hours Package', '20 flight hours package for frequent flyers', 20, 110.00, 2200.00, 'EUR', 365),
('50 Hours Package', '50 flight hours package for professional pilots', 50, 105.00, 5250.00, 'EUR', 365)
ON CONFLICT DO NOTHING; 