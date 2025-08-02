import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Check if user is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        user_roles!user_roles_userId_fkey (
          roles (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasAdminRole = user.user_roles?.some((ur: any) => 
      ur.roles.name === 'ADMIN' || ur.roles.name === 'SUPER_ADMIN'
    );

    if (!hasAdminRole) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Create hour_packages table using SQL
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS hour_packages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
          package_name VARCHAR(100) NOT NULL,
          hours_bought DECIMAL(10,2) NOT NULL,
          hours_used DECIMAL(10,2) DEFAULT 0,
          price DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'RON',
          purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expiry_date TIMESTAMP WITH TIME ZONE,
          status VARCHAR(20) DEFAULT 'ACTIVE',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_hour_packages_user_id ON hour_packages(user_id);
        CREATE INDEX IF NOT EXISTS idx_hour_packages_status ON hour_packages(status);
        CREATE INDEX IF NOT EXISTS idx_hour_packages_expiry ON hour_packages(expiry_date);

        -- Create function to update updated_at
        CREATE OR REPLACE FUNCTION update_hour_packages_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create trigger
        DROP TRIGGER IF EXISTS trigger_update_hour_packages_updated_at ON hour_packages;
        CREATE TRIGGER trigger_update_hour_packages_updated_at
          BEFORE UPDATE ON hour_packages
          FOR EACH ROW
          EXECUTE FUNCTION update_hour_packages_updated_at();
      `
    });

    if (createTableError) {
      console.error('Error creating table:', createTableError);
      return NextResponse.json({ error: 'Failed to create table' }, { status: 500 });
    }

    // Migrate existing data - add Gianluca's 50 hours
    const { error: migrateError } = await supabase
      .from('hour_packages')
      .insert({
        user_id: 'cmdko33f3000nw0jcysksvnfi', // Gianluca's actual user ID from logs
        package_name: 'Legacy Package',
        hours_bought: 50,
        hours_used: 0, // Will be calculated from flight logs
        price: 0, // Unknown legacy price
        currency: 'RON',
        status: 'ACTIVE'
      });

    if (migrateError) {
      console.error('Error migrating data:', migrateError);
      // Don't return error here as table creation was successful
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Hour packages table created successfully',
      note: 'Please update the user_id in the migration script with Gianluca\'s actual user ID'
    });

  } catch (error) {
    console.error('Error setting up hour packages:', error);
    return NextResponse.json(
      { 
        error: 'Failed to setup hour packages',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 