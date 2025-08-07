-- My Account Feature Setup - Separate Table Approach
-- This script sets up the My Account feature using a separate user_profile table
-- instead of adding columns to the existing users table

-- 1. Create user_profile table for My Account specific data
CREATE TABLE IF NOT EXISTS user_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    veriffData JSONB,
    identityVerified BOOLEAN DEFAULT FALSE,
    identityVerifiedAt TIMESTAMP WITH TIME ZONE,
    onboardingCompleted BOOLEAN DEFAULT FALSE,
    onboardingCompletedAt TIMESTAMP WITH TIME ZONE,
    preferredLanguage VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'Europe/Bucharest',
    notificationPreferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (userId)
);

-- 2. Create user_onboarding table for tracking onboarding progress
CREATE TABLE IF NOT EXISTS user_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    targetRole VARCHAR(50) NOT NULL CHECK (targetRole IN ('STUDENT', 'PILOT')),
    currentStep INTEGER DEFAULT 1,
    totalSteps INTEGER DEFAULT 4,
    stepsCompleted JSONB DEFAULT '[]'::jsonb,
    rulesAccepted BOOLEAN DEFAULT FALSE,
    paymentPlanSelected VARCHAR(100),
    hourPackageSelected VARCHAR(100),
    identityVerificationStarted BOOLEAN DEFAULT FALSE,
    identityVerificationCompleted BOOLEAN DEFAULT FALSE,
    contractGenerated BOOLEAN DEFAULT FALSE,
    contractSigned BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
    startedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completedAt TIMESTAMP WITH TIME ZONE,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (userId, targetRole)
);

-- 3. Create user_documents table for document management
CREATE TABLE IF NOT EXISTS user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    documentType VARCHAR(50) NOT NULL CHECK (documentType IN ('PPL_LICENSE', 'MEDICAL_CERTIFICATE', 'RADIO_CERTIFICATE', 'CONTRACT', 'VERIFF_REPORT', 'OTHER')),
    fileName VARCHAR(255) NOT NULL,
    filePath VARCHAR(500) NOT NULL,
    fileSize INTEGER,
    mimeType VARCHAR(100),
    documentNumber VARCHAR(100),
    issuingAuthority VARCHAR(100),
    issueDate DATE,
    expiryDate DATE,
    isVerified BOOLEAN DEFAULT FALSE,
    verifiedBy UUID REFERENCES users(id),
    verifiedAt TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
    notes TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create payment_plans table for student payment options
CREATE TABLE IF NOT EXISTS payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    totalAmount DECIMAL(10,2) NOT NULL,
    numberOfInstallments INTEGER NOT NULL,
    discountPercentage DECIMAL(5,2) DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create hour_packages table for pilot hour packages
CREATE TABLE IF NOT EXISTS hour_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    numberOfHours INTEGER NOT NULL,
    pricePerHour DECIMAL(10,2) NOT NULL,
    totalPrice DECIMAL(10,2) NOT NULL,
    discountPercentage DECIMAL(5,2) DEFAULT 0,
    validityDays INTEGER DEFAULT 365,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create user_payment_plans table for linking users to their selected plans
CREATE TABLE IF NOT EXISTS user_payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paymentPlanId UUID REFERENCES payment_plans(id),
    hourPackageId UUID REFERENCES hour_packages(id),
    planType VARCHAR(20) NOT NULL CHECK (planType IN ('PAYMENT_PLAN', 'HOUR_PACKAGE')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    startDate DATE NOT NULL,
    endDate DATE,
    totalAmount DECIMAL(10,2) NOT NULL,
    amountPaid DECIMAL(10,2) DEFAULT 0,
    remainingAmount DECIMAL(10,2) NOT NULL,
    nextPaymentDate DATE,
    contractDocumentId UUID REFERENCES user_documents(id),
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (planType = 'PAYMENT_PLAN' AND paymentPlanId IS NOT NULL AND hourPackageId IS NULL) OR
        (planType = 'HOUR_PACKAGE' AND hourPackageId IS NOT NULL AND paymentPlanId IS NULL)
    )
);

