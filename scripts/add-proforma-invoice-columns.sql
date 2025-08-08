-- Add proforma invoice columns to invoices table
-- This script adds the necessary columns to support proforma invoice generation

-- Add user_id column to link invoices to users
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES users(id);

-- Add package_id column to link invoices to hour packages
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "package_id" UUID REFERENCES hour_package_templates(id);

-- Add payment_method column to distinguish between proforma and fiscal invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(20) DEFAULT 'fiscal' CHECK ("payment_method" IN ('proforma', 'fiscal'));

-- Add payment_link column to store generated payment links
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "payment_link" TEXT;

-- Add payment_status column to track payment status
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(20) DEFAULT 'pending' CHECK ("payment_status" IN ('pending', 'paid', 'failed', 'cancelled'));

-- Add payment_date column to track when payment was received
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "payment_date" TIMESTAMP WITH TIME ZONE;

-- Add payment_reference column to store payment provider reference
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "payment_reference" VARCHAR(255);

-- Add company_id column to invoice_clients table if it doesn't exist
ALTER TABLE invoice_clients ADD COLUMN IF NOT EXISTS "company_id" UUID REFERENCES companies(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices("user_id");
CREATE INDEX IF NOT EXISTS idx_invoices_package_id ON invoices("package_id");
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method ON invoices("payment_method");
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices("payment_status");
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices("created_at");

-- Add comments for documentation
COMMENT ON COLUMN invoices."user_id" IS 'User who ordered the hour package';
COMMENT ON COLUMN invoices."package_id" IS 'Hour package template that was ordered';
COMMENT ON COLUMN invoices."payment_method" IS 'Type of invoice: proforma or fiscal';
COMMENT ON COLUMN invoices."payment_link" IS 'Generated payment link for the invoice';
COMMENT ON COLUMN invoices."payment_status" IS 'Current payment status of the invoice';
COMMENT ON COLUMN invoices."payment_date" IS 'Date when payment was received';
COMMENT ON COLUMN invoices."payment_reference" IS 'Payment provider reference number';
COMMENT ON COLUMN invoice_clients."company_id" IS 'Company associated with the client (if any)';

-- Create a function to update payment status
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update payment_date when status changes to 'paid'
    IF NEW."payment_status" = 'paid' AND OLD."payment_status" != 'paid' THEN
        NEW."payment_date" = NOW();
    END IF;
    
    -- Update updated_at timestamp
    NEW."updated_at" = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update payment status
CREATE TRIGGER trigger_update_invoice_payment_status
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- Create a view for proforma invoices
CREATE OR REPLACE VIEW proforma_invoices_view AS
SELECT 
    i.id,
    i.smartbill_id,
    i.series,
    i.number,
    i.issue_date,
    i.due_date,
    i.status,
    i.total_amount,
    i.currency,
    i.vat_amount,
    i.payment_method,
    i.payment_link,
    i.payment_status,
    i.payment_date,
    i.payment_reference,
    i.user_id,
    i.package_id,
    i.created_at,
    i.updated_at,
    -- User information
    u."firstName" as user_first_name,
    u."lastName" as user_last_name,
    u.email as user_email,
    u.phone as user_phone,
    -- Package information
    hpt.name as package_name,
    hpt.hours as package_hours,
    hpt.price_per_hour as package_price_per_hour,
    hpt.validity_days as package_validity_days,
    -- Client information
    ic.name as client_name,
    ic.email as client_email,
    ic.phone as client_phone,
    ic.address as client_address,
    ic.city as client_city,
    ic.country as client_country,
    ic.vat_code as client_vat_code,
    ic.company_id as client_company_id
FROM invoices i
LEFT JOIN users u ON i.user_id = u.id
LEFT JOIN hour_package_templates hpt ON i.package_id = hpt.id
LEFT JOIN invoice_clients ic ON i.id = ic.invoice_id
WHERE i.payment_method = 'proforma';

-- Create a view for fiscal invoices
CREATE OR REPLACE VIEW fiscal_invoices_view AS
SELECT 
    i.id,
    i.smartbill_id,
    i.series,
    i.number,
    i.issue_date,
    i.due_date,
    i.status,
    i.total_amount,
    i.currency,
    i.vat_amount,
    i.payment_method,
    i.payment_link,
    i.payment_status,
    i.payment_date,
    i.payment_reference,
    i.user_id,
    i.package_id,
    i.created_at,
    i.updated_at,
    -- User information
    u."firstName" as user_first_name,
    u."lastName" as user_last_name,
    u.email as user_email,
    u.phone as user_phone,
    -- Package information
    hpt.name as package_name,
    hpt.hours as package_hours,
    hpt.price_per_hour as package_price_per_hour,
    hpt.validity_days as package_validity_days,
    -- Client information
    ic.name as client_name,
    ic.email as client_email,
    ic.phone as client_phone,
    ic.address as client_address,
    ic.city as client_city,
    ic.country as client_country,
    ic.vat_code as client_vat_code,
    ic.company_id as client_company_id
FROM invoices i
LEFT JOIN users u ON i.user_id = u.id
LEFT JOIN hour_package_templates hpt ON i.package_id = hpt.id
LEFT JOIN invoice_clients ic ON i.id = ic.invoice_id
WHERE i.payment_method = 'fiscal';

-- Add RLS policies for the new columns
-- Policy: Users can view their own invoices
CREATE POLICY "Users can view their own invoices" ON invoices
    FOR SELECT USING (
        auth.uid() = "user_id" OR
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur.userId
            JOIN roles r ON ur.roleId = r.id
            WHERE u.id = auth.uid() AND r.name IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Policy: Users can insert their own invoices
CREATE POLICY "Users can insert their own invoices" ON invoices
    FOR INSERT WITH CHECK (
        auth.uid() = "user_id" OR
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur.userId
            JOIN roles r ON ur.roleId = r.id
            WHERE u.id = auth.uid() AND r.name IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Policy: Users can update their own invoices
CREATE POLICY "Users can update their own invoices" ON invoices
    FOR UPDATE USING (
        auth.uid() = "user_id" OR
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur.userId
            JOIN roles r ON ur.roleId = r.id
            WHERE u.id = auth.uid() AND r.name IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Grant permissions on views
GRANT SELECT ON proforma_invoices_view TO authenticated;
GRANT SELECT ON fiscal_invoices_view TO authenticated;
