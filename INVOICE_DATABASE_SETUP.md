# SmartBill Invoice Database Setup

This guide will help you set up the database tables for storing SmartBill invoices with proper relationships to users and flight data.

## Prerequisites

- Access to your Supabase project dashboard
- Admin privileges on your Supabase database

## Setup Steps

### 1. Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to the "SQL Editor" section
3. Create a new query

### 2. Execute the Database Setup SQL

Copy and paste the following SQL into the SQL Editor and execute it:

```sql
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
```

### 3. Enable Row Level Security (RLS)

Execute the following SQL to enable RLS and create policies:

```sql
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
```

### 4. Verify Setup

After executing the SQL, you should see the following tables in your Supabase dashboard:

- `invoices` - Main invoice records
- `invoice_clients` - Client information linked to invoices
- `invoice_items` - Individual line items from invoices
- `flight_hours` - Flight hours extracted from invoices

## Database Schema Overview

### invoices Table
- Stores the main invoice information
- Links to SmartBill invoice numbers
- Contains totals, dates, and status

### invoice_clients Table
- Stores client information from invoices
- Links to existing users via email
- Contains contact and address details

### invoice_items Table
- Stores individual line items from invoices
- Links to invoices via foreign key
- Contains quantities, prices, and descriptions

### flight_hours Table
- Extracts flight hours from invoice items
- Links to users and invoices
- Tracks regular vs promotional hours

## Next Steps

After setting up the database:

1. **Test the XML Import**: Try importing your SmartBill XML invoice
2. **Verify User Linking**: Check that invoices are properly linked to users by email
3. **Review Flight Hours**: Ensure flight hours are correctly extracted and categorized
4. **Test Permissions**: Verify that users can only see their own invoices

## Troubleshooting

If you encounter issues:

1. **Check RLS Policies**: Ensure Row Level Security is properly configured
2. **Verify Foreign Keys**: Make sure all foreign key relationships are correct
3. **Test Permissions**: Confirm that admin users can access all data
4. **Check Indexes**: Verify that performance indexes are created

The database is now ready to store and manage SmartBill invoices with proper user relationships and flight hour tracking! 