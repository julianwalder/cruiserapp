-- Add orders table for storing order records from microservice
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "packageId" UUID NOT NULL REFERENCES hour_package_templates(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    "totalAmount" DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "paymentMethod" VARCHAR(20) NOT NULL CHECK ("paymentMethod" IN ('proforma', 'fiscal')),
    "microserviceInvoiceId" VARCHAR(255),
    "microserviceId" VARCHAR(255),
    "paymentLink" TEXT,
    "invoiceData" JSONB,
    "microserviceResponse" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders("userId");
CREATE INDEX IF NOT EXISTS idx_orders_package_id ON orders("packageId");
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders("createdAt");
CREATE INDEX IF NOT EXISTS idx_orders_microservice_invoice_id ON orders("microserviceInvoiceId");

-- Add RLS policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own orders
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = "userId");

-- Policy: Users can create their own orders
CREATE POLICY "Users can create their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = "userId");

-- Policy: Users can update their own orders
CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE USING (auth.uid() = "userId");

-- Policy: Admins can view all orders
CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid()
            AND r.name IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Policy: Admins can update all orders
CREATE POLICY "Admins can update all orders" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid()
            AND r.name IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Add trigger to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- Add comments
COMMENT ON TABLE orders IS 'Stores order records from microservice for proforma invoice generation';
COMMENT ON COLUMN orders.id IS 'Unique identifier for the order';
COMMENT ON COLUMN orders."userId" IS 'Reference to the user who placed the order';
COMMENT ON COLUMN orders."packageId" IS 'Reference to the hour package template';
COMMENT ON COLUMN orders.status IS 'Current status of the order';
COMMENT ON COLUMN orders."totalAmount" IS 'Total amount of the order';
COMMENT ON COLUMN orders.currency IS 'Currency of the order amount';
COMMENT ON COLUMN orders."paymentMethod" IS 'Payment method (proforma or fiscal)';
COMMENT ON COLUMN orders."microserviceInvoiceId" IS 'Invoice ID from the microservice';
COMMENT ON COLUMN orders."microserviceId" IS 'Microservice internal ID';
COMMENT ON COLUMN orders."paymentLink" IS 'Payment link URL if generated';
COMMENT ON COLUMN orders."invoiceData" IS 'JSON data sent to microservice';
COMMENT ON COLUMN orders."microserviceResponse" IS 'JSON response from microservice';
COMMENT ON COLUMN orders."createdAt" IS 'Timestamp when order was created';
COMMENT ON COLUMN orders."updatedAt" IS 'Timestamp when order was last updated';
