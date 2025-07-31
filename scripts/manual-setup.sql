-- Manual Setup Script for Company-User Relationship Tables
-- Run this in your Supabase SQL Editor

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    vat_code VARCHAR(50) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Romania',
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_company_relationships table
CREATE TABLE IF NOT EXISTS user_company_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'employee',
    is_primary BOOLEAN DEFAULT false,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- Add company_id column to invoice_clients if it doesn't exist
ALTER TABLE invoice_clients 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Add company_id column to flight_hours if it doesn't exist
ALTER TABLE flight_hours 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_vat_code ON companies(vat_code);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_user_company_relationships_user_id ON user_company_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_relationships_company_id ON user_company_relationships(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_clients_company_id ON invoice_clients(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_clients_vat_code ON invoice_clients(vat_code);
CREATE INDEX IF NOT EXISTS idx_flight_hours_company_id ON flight_hours(company_id);

-- Enable Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_relationships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for companies
CREATE POLICY "Users can view companies they are associated with" ON companies
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM user_company_relationships 
            WHERE user_id = auth.uid()::text
        )
    );

-- Create RLS policies for user_company_relationships
CREATE POLICY "Users can view their own company relationships" ON user_company_relationships
    FOR SELECT USING (user_id = auth.uid()::text);

-- Admins can view all data
CREATE POLICY "Admins can view all companies" ON companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND status = 'ACTIVE'
            AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur."roleId" = r.id
                WHERE ur."userId" = auth.uid()::text AND r.name IN ('ADMIN', 'SUPER_ADMIN')
            )
        )
    );

CREATE POLICY "Admins can view all user company relationships" ON user_company_relationships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND status = 'ACTIVE'
            AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur."roleId" = r.id
                WHERE ur."userId" = auth.uid()::text AND r.name IN ('ADMIN', 'SUPER_ADMIN')
            )
        )
    );

-- Insert policies for admins
CREATE POLICY "Admins can insert companies" ON companies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND status = 'ACTIVE'
            AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur."roleId" = r.id
                WHERE ur."userId" = auth.uid()::text AND r.name IN ('ADMIN', 'SUPER_ADMIN')
            )
        )
    );

CREATE POLICY "Admins can insert user company relationships" ON user_company_relationships
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND status = 'ACTIVE'
            AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur."roleId" = r.id
                WHERE ur."userId" = auth.uid()::text AND r.name IN ('ADMIN', 'SUPER_ADMIN')
            )
        )
    );

-- Service role can manage all data (for API operations)
CREATE POLICY "Service role can manage all data" ON companies
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all data" ON user_company_relationships
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON companies TO anon, authenticated;
GRANT ALL ON user_company_relationships TO anon, authenticated;

-- Display completion message
SELECT 'Company-User relationship tables setup completed successfully!' as status; 