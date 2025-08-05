-- My Account Feature Setup SQL
-- Run these commands in your Supabase SQL Editor

-- 1. Create user_onboarding table
CREATE TABLE IF NOT EXISTS user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  onboardingType VARCHAR(20) NOT NULL CHECK (onboardingType IN ('STUDENT', 'PILOT')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  currentStep INTEGER NOT NULL DEFAULT 1,
  totalSteps INTEGER NOT NULL DEFAULT 5,
  veriffSessionId VARCHAR(255),
  veriffStatus VARCHAR(50),
  paymentPlanId UUID,
  hourPackageId UUID,
  contractSigned BOOLEAN DEFAULT FALSE,
  contractSignedAt TIMESTAMP WITH TIME ZONE,
  contractDocumentUrl TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for user_onboarding
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(userId);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_status ON user_onboarding(status);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_type ON user_onboarding(onboardingType);

-- Enable RLS for user_onboarding
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_onboarding
CREATE POLICY "Users can view own onboarding" ON user_onboarding
  FOR SELECT USING (auth.uid() = userId);

CREATE POLICY "Users can update own onboarding" ON user_onboarding
  FOR UPDATE USING (auth.uid() = userId);

CREATE POLICY "Users can insert own onboarding" ON user_onboarding
  FOR INSERT WITH CHECK (auth.uid() = userId);

CREATE POLICY "Admins can view all onboarding" ON user_onboarding
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.roleId = r.id
      WHERE ur.userId = auth.uid() AND r.name IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- 2. Create user_documents table
CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  documentType VARCHAR(50) NOT NULL CHECK (documentType IN ('PPL_LICENSE', 'MEDICAL_CERTIFICATE', 'RADIO_CERTIFICATE', 'CONTRACT', 'VERIFF_REPORT', 'OTHER')),
  fileName VARCHAR(255) NOT NULL,
  fileUrl TEXT NOT NULL,
  fileSize INTEGER,
  mimeType VARCHAR(100),
  expiryDate DATE,
  documentNumber VARCHAR(100),
  issuingAuthority VARCHAR(255),
  isVerified BOOLEAN DEFAULT FALSE,
  verifiedBy UUID REFERENCES users(id),
  verifiedAt TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
  metadata JSONB,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for user_documents
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(userId);
CREATE INDEX IF NOT EXISTS idx_user_documents_type ON user_documents(documentType);
CREATE INDEX IF NOT EXISTS idx_user_documents_status ON user_documents(status);
CREATE INDEX IF NOT EXISTS idx_user_documents_expiry ON user_documents(expiryDate);

-- Enable RLS for user_documents
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_documents
CREATE POLICY "Users can view own documents" ON user_documents
  FOR SELECT USING (auth.uid() = userId);

CREATE POLICY "Users can insert own documents" ON user_documents
  FOR INSERT WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update own documents" ON user_documents
  FOR UPDATE USING (auth.uid() = userId);

CREATE POLICY "Admins can view all documents" ON user_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.roleId = r.id
      WHERE ur.userId = auth.uid() AND r.name IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- 3. Create payment_plans table
CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  planType VARCHAR(20) NOT NULL CHECK (planType IN ('INSTALLMENT', 'FULL_PAYMENT')),
  totalAmount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'RON',
  numberOfInstallments INTEGER,
  discountPercentage DECIMAL(5,2) DEFAULT 0,
  isActive BOOLEAN DEFAULT TRUE,
  validFrom DATE DEFAULT CURRENT_DATE,
  validTo DATE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for payment_plans
CREATE INDEX IF NOT EXISTS idx_payment_plans_type ON payment_plans(planType);
CREATE INDEX IF NOT EXISTS idx_payment_plans_active ON payment_plans(isActive);

-- Insert default payment plans (only if they don't exist)
INSERT INTO payment_plans (id, name, description, planType, totalAmount, numberOfInstallments, discountPercentage) 
SELECT 
  gen_random_uuid(), 'PPL Course - 4 Installments', 'PPL(A) course payment in 4 equal installments', 'INSTALLMENT', 15000.00, 4, 0
WHERE NOT EXISTS (SELECT 1 FROM payment_plans WHERE name = 'PPL Course - 4 Installments');

INSERT INTO payment_plans (id, name, description, planType, totalAmount, numberOfInstallments, discountPercentage) 
SELECT 
  gen_random_uuid(), 'PPL Course - 2 Installments', 'PPL(A) course payment in 2 installments with 5% discount', 'INSTALLMENT', 14250.00, 2, 5
WHERE NOT EXISTS (SELECT 1 FROM payment_plans WHERE name = 'PPL Course - 2 Installments');

INSERT INTO payment_plans (id, name, description, planType, totalAmount, numberOfInstallments, discountPercentage) 
SELECT 
  gen_random_uuid(), 'PPL Course - Full Payment', 'PPL(A) course full payment with 10% discount', 'FULL_PAYMENT', 13500.00, 1, 10
WHERE NOT EXISTS (SELECT 1 FROM payment_plans WHERE name = 'PPL Course - Full Payment');

-- 4. Create hour_packages table
CREATE TABLE IF NOT EXISTS hour_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  totalHours INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'RON',
  validityDays INTEGER DEFAULT 365,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for hour_packages
CREATE INDEX IF NOT EXISTS idx_hour_packages_active ON hour_packages(isActive);

-- Insert default hour packages (only if they don't exist)
INSERT INTO hour_packages (id, name, description, totalHours, price, validityDays) 
SELECT 
  gen_random_uuid(), '5 Hours Package', '5 flight hours package', 5, 750.00, 365
WHERE NOT EXISTS (SELECT 1 FROM hour_packages WHERE name = '5 Hours Package');

INSERT INTO hour_packages (id, name, description, totalHours, price, validityDays) 
SELECT 
  gen_random_uuid(), '10 Hours Package', '10 flight hours package', 10, 1400.00, 365
WHERE NOT EXISTS (SELECT 1 FROM hour_packages WHERE name = '10 Hours Package');

INSERT INTO hour_packages (id, name, description, totalHours, price, validityDays) 
SELECT 
  gen_random_uuid(), '20 Hours Package', '20 flight hours package', 20, 2600.00, 365
WHERE NOT EXISTS (SELECT 1 FROM hour_packages WHERE name = '20 Hours Package');

INSERT INTO hour_packages (id, name, description, totalHours, price, validityDays) 
SELECT 
  gen_random_uuid(), '50 Hours Package', '50 flight hours package', 50, 6000.00, 365
WHERE NOT EXISTS (SELECT 1 FROM hour_packages WHERE name = '50 Hours Package');

-- 5. Create user_payment_plans table
CREATE TABLE IF NOT EXISTS user_payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paymentPlanId UUID REFERENCES payment_plans(id),
  hourPackageId UUID REFERENCES hour_packages(id),
  smartbillInvoiceId VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
  totalAmount DECIMAL(10,2) NOT NULL,
  paidAmount DECIMAL(10,2) DEFAULT 0,
  nextPaymentDate DATE,
  nextPaymentAmount DECIMAL(10,2),
  completedAt TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for user_payment_plans
CREATE INDEX IF NOT EXISTS idx_user_payment_plans_user_id ON user_payment_plans(userId);
CREATE INDEX IF NOT EXISTS idx_user_payment_plans_status ON user_payment_plans(status);

-- Enable RLS for user_payment_plans
ALTER TABLE user_payment_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_payment_plans
CREATE POLICY "Users can view own payment plans" ON user_payment_plans
  FOR SELECT USING (auth.uid() = userId);

CREATE POLICY "Users can insert own payment plans" ON user_payment_plans
  FOR INSERT WITH CHECK (auth.uid() = userId);

CREATE POLICY "Admins can view all payment plans" ON user_payment_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.roleId = r.id
      WHERE ur.userId = auth.uid() AND r.name IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- 6. Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffData" JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "identityVerified" BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "identityVerifiedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "preferredLanguage" VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(50) DEFAULT 'Europe/Bucharest';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB DEFAULT '{"email": true, "push": true, "sms": false}';

-- 7. Assign PROSPECT role to users without any roles (if PROSPECT role exists)
-- First, let's check if PROSPECT role exists and get its ID
DO $$
DECLARE
    prospect_role_id UUID;
BEGIN
    -- Get the PROSPECT role ID
    SELECT id INTO prospect_role_id FROM roles WHERE name = 'PROSPECT';
    
    -- If PROSPECT role exists, assign it to users without roles
    IF prospect_role_id IS NOT NULL THEN
        INSERT INTO user_roles (id, userId, roleId)
        SELECT 
            gen_random_uuid(),
            u.id,
            prospect_role_id
        FROM users u
        WHERE NOT EXISTS (
            SELECT 1 FROM user_roles ur WHERE ur.userId = u.id
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Assigned PROSPECT role to users without roles';
    ELSE
        RAISE NOTICE 'PROSPECT role not found. Make sure it exists in your roles table.';
    END IF;
END $$;

-- Verification queries
SELECT 'Tables created successfully!' as status;

-- Check if tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('user_onboarding', 'user_documents', 'payment_plans', 'hour_packages', 'user_payment_plans') 
        THEN '✅ Created' 
        ELSE '❌ Missing' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_onboarding', 'user_documents', 'payment_plans', 'hour_packages', 'user_payment_plans');

-- Check payment plans
SELECT name, planType, totalAmount, numberOfInstallments, discountPercentage FROM payment_plans;

-- Check hour packages
SELECT name, totalHours, price, validityDays FROM hour_packages;

-- Check new user columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('veriffData', 'identityVerified', 'identityVerifiedAt', 'onboardingCompleted', 'onboardingCompletedAt', 'preferredLanguage', 'timezone', 'notificationPreferences'); 