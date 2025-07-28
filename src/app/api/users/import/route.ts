import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/users/import - Download CSV template
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Simple token verification for template download
    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Create CSV template content
    const csvContent = `email,firstName,lastName,personalNumber,phone,dateOfBirth,address,city,state,zipCode,country,status,totalFlightHours,licenseNumber,medicalClass,instructorRating,role
john.doe@example.com,John,Doe,1234567890123,+1234567890,1990-01-01,123 Main St,New York,NY,10001,USA,ACTIVE,100.5,PL123456,1,CFI,PILOT
jane.smith@example.com,Jane,Smith,9876543210987,+1987654321,1985-05-15,456 Oak Ave,Los Angeles,CA,90210,USA,ACTIVE,250.0,PL789012,1,CFII,INSTRUCTOR
bob.wilson@example.com,Bob,Wilson,5556667778889,+1555666777,1992-12-20,789 Pine Rd,Chicago,IL,60601,USA,ACTIVE,75.2,PL345678,2,,STUDENT`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="users_import_template.csv"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users/import - Import users from CSV
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user roles from JWT token
    const payload = AuthService.verifyToken(token);
    const userRoles = payload?.roles || [];
    
    // Check if user has appropriate permissions
    if (!AuthService.hasPermission(userRoles, 'ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.users || !Array.isArray(body.users) || body.users.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const results = {
      total: body.users.length,
      created: 0,
      updated: 0,
      errors: [] as any[],
      users: [] as any[],
    };

    for (const userData of body.users) {
      try {
        // Validate required fields
        if (!userData.email || !userData.firstName || !userData.lastName) {
          results.errors.push({
            email: userData.email,
            error: 'Missing required fields (email, firstName, lastName)',
          });
          continue;
        }

        // Check if user already exists
        const { data: existingUser, error: existingError } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', userData.email)
          .single();

        if (existingError && existingError.code !== 'PGRST116') {
          console.error('Error checking existing user:', existingError);
          results.errors.push({
            email: userData.email,
            error: 'Database error checking existing user',
          });
          continue;
        }

        if (existingUser) {
          // Update existing user
          const updateData: any = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            personalNumber: userData.personalNumber || null,
            phone: userData.phone || null,
            dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth).toISOString() : null,
            address: userData.address || null,
            city: userData.city || null,
            state: userData.state || null,
            zipCode: userData.zipCode || null,
            country: userData.country || null,
            status: userData.status || 'ACTIVE',
            totalFlightHours: userData.totalFlightHours || 0,
            licenseNumber: userData.licenseNumber || null,
            medicalClass: userData.medicalClass || null,
            instructorRating: userData.instructorRating || null,
            updatedAt: new Date().toISOString(),
          };

          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', existingUser.id)
            .select('*')
            .single();

          if (updateError) {
            console.error('Error updating user:', updateError);
            results.errors.push({
              email: userData.email,
              error: 'Failed to update user',
            });
            continue;
          }

          results.updated++;
          results.users.push(updatedUser);
        } else {
          // Create new user
          const hashedPassword = await AuthService.hashPassword(userData.password || 'defaultPassword123');

          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              email: userData.email,
              password: hashedPassword,
              firstName: userData.firstName,
              lastName: userData.lastName,
              personalNumber: userData.personalNumber || null,
              phone: userData.phone || null,
              dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth).toISOString() : null,
              address: userData.address || null,
              city: userData.city || null,
              state: userData.state || null,
              zipCode: userData.zipCode || null,
              country: userData.country || null,
              status: userData.status || 'ACTIVE',
              totalFlightHours: userData.totalFlightHours || 0,
              licenseNumber: userData.licenseNumber || null,
              medicalClass: userData.medicalClass || null,
              instructorRating: userData.instructorRating || null,
              createdById: user.id,
            })
            .select('*')
            .single();

          if (createError) {
            console.error('Error creating user:', createError);
            results.errors.push({
              email: userData.email,
              error: 'Failed to create user',
            });
            continue;
          }

          // Assign default role (PILOT) if not specified
          const roleToAssign = userData.role || 'PILOT';
          const { data: role, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('name', roleToAssign)
            .single();

          if (roleError) {
            console.error('Error finding role:', roleError);
            results.errors.push({
              email: userData.email,
              error: 'Failed to assign role',
            });
            continue;
          }

          if (role) {
            const { error: assignRoleError } = await supabase
              .from('userRoles')
              .insert({
                userId: newUser.id,
                roleId: role.id,
                assignedBy: user.id,
                assignedAt: new Date().toISOString(),
              });

            if (assignRoleError) {
              console.error('Error assigning role:', assignRoleError);
              results.errors.push({
                email: userData.email,
                error: 'Failed to assign role',
              });
              continue;
            }
          }

          results.created++;
          results.users.push(newUser);
        }
      } catch (error) {
        console.error('Error processing user:', error);
        results.errors.push({
          email: userData.email,
          error: 'Unexpected error processing user',
        });
      }
    }

    return NextResponse.json({
      message: `Import completed. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors.length}`,
      results,
    });
  } catch (error) {
    console.error('Error importing users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 