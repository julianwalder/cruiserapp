#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL environment variable is required');
  console.error('Please check your .env.local file');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🚀 Setting up Hour Package Templates...\n');

  try {
    // Check if table already exists
    const { data: existingTable, error: tableError } = await supabase
      .from('hour_package_templates')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.log('📋 Creating hour_package_templates table...');
      
      // Create the table using SQL
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
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
        `
      });

      if (createError) {
        console.error('❌ Error creating table:', createError);
        return;
      }

      console.log('✅ Hour package templates table created successfully');
    } else {
      console.log('✅ Hour package templates table already exists');
    }

    // Check if default templates exist
    const { data: existingTemplates, error: templatesError } = await supabase
      .from('hour_package_templates')
      .select('id, name');

    if (templatesError) {
      console.error('❌ Error checking existing templates:', templatesError);
      return;
    }

    if (!existingTemplates || existingTemplates.length === 0) {
      console.log('📦 Inserting default hour package templates...');
      
      const defaultTemplates = [
        {
          name: '5 Hours Package',
          description: '5 flight hours package for beginners',
          hours: 5,
          price_per_hour: 120.00,
          total_price: 600.00,
          currency: 'EUR',
          validity_days: 365,
          is_active: true
        },
        {
          name: '10 Hours Package',
          description: '10 flight hours package for regular pilots',
          hours: 10,
          price_per_hour: 115.00,
          total_price: 1150.00,
          currency: 'EUR',
          validity_days: 365,
          is_active: true
        },
        {
          name: '20 Hours Package',
          description: '20 flight hours package for frequent flyers',
          hours: 20,
          price_per_hour: 110.00,
          total_price: 2200.00,
          currency: 'EUR',
          validity_days: 365,
          is_active: true
        },
        {
          name: '50 Hours Package',
          description: '50 flight hours package for professional pilots',
          hours: 50,
          price_per_hour: 105.00,
          total_price: 5250.00,
          currency: 'EUR',
          validity_days: 365,
          is_active: true
        }
      ];

      const { error: insertError } = await supabase
        .from('hour_package_templates')
        .insert(defaultTemplates);

      if (insertError) {
        console.error('❌ Error inserting default templates:', insertError);
        return;
      }

      console.log('✅ Default hour package templates created successfully');
    } else {
      console.log('✅ Default templates already exist');
      console.log('📋 Existing templates:');
      existingTemplates.forEach(template => {
        console.log(`   - ${template.name}`);
      });
    }

    console.log('\n🎉 Hour Package Templates setup complete!');
    console.log('📝 You can now manage hour packages at /hour-packages');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

main(); 