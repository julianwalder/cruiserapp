import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

// Helper function to validate and convert date strings
function validateDate(dateString: string | null | undefined): string | null {
  if (!dateString || dateString.trim() === '') {
    return null;
  }
  
  // Check if it's a valid date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return null;
  }
  
  // Try to parse the date
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return dateString;
}

export async function GET(request: NextRequest) {
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

    // Get pilot licenses (both active and archived)
    console.log('🔍 Pilot Licenses API - User ID:', decoded.userId);
    
    const { data: licenses, error: licensesError } = await supabase
      .from('pilot_licenses')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false });

    if (licensesError) {
      console.error('Error fetching pilot licenses:', licensesError);
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
    }

    console.log('🔍 Pilot Licenses API - Found licenses:', licenses?.length || 0);
    if (licenses && licenses.length > 0) {
      licenses.forEach((license, index) => {
        console.log(`   License ${index + 1}:`, {
          id: license.id,
          license_number: license.license_number,
          document_id: license.document_id
        });
      });
    }

    // Get related documents for each license
    const licensesWithDocuments = await Promise.all(
      (licenses || []).map(async (license) => {
        if (license.document_id) {
          const { data: document, error: docError } = await supabase
            .from('pilot_documents')
            .select('*')
            .eq('id', license.document_id)
            .single();

          if (!docError && document) {
            return {
              ...license,
              pilot_documents: [document]
            };
          }
        }
        return {
          ...license,
          pilot_documents: []
        };
      })
    );

    return NextResponse.json({ licenses: licensesWithDocuments || [] });

  } catch (error) {
    console.error('Error in pilot licenses GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const formData = await request.formData();
    
    // Debug: Log received form data
    console.log('Received form data:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    // Extract form data (simplified to match frontend fields)
    const licenseData = {
      // Essential License Fields
      stateOfIssue: formData.get('stateOfIssue') as string,
      licenseNumber: formData.get('licenseNumber') as string,
      licenseType: formData.get('licenseType') as string,
      dateOfIssue: formData.get('dateOfIssue') as string,
      countryCodeOfInitialIssue: formData.get('countryCodeOfInitialIssue') as string,
      
      // Ratings & Language Proficiency (JSON arrays)
      classTypeRatings: JSON.parse(formData.get('classTypeRatings') as string || '[]'),
      languageProficiency: JSON.parse(formData.get('languageProficiency') as string || '[]'),
      
      // Document reference
      documentId: formData.get('documentId') as string,
    };

    // Validate required fields (simplified)
    const requiredFields = [
      'stateOfIssue', 'licenseNumber', 'licenseType', 'dateOfIssue', 'countryCodeOfInitialIssue'
    ];

    for (const field of requiredFields) {
      const value = licenseData[field as keyof typeof licenseData];
      if (!value || value === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
      
      // Additional validation for date fields
      if (field.includes('date') || field.includes('Date')) {
        if (!validateDate(value as string)) {
          return NextResponse.json({ error: `Invalid date format for field: ${field}` }, { status: 400 });
        }
      }
    }

                // Check if user has an active license and get the next version number
            const { data: existingLicenses } = await supabase
              .from('pilot_licenses')
              .select('*')
              .eq('user_id', decoded.userId)
              .order('version', { ascending: false });

            const nextVersion = existingLicenses && existingLicenses.length > 0 
              ? Math.max(...existingLicenses.map(l => l.version || 1)) + 1 
              : 1;

            // Archive any existing active licenses before creating a new one
            if (existingLicenses && existingLicenses.length > 0) {
              const activeLicenses = existingLicenses.filter(l => l.status === 'active');
              if (activeLicenses.length > 0) {
                console.log(`🔄 Archiving ${activeLicenses.length} existing active license(s)...`);
                
                const { error: archiveError } = await supabase
                  .from('pilot_licenses')
                  .update({
                    status: 'archived',
                    archived_at: new Date().toISOString(),
                    archive_reason: 'Replaced by new license upload'
                  })
                  .in('id', activeLicenses.map(l => l.id));
                
                if (archiveError) {
                  console.error('Error archiving existing licenses:', archiveError);
                  return NextResponse.json({ error: 'Failed to archive existing licenses' }, { status: 500 });
                }
                
                console.log('✅ Existing licenses archived successfully');
              }
            }

            // Create pilot license record (simplified schema)
            const { data: license, error: licenseError } = await supabase
              .from('pilot_licenses')
              .insert({
                user_id: decoded.userId,
                document_id: licenseData.documentId || null,
                state_of_issue: licenseData.stateOfIssue,
                license_number: licenseData.licenseNumber,
                license_type: licenseData.licenseType,
                date_of_issue: validateDate(licenseData.dateOfIssue),
                country_code_of_initial_issue: licenseData.countryCodeOfInitialIssue,
                class_type_ratings: licenseData.classTypeRatings || [],
                language_proficiency: licenseData.languageProficiency || [],
                status: 'active', // Will be checked for expiration by database trigger
                version: nextVersion
              })
              .select('*')
              .single();

    if (licenseError) {
      console.error('Error creating pilot license:', licenseError);
      return NextResponse.json({ error: 'Failed to create pilot license' }, { status: 500 });
    }

    // Get related document if document_id exists
    let licenseWithDocument = license;
    if (license.document_id) {
      const { data: document, error: docError } = await supabase
        .from('pilot_documents')
        .select('*')
        .eq('id', license.document_id)
        .single();

      if (!docError && document) {
        licenseWithDocument = {
          ...license,
          pilot_documents: [document]
        };
      } else {
        licenseWithDocument = {
          ...license,
          pilot_documents: []
        };
      }
    } else {
      licenseWithDocument = {
        ...license,
        pilot_documents: []
      };
    }

    return NextResponse.json({ license: licenseWithDocument });

  } catch (error) {
    console.error('Error in pilot licenses POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const formData = await request.formData();
    const licenseId = formData.get('licenseId') as string;
    
    if (!licenseId) {
      return NextResponse.json({ error: 'License ID is required for updates' }, { status: 400 });
    }

    // Debug: Log received form data
    console.log('Received form data for update:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    // Extract form data (simplified to match frontend fields)
    const licenseData = {
      // Essential License Fields
      stateOfIssue: formData.get('stateOfIssue') as string,
      licenseNumber: formData.get('licenseNumber') as string,
      licenseType: formData.get('licenseType') as string,
      dateOfIssue: formData.get('dateOfIssue') as string,
      countryCodeOfInitialIssue: formData.get('countryCodeOfInitialIssue') as string,
      
      // Ratings & Language Proficiency (JSON arrays)
      classTypeRatings: JSON.parse(formData.get('classTypeRatings') as string || '[]'),
      languageProficiency: JSON.parse(formData.get('languageProficiency') as string || '[]'),
      
      // Document reference
      documentId: formData.get('documentId') as string,
    };

    // Validate required fields (simplified)
    const requiredFields = [
      'stateOfIssue', 'licenseNumber', 'licenseType', 'dateOfIssue', 'countryCodeOfInitialIssue'
    ];

    for (const field of requiredFields) {
      const value = licenseData[field as keyof typeof licenseData];
      if (!value || value === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
      
      // Additional validation for date fields
      if (field.includes('date') || field.includes('Date')) {
        if (!validateDate(value as string)) {
          return NextResponse.json({ error: `Invalid date format for field: ${field}` }, { status: 400 });
        }
      }
    }

    // Update pilot license record (simplified schema)
    const { data: license, error: licenseError } = await supabase
      .from('pilot_licenses')
      .update({
        state_of_issue: licenseData.stateOfIssue,
        license_number: licenseData.licenseNumber,
        license_type: licenseData.licenseType,
        date_of_issue: validateDate(licenseData.dateOfIssue),
        country_code_of_initial_issue: licenseData.countryCodeOfInitialIssue,
        class_type_ratings: licenseData.classTypeRatings || [],
        language_proficiency: licenseData.languageProficiency || []
      })
      .eq('id', licenseId)
      .eq('user_id', decoded.userId)
      .select('*')
      .single();

    if (licenseError) {
      console.error('Error updating pilot license:', licenseError);
      return NextResponse.json({ error: 'Failed to update pilot license' }, { status: 500 });
    }

    // Get related document if document_id exists
    let licenseWithDocument = license;
    if (license.document_id) {
      const { data: document, error: docError } = await supabase
        .from('pilot_documents')
        .select('*')
        .eq('id', license.document_id)
        .single();

      if (!docError && document) {
        licenseWithDocument = {
          ...license,
          pilot_documents: [document]
        };
      } else {
        licenseWithDocument = {
          ...license,
          pilot_documents: []
        };
      }
    } else {
      licenseWithDocument = {
        ...license,
        pilot_documents: []
      };
    }

    return NextResponse.json({ license: licenseWithDocument });

  } catch (error) {
    console.error('Error in pilot licenses PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
