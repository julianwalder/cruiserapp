-- SmartBill Invoices Database Setup
-- This script creates the necessary tables for storing imported SmartBill invoices

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    smartbill_id VARCHAR(50) UNIQUE, -- SmartBill invoice number (e.g., CA0766)
    series VARCHAR(10) NOT NULL, -- Invoice series (e.g., CA)
    number VARCHAR(50) NOT NULL, -- Invoice number
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'imported', -- imported, paid, overdue, etc.
    total_amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RON',
    xml_content TEXT NOT NULL, -- Original XML content
    import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice_clients table (separate from users for flexibility)
CREATE TABLE IF NOT EXISTS invoice_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    vat_code VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Romania',
    user_id UUID REFERENCES users(id), -- Link to existing user if found by email
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    line_id INTEGER NOT NULL, -- Invoice line ID (1, 2, 3, etc.)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,4) NOT NULL,
    unit VARCHAR(10) NOT NULL, -- HUR (hours), C62 (pieces), etc.
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 19.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create flight_hours table to track flight time from invoices
CREATE TABLE IF NOT EXISTS flight_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    invoice_item_id UUID REFERENCES invoice_items(id) ON DELETE CASCADE,
    flight_date DATE NOT NULL, -- Use invoice issue date as flight date
    hours_regular DECIMAL(5,2) DEFAULT 0, -- Regular flight hours
    hours_promotional DECIMAL(5,2) DEFAULT 0, -- Promotional/free hours
    total_hours DECIMAL(5,2) NOT NULL,
    rate_per_hour DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_smartbill_id ON invoices(smartbill_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_clients_email ON invoice_clients(email);
CREATE INDEX IF NOT EXISTS idx_invoice_clients_user_id ON invoice_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_flight_hours_user_id ON flight_hours(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_hours_flight_date ON flight_hours(flight_date);
CREATE INDEX IF NOT EXISTS idx_flight_hours_invoice_id ON flight_hours(invoice_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_hours ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view invoices where they are the client
CREATE POLICY "Users can view their own invoices" ON invoices
    FOR SELECT USING (
        id IN (
            SELECT invoice_id FROM invoice_clients 
            WHERE user_id = auth.uid()
        )
    );

-- Users can view their own invoice clients
CREATE POLICY "Users can view their own invoice clients" ON invoice_clients
    FOR SELECT USING (user_id = auth.uid());

-- Users can view their own invoice items
CREATE POLICY "Users can view their own invoice items" ON invoice_items
    FOR SELECT USING (
        invoice_id IN (
            SELECT invoice_id FROM invoice_clients 
            WHERE user_id = auth.uid()
        )
    );

-- Users can view their own flight hours
CREATE POLICY "Users can view their own flight hours" ON flight_hours
    FOR SELECT USING (user_id = auth.uid());

-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices" ON invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all invoice clients" ON invoice_clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all invoice items" ON invoice_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all flight hours" ON flight_hours
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert policies for admins
CREATE POLICY "Admins can insert invoices" ON invoices
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert invoice clients" ON invoice_clients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert invoice items" ON invoice_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert flight hours" ON flight_hours
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update policies for admins
CREATE POLICY "Admins can update invoices" ON invoices
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update invoice clients" ON invoice_clients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update invoice items" ON invoice_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update flight hours" ON flight_hours
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Delete policies for admins
CREATE POLICY "Admins can delete invoices" ON invoices
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete invoice clients" ON invoice_clients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete invoice items" ON invoice_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete flight hours" ON flight_hours
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    ); 