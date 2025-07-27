import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const prisma = new PrismaClient();

// Helper function to verify super admin
async function verifySuperAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const isSuperAdmin = session.user.userRoles.some(
      userRole => userRole.role.name === 'SUPER_ADMIN'
    );

    return isSuperAdmin ? session.user : null;
  } catch (error) {
    console.error('Error verifying super admin:', error);
    return null;
  }
}

// GET: Download CSV template
export async function GET(request: NextRequest) {
  const user = await verifySuperAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized - Super Admin access required' }, { status: 401 });
  }

  try {
    // Create CSV template with all user fields
    const templateData = [
      {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        personalNumber: '1234567890123',
        phone: '+1234567890',
        dateOfBirth: '1990-01-01',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        status: 'ACTIVE',
        totalFlightHours: '150.5',
        licenseNumber: 'PPL-123456',
        medicalClass: 'Class 2',
        instructorRating: 'CFI',
        roles: 'PILOT,STUDENT' // Comma-separated roles
      }
    ];

    const csvContent = stringify(templateData, {
      header: true,
      columns: [
        'email',
        'firstName',
        'lastName',
        'personalNumber',
        'phone',
        'dateOfBirth',
        'address',
        'city',
        'state',
        'zipCode',
        'country',
        'status',
        'totalFlightHours',
        'licenseNumber',
        'medicalClass',
        'instructorRating',
        'roles'
      ]
    });

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="users_import_template.csv"'
      }
    });
  } catch (error) {
    console.error('Error generating CSV template:', error);
    return NextResponse.json({ error: 'Failed to generate CSV template' }, { status: 500 });
  }
}

// POST: Import users from CSV
export async function POST(request: NextRequest) {
  const user = await verifySuperAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized - Super Admin access required' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const csvText = await file.text();
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Record<string, string>[];

    const results = {
      success: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    // Create a unique import ID for progress tracking
    const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store initial progress in memory (in production, use Redis or database)
    const progressData = {
      id: importId,
      current: 0,
      total: records.length,
      percentage: 0,
      status: 'Starting import...',
      results: null,
      completed: false
    };
    
    // Store progress in a global variable (in production, use proper storage)
    (global as any).importProgress = (global as any).importProgress || {};
    (global as any).importProgress[importId] = progressData;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // +2 because of 0-based index and header row

      // Update progress
      const currentProgress = (global as any).importProgress[importId];
      currentProgress.current = i + 1;
      currentProgress.percentage = Math.round(((i + 1) / records.length) * 100);
      currentProgress.status = `Processing row ${rowNumber}: ${record.email}`;

      try {
        // Validate required fields
        if (!record.email || !record.firstName || !record.lastName) {
          results.errors.push(`Row ${rowNumber}: Missing required fields (email, firstName, lastName)`);
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(record.email)) {
          results.errors.push(`Row ${rowNumber}: Invalid email format: ${record.email}`);
          continue;
        }

        // Validate date format if provided
        if (record.dateOfBirth) {
          const date = new Date(record.dateOfBirth);
          if (isNaN(date.getTime())) {
            results.errors.push(`Row ${rowNumber}: Invalid date format for dateOfBirth: ${record.dateOfBirth}`);
            continue;
          }
        }

        // Validate totalFlightHours if provided
        if (record.totalFlightHours && isNaN(parseFloat(record.totalFlightHours))) {
          results.errors.push(`Row ${rowNumber}: Invalid totalFlightHours format: ${record.totalFlightHours}`);
          continue;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: record.email }
        });

        if (existingUser) {
          results.errors.push(`Row ${rowNumber}: User with email ${record.email} already exists`);
          continue;
        }

        // Hash password (generate random password if not provided)
        const password = record.password || Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(password, 12);

        // Parse roles
        const roleNames = record.roles ? record.roles.split(',').map((r: string) => r.trim()) : [];
        
        // Validate roles exist
        const validRoles = await prisma.role.findMany({
          where: {
            name: { in: roleNames },
            isActive: true
          }
        });

        if (roleNames.length > 0 && validRoles.length !== roleNames.length) {
          const invalidRoles = roleNames.filter(name => !validRoles.find(r => r.name === name));
          results.errors.push(`Row ${rowNumber}: Invalid roles: ${invalidRoles.join(', ')}`);
          continue;
        }

        // Create user
        const newUser = await prisma.user.create({
          data: {
            email: record.email,
            password: hashedPassword,
            firstName: record.firstName,
            lastName: record.lastName,
            personalNumber: record.personalNumber || null,
            phone: record.phone || null,
            dateOfBirth: record.dateOfBirth ? new Date(record.dateOfBirth) : null,
            address: record.address || null,
            city: record.city || null,
            state: record.state || null,
            zipCode: record.zipCode || null,
            country: record.country || null,
            status: (record.status as any) || 'ACTIVE',
            totalFlightHours: parseFloat(record.totalFlightHours) || 0,
            licenseNumber: record.licenseNumber || null,
            medicalClass: record.medicalClass || null,
            instructorRating: record.instructorRating || null,
            createdById: user.id
          }
        });

        // Assign roles
        if (validRoles.length > 0) {
          await prisma.userRole.createMany({
            data: validRoles.map(role => ({
              userId: newUser.id,
              roleId: role.id,
              assignedBy: user.id,
              assignedAt: new Date()
            }))
          });
        }

        results.success++;
        results.details.push({
          row: rowNumber,
          email: record.email,
          status: 'success',
          message: 'User created successfully'
        });

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Update final progress
    const finalProgress = (global as any).importProgress[importId];
    finalProgress.status = 'Import completed';
    finalProgress.results = results;
    finalProgress.completed = true;

    // Clean up progress data after 5 minutes
    setTimeout(() => {
      if ((global as any).importProgress[importId]) {
        delete (global as any).importProgress[importId];
      }
    }, 5 * 60 * 1000);

    return NextResponse.json({
      message: `Import completed. ${results.success} users created successfully.`,
      importId: importId,
      results: {
        success: results.success,
        errors: results.errors,
        details: results.details,
        total: records.length
      }
    });

  } catch (error) {
    console.error('Error importing users:', error);
    return NextResponse.json({ error: 'Failed to import users' }, { status: 500 });
  }
} 