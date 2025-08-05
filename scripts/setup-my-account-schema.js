const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupMyAccountSchema() {
  console.log('🚀 Setting up My Account feature schema...');

  try {
    // 1. Create user_onboarding table
    console.log('📝 Creating user_onboarding table...');
    const { error: onboardingTableError } = await supabase.rpc('exec_sql', {
      sql: `
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

        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(userId);
        CREATE INDEX IF NOT EXISTS idx_user_onboarding_status ON user_onboarding(status);
        CREATE INDEX IF NOT EXISTS idx_user_onboarding_type ON user_onboarding(onboardingType);

        -- Add RLS policies
        ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

        -- Users can only see their own onboarding
        CREATE POLICY "Users can view own onboarding" ON user_onboarding
          FOR SELECT USING (auth.uid() = userId);

        -- Users can update their own onboarding
        CREATE POLICY "Users can update own onboarding" ON user_onboarding
          FOR UPDATE USING (auth.uid() = userId);

        -- Users can insert their own onboarding
        CREATE POLICY "Users can insert own onboarding" ON user_onboarding
          FOR INSERT WITH CHECK (auth.uid() = userId);

        -- Admins can see all onboarding
        CREATE POLICY "Admins can view all onboarding" ON user_onboarding
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM user_roles ur
              JOIN roles r ON ur.roleId = r.id
              WHERE ur.userId = auth.uid() AND r.name IN ('SUPER_ADMIN', 'ADMIN')
            )
          );
      `
    });

    if (onboardingTableError) {
      console.error('❌ Error creating user_onboarding table:', onboardingTableError);
      return;
    }
    console.log('✅ user_onboarding table created');

    // 2. Create user_documents table
    console.log('📝 Creating user_documents table...');
    const { error: documentsTableError } = await supabase.rpc('exec_sql', {
      sql: `
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

        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(userId);
        CREATE INDEX IF NOT EXISTS idx_user_documents_type ON user_documents(documentType);
        CREATE INDEX IF NOT EXISTS idx_user_documents_status ON user_documents(status);
        CREATE INDEX IF NOT EXISTS idx_user_documents_expiry ON user_documents(expiryDate);

        -- Add RLS policies
        ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

        -- Users can only see their own documents
        CREATE POLICY "Users can view own documents" ON user_documents
          FOR SELECT USING (auth.uid() = userId);

        -- Users can insert their own documents
        CREATE POLICY "Users can insert own documents" ON user_documents
          FOR INSERT WITH CHECK (auth.uid() = userId);

        -- Users can update their own documents
        CREATE POLICY "Users can update own documents" ON user_documents
          FOR UPDATE USING (auth.uid() = userId);

        -- Admins can see all documents
        CREATE POLICY "Admins can view all documents" ON user_documents
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM user_roles ur
              JOIN roles r ON ur.roleId = r.id
              WHERE ur.userId = auth.uid() AND r.name IN ('SUPER_ADMIN', 'ADMIN')
            )
          );
      `
    });

    if (documentsTableError) {
      console.error('❌ Error creating user_documents table:', documentsTableError);
      return;
    }
    console.log('✅ user_documents table created');

    // 3. Create payment_plans table
    console.log('📝 Creating payment_plans table...');
    const { error: paymentPlansTableError } = await supabase.rpc('exec_sql', {
      sql: `
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

        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_payment_plans_type ON payment_plans(planType);
        CREATE INDEX IF NOT EXISTS idx_payment_plans_active ON payment_plans(isActive);

        -- Insert default payment plans (only if table is empty)
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
      `
    });

    if (paymentPlansTableError) {
      console.error('❌ Error creating payment_plans table:', paymentPlansTableError);
      return;
    }
    console.log('✅ payment_plans table created');

    // 4. Create hour_packages table
    console.log('📝 Creating hour_packages table...');
    const { error: hourPackagesTableError } = await supabase.rpc('exec_sql', {
      sql: `
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

        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_hour_packages_active ON hour_packages(isActive);

        -- Insert default hour packages (only if table is empty)
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
      `
    });

    if (hourPackagesTableError) {
      console.error('❌ Error creating hour_packages table:', hourPackagesTableError);
      return;
    }
    console.log('✅ hour_packages table created');

    // 5. Create user_payment_plans table
    console.log('📝 Creating user_payment_plans table...');
    const { error: userPaymentPlansTableError } = await supabase.rpc('exec_sql', {
      sql: `
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

        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_user_payment_plans_user_id ON user_payment_plans(userId);
        CREATE INDEX IF NOT EXISTS idx_user_payment_plans_status ON user_payment_plans(status);

        -- Add RLS policies
        ALTER TABLE user_payment_plans ENABLE ROW LEVEL SECURITY;

        -- Users can only see their own payment plans
        CREATE POLICY "Users can view own payment plans" ON user_payment_plans
          FOR SELECT USING (auth.uid() = userId);

        -- Users can insert their own payment plans
        CREATE POLICY "Users can insert own payment plans" ON user_payment_plans
          FOR INSERT WITH CHECK (auth.uid() = userId);

        -- Admins can see all payment plans
        CREATE POLICY "Admins can view all payment plans" ON user_payment_plans
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM user_roles ur
              JOIN roles r ON ur.roleId = r.id
              WHERE ur.userId = auth.uid() AND r.name IN ('SUPER_ADMIN', 'ADMIN')
            )
          );
      `
    });

    if (userPaymentPlansTableError) {
      console.error('❌ Error creating user_payment_plans table:', userPaymentPlansTableError);
      return;
    }
    console.log('✅ user_payment_plans table created');

    // 6. Add new columns to users table
    console.log('📝 Adding new columns to users table...');
    const { error: alterUsersError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add new columns for My Account feature (only if they don't exist)
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffData" JSONB;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "identityVerified" BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "identityVerifiedAt" TIMESTAMP WITH TIME ZONE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP WITH TIME ZONE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "preferredLanguage" VARCHAR(10) DEFAULT 'en';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(50) DEFAULT 'Europe/Bucharest';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB DEFAULT '{"email": true, "push": true, "sms": false}';
      `
    });

    if (alterUsersError) {
      console.error('❌ Error adding columns to users table:', alterUsersError);
      return;
    }
    console.log('✅ New columns added to users table');

    // 7. Check if PROSPECT role exists and assign to users without roles
    console.log('📝 Checking PROSPECT role and updating users...');
    const { data: prospectRole, error: getProspectError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'PROSPECT')
      .single();

    if (getProspectError) {
      console.log('⚠️  PROSPECT role not found. Make sure it exists in your roles table.');
      console.log('   You can create it manually or the onboarding will handle role assignment.');
    } else {
      // Update users without any roles to have PROSPECT role
      const { error: updateUsersError } = await supabase.rpc('exec_sql', {
        sql: `
          INSERT INTO user_roles (id, userId, roleId)
          SELECT 
            gen_random_uuid(),
            u.id,
            '${prospectRole.id}'
          FROM users u
          WHERE NOT EXISTS (
            SELECT 1 FROM user_roles ur WHERE ur.userId = u.id
          )
          ON CONFLICT DO NOTHING;
        `
      });

      if (updateUsersError) {
        console.error('❌ Error updating users with PROSPECT role:', updateUsersError);
      } else {
        console.log('✅ Users without roles updated with PROSPECT role');
      }
    }

    console.log('🎉 My Account feature schema setup completed successfully!');
    console.log('');
    console.log('📋 Summary of what was created:');
    console.log('   ✅ user_onboarding table - for tracking onboarding progress');
    console.log('   ✅ user_documents table - for document management');
    console.log('   ✅ payment_plans table - with default PPL course plans');
    console.log('   ✅ hour_packages table - with default aircraft rental packages');
    console.log('   ✅ user_payment_plans table - for tracking user payments');
    console.log('   ✅ New user columns - for My Account features');
    console.log('');
    console.log('🚀 You can now test the My Account feature!');
    console.log('   - Visit /test-my-account for a demo with mock data');
    console.log('   - Visit /my-account for the full feature (requires authentication)');

  } catch (error) {
    console.error('❌ Error setting up My Account schema:', error);
  }
}

// Run the setup
setupMyAccountSchema(); 