-- 7. Insert default payment plans (only if they don't exist)
INSERT INTO payment_plans (name, description, totalAmount, numberOfInstallments, discountPercentage)
VALUES 
    ('4 Installments', 'Pay in 4 equal installments', 5000.00, 4, 0.00)
ON CONFLICT (name) DO NOTHING;

INSERT INTO payment_plans (name, description, totalAmount, numberOfInstallments, discountPercentage)
VALUES 
    ('2 Installments', 'Pay in 2 installments with 5% discount', 5000.00, 2, 5.00)
ON CONFLICT (name) DO NOTHING;

INSERT INTO payment_plans (name, description, totalAmount, numberOfInstallments, discountPercentage)
VALUES 
    ('Full Payment', 'Pay in full with 10% discount', 5000.00, 1, 10.00)
ON CONFLICT (name) DO NOTHING;

-- 8. Insert default hour packages (only if they don't exist)
INSERT INTO hour_packages (name, description, numberOfHours, pricePerHour, totalPrice, discountPercentage, validityDays)
VALUES 
    ('5 Hours Package', '5 hours of aircraft rental', 150.00, 150.00, 750.00, 0.00, 365)
ON CONFLICT (name) DO NOTHING;

INSERT INTO hour_packages (name, description, numberOfHours, pricePerHour, totalPrice, discountPercentage, validityDays)
VALUES 
    ('10 Hours Package', '10 hours of aircraft rental with 5% discount', 142.50, 150.00, 1425.00, 5.00, 365)
ON CONFLICT (name) DO NOTHING;

INSERT INTO hour_packages (name, description, numberOfHours, pricePerHour, totalPrice, discountPercentage, validityDays)
VALUES 
    ('20 Hours Package', '20 hours of aircraft rental with 10% discount', 135.00, 150.00, 2700.00, 10.00, 365)
ON CONFLICT (name) DO NOTHING;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(userId);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(userId);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_status ON user_onboarding(status);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(userId);
CREATE INDEX IF NOT EXISTS idx_user_documents_type ON user_documents(documentType);
CREATE INDEX IF NOT EXISTS idx_user_documents_expiry ON user_documents(expiryDate);
CREATE INDEX IF NOT EXISTS idx_user_payment_plans_user_id ON user_payment_plans(userId);
CREATE INDEX IF NOT EXISTS idx_user_payment_plans_status ON user_payment_plans(status);

-- 10. Enable Row Level Security (RLS)
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payment_plans ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies for user_profile
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profile;
CREATE POLICY "Users can view their own profile" ON user_profile
    FOR SELECT USING (auth.uid() = userId);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profile;
CREATE POLICY "Users can update their own profile" ON user_profile
    FOR UPDATE USING (auth.uid() = userId);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profile;
CREATE POLICY "Users can insert their own profile" ON user_profile
    FOR INSERT WITH CHECK (auth.uid() = userId);

-- 12. Create RLS policies for user_onboarding
DROP POLICY IF EXISTS "Users can view their own onboarding" ON user_onboarding;
CREATE POLICY "Users can view their own onboarding" ON user_onboarding
    FOR SELECT USING (auth.uid() = userId);

DROP POLICY IF EXISTS "Users can update their own onboarding" ON user_onboarding;
CREATE POLICY "Users can update their own onboarding" ON user_onboarding
    FOR UPDATE USING (auth.uid() = userId);

DROP POLICY IF EXISTS "Users can insert their own onboarding" ON user_onboarding;
CREATE POLICY "Users can insert their own onboarding" ON user_onboarding
    FOR INSERT WITH CHECK (auth.uid() = userId);

-- 13. Create RLS policies for user_documents
DROP POLICY IF EXISTS "Users can view their own documents" ON user_documents;
CREATE POLICY "Users can view their own documents" ON user_documents
    FOR SELECT USING (auth.uid() = userId);

DROP POLICY IF EXISTS "Users can update their own documents" ON user_documents;
CREATE POLICY "Users can update their own documents" ON user_documents
    FOR UPDATE USING (auth.uid() = userId);

DROP POLICY IF EXISTS "Users can insert their own documents" ON user_documents;
CREATE POLICY "Users can insert their own documents" ON user_documents
    FOR INSERT WITH CHECK (auth.uid() = userId);

DROP POLICY IF EXISTS "Users can delete their own documents" ON user_documents;
CREATE POLICY "Users can delete their own documents" ON user_documents
    FOR DELETE USING (auth.uid() = userId);

-- 14. Create RLS policies for user_payment_plans
DROP POLICY IF EXISTS "Users can view their own payment plans" ON user_payment_plans;
CREATE POLICY "Users can view their own payment plans" ON user_payment_plans
    FOR SELECT USING (auth.uid() = userId);

DROP POLICY IF EXISTS "Users can update their own payment plans" ON user_payment_plans;
CREATE POLICY "Users can update their own payment plans" ON user_payment_plans
    FOR UPDATE USING (auth.uid() = userId);

DROP POLICY IF EXISTS "Users can insert their own payment plans" ON user_payment_plans;
CREATE POLICY "Users can insert their own payment plans" ON user_payment_plans
    FOR INSERT WITH CHECK (auth.uid() = userId);

-- 15. Create RLS policies for payment_plans and hour_packages (read-only for all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view payment plans" ON payment_plans;
CREATE POLICY "Authenticated users can view payment plans" ON payment_plans
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view hour packages" ON hour_packages;
CREATE POLICY "Authenticated users can view hour packages" ON hour_packages
    FOR SELECT USING (auth.role() = 'authenticated');

-- 16. Create function to automatically create user_profile when user is created
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profile (userId)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Create trigger to automatically create user_profile
DROP TRIGGER IF EXISTS trigger_create_user_profile ON users;
CREATE TRIGGER trigger_create_user_profile
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- 18. Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 19. Create triggers for updatedAt
DROP TRIGGER IF EXISTS update_user_profile_updated_at ON user_profile;
CREATE TRIGGER update_user_profile_updated_at
    BEFORE UPDATE ON user_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_onboarding_updated_at ON user_onboarding;
CREATE TRIGGER update_user_onboarding_updated_at
    BEFORE UPDATE ON user_onboarding
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_documents_updated_at ON user_documents;
CREATE TRIGGER update_user_documents_updated_at
    BEFORE UPDATE ON user_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_payment_plans_updated_at ON user_payment_plans;
CREATE TRIGGER update_user_payment_plans_updated_at
    BEFORE UPDATE ON user_payment_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 20. Create user_profile records for existing users (if any don't have one)
INSERT INTO user_profile (userId)
SELECT u.id
FROM users u
LEFT JOIN user_profile up ON u.id = up.userId
WHERE up.userId IS NULL;

-- 21. Assign PROSPECT role to users without any roles (if PROSPECT role exists)
DO $$
DECLARE
    prospect_role_id UUID;
BEGIN
    -- Get PROSPECT role ID
    SELECT id INTO prospect_role_id FROM roles WHERE name = 'PROSPECT';
    
    -- If PROSPECT role exists, assign it to users without roles
    IF prospect_role_id IS NOT NULL THEN
        INSERT INTO user_roles (id, "userId", "roleId")
        SELECT 
            gen_random_uuid(),
            u.id,
            prospect_role_id
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur."userId"
        WHERE ur."userId" IS NULL;
        
        RAISE NOTICE 'Assigned PROSPECT role to users without roles';
    ELSE
        RAISE NOTICE 'PROSPECT role not found, skipping role assignment';
    END IF;
END $$;

-- 22. Create view for easy user data access
CREATE OR REPLACE VIEW user_with_profile AS
SELECT 
    u.*,
    up.veriffData,
    up.identityVerified,
    up.identityVerifiedAt,
    up.onboardingCompleted,
    up.onboardingCompletedAt,
    up.preferredLanguage,
    up.timezone,
    up.notificationPreferences
FROM users u
LEFT JOIN user_profile up ON u.id = up.userId;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'My Account feature setup completed successfully!';
    RAISE NOTICE 'Created tables: user_profile, user_onboarding, user_documents, payment_plans, hour_packages, user_payment_plans';
    RAISE NOTICE 'Added RLS policies and triggers for automatic profile creation';
    RAISE NOTICE 'Created user_with_profile view for easy data access';
END $$; 

-- Create hour_package_templates table
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
      JOIN user_roles ur ON u.id = ur."userId"
      JOIN roles r ON ur."roleId" = r.id
      WHERE u.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

-- Policy: Only super admins can insert templates
CREATE POLICY "Super admins can insert hour package templates" ON hour_package_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur."userId"
      JOIN roles r ON ur."roleId" = r.id
      WHERE u.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

-- Policy: Only super admins can update templates
CREATE POLICY "Super admins can update hour package templates" ON hour_package_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur."userId"
      JOIN roles r ON ur."roleId" = r.id
      WHERE u.id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
  );

-- Policy: Only super admins can delete templates
CREATE POLICY "Super admins can delete hour package templates" ON hour_package_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur."userId"
      JOIN roles r ON ur."roleId" = r.id
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

-- Insert default hour package templates
INSERT INTO hour_package_templates (name, description, hours, price_per_hour, total_price, currency, validity_days, is_active) VALUES
('5 Hours Package', '5 flight hours package for beginners', 5, 120.00, 600.00, 'EUR', 365, true),
('10 Hours Package', '10 flight hours package for regular pilots', 10, 115.00, 1150.00, 'EUR', 365, true),
('20 Hours Package', '20 flight hours package for frequent flyers', 20, 110.00, 2200.00, 'EUR', 365, true),
('50 Hours Package', '50 flight hours package for professional pilots', 50, 105.00, 5250.00, 'EUR', 365, true)
ON CONFLICT DO NOTHING; 