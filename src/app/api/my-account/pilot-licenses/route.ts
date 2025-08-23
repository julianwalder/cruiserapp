import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { PilotLicense, PilotLicenseFormData } from '@/types/pilot-documents';

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

    // Get pilot licenses
    const { data: licenses, error: licensesError } = await supabase
      .from('pilot_licenses')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false });

    if (licensesError) {
      console.error('Error fetching pilot licenses:', licensesError);
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
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

    if (licensesError) {
      console.error('Error fetching pilot licenses:', licensesError);
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
    }

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
    
    // Extract form data
    const licenseData = {
      // Holder Information
      placeOfBirth: formData.get('placeOfBirth') as string,
      nationality: formData.get('nationality') as string,
      
      // License Details
      stateOfIssue: formData.get('stateOfIssue') as string,
      issuingAuthority: formData.get('issuingAuthority') as string,
      licenseNumber: formData.get('licenseNumber') as string,
      licenseType: formData.get('licenseType') as string,
      dateOfInitialIssue: formData.get('dateOfInitialIssue') as string,
      countryCodeOfInitialIssue: formData.get('countryCodeOfInitialIssue') as string,
      dateOfIssue: formData.get('dateOfIssue') as string,
      issuingOfficerName: formData.get('issuingOfficerName') as string,
      
      // Ratings & Privileges
      classTypeRatings: JSON.parse(formData.get('classTypeRatings') as string || '[]'),
      irValidUntil: formData.get('irValidUntil') as string,
      
      // Language Proficiency
      languageProficiency: JSON.parse(formData.get('languageProficiency') as string || '[]'),
      
      // Medical Requirements
      medicalClassRequired: formData.get('medicalClassRequired') as string,
      medicalCertificateExpiry: formData.get('medicalCertificateExpiry') as string,
      
      // Radio Telephony
      radiotelephonyLanguages: JSON.parse(formData.get('radiotelephonyLanguages') as string || '[]'),
      radiotelephonyRemarks: formData.get('radiotelephonyRemarks') as string,
      
      // Signatures
      holderSignaturePresent: formData.get('holderSignaturePresent') === 'true',
      examinerSignatures: JSON.parse(formData.get('examinerSignatures') as string || '[]'),
      
      // Additional Information
      icaoCompliant: formData.get('icaoCompliant') === 'true',
      abbreviationsReference: formData.get('abbreviationsReference') as string,
      
      // Document reference
      documentId: formData.get('documentId') as string,
    };

    // Validate required fields
    const requiredFields = [
      'stateOfIssue', 'issuingAuthority', 'licenseNumber', 'licenseType',
      'dateOfInitialIssue', 'countryCodeOfInitialIssue', 'dateOfIssue'
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

    // Handle seal/stamp upload if provided
    const sealFile = formData.get('issuingAuthoritySeal') as File;
    let sealUrl: string | undefined;

    if (sealFile && sealFile.size > 0) {
      const sealFileName = `${decoded.userId}/seals/${Date.now()}-${sealFile.name}`;
      const { data: sealUploadData, error: sealUploadError } = await supabase.storage
        .from('pilot-documents')
        .upload(sealFileName, sealFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (sealUploadError) {
        console.error('Error uploading seal file:', sealUploadError);
        return NextResponse.json({ error: 'Failed to upload seal file' }, { status: 500 });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('pilot-documents')
        .getPublicUrl(sealFileName);
      
      sealUrl = publicUrl;
    }

    // Create pilot license record
    const { data: license, error: licenseError } = await supabase
      .from('pilot_licenses')
      .insert({
        user_id: decoded.userId,
        document_id: licenseData.documentId || null,
        place_of_birth: licenseData.placeOfBirth || null,
        nationality: licenseData.nationality || null,
        state_of_issue: licenseData.stateOfIssue,
        issuing_authority: licenseData.issuingAuthority,
        license_number: licenseData.licenseNumber,
        license_type: licenseData.licenseType,
        date_of_initial_issue: validateDate(licenseData.dateOfInitialIssue),
        country_code_of_initial_issue: licenseData.countryCodeOfInitialIssue,
        date_of_issue: validateDate(licenseData.dateOfIssue),
        issuing_officer_name: licenseData.issuingOfficerName || null,
        issuing_authority_seal: sealUrl || null,
        class_type_ratings: licenseData.classTypeRatings || null,
        ir_valid_until: validateDate(licenseData.irValidUntil),
        language_proficiency: licenseData.languageProficiency || null,
        medical_class_required: licenseData.medicalClassRequired || null,
        medical_certificate_expiry: validateDate(licenseData.medicalCertificateExpiry),
        radiotelephony_languages: licenseData.radiotelephonyLanguages || null,
        radiotelephony_remarks: licenseData.radiotelephonyRemarks || null,
        holder_signature_present: licenseData.holderSignaturePresent,
        examiner_signatures: licenseData.examinerSignatures || null,
        icao_compliant: licenseData.icaoCompliant,
        abbreviations_reference: licenseData.abbreviationsReference || null
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
    
    // Extract form data (same as POST)
    const licenseData = {
      // Holder Information
      placeOfBirth: formData.get('placeOfBirth') as string,
      nationality: formData.get('nationality') as string,
      
      // License Details
      stateOfIssue: formData.get('stateOfIssue') as string,
      issuingAuthority: formData.get('issuingAuthority') as string,
      licenseNumber: formData.get('licenseNumber') as string,
      licenseType: formData.get('licenseType') as string,
      dateOfInitialIssue: formData.get('dateOfInitialIssue') as string,
      countryCodeOfInitialIssue: formData.get('countryCodeOfInitialIssue') as string,
      dateOfIssue: formData.get('dateOfIssue') as string,
      issuingOfficerName: formData.get('issuingOfficerName') as string,
      
      // Ratings & Privileges
      classTypeRatings: JSON.parse(formData.get('classTypeRatings') as string || '[]'),
      irValidUntil: formData.get('irValidUntil') as string,
      
      // Language Proficiency
      languageProficiency: JSON.parse(formData.get('languageProficiency') as string || '[]'),
      
      // Medical Requirements
      medicalClassRequired: formData.get('medicalClassRequired') as string,
      medicalCertificateExpiry: formData.get('medicalCertificateExpiry') as string,
      
      // Radio Telephony
      radiotelephonyLanguages: JSON.parse(formData.get('radiotelephonyLanguages') as string || '[]'),
      radiotelephonyRemarks: formData.get('radiotelephonyRemarks') as string,
      
      // Signatures
      holderSignaturePresent: formData.get('holderSignaturePresent') === 'true',
      examinerSignatures: JSON.parse(formData.get('examinerSignatures') as string || '[]'),
      
      // Additional Information
      icaoCompliant: formData.get('icaoCompliant') === 'true',
      abbreviationsReference: formData.get('abbreviationsReference') as string,
      
      // Document reference
      documentId: formData.get('documentId') as string,
    };

    // Validate required fields
    const requiredFields = [
      'stateOfIssue', 'issuingAuthority', 'licenseNumber', 'licenseType',
      'dateOfInitialIssue', 'countryCodeOfInitialIssue', 'dateOfIssue'
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

    // Handle seal/stamp upload if provided
    const sealFile = formData.get('issuingAuthoritySeal') as File;
    let sealUrl: string | undefined;

    if (sealFile && sealFile.size > 0) {
      const sealFileName = `${decoded.userId}/seals/${Date.now()}-${sealFile.name}`;
      const { data: sealUploadData, error: sealUploadError } = await supabase.storage
        .from('pilot-documents')
        .upload(sealFileName, sealFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (sealUploadError) {
        console.error('Error uploading seal file:', sealUploadError);
        return NextResponse.json({ error: 'Failed to upload seal file' }, { status: 500 });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('pilot-documents')
        .getPublicUrl(sealFileName);
      
      sealUrl = publicUrl;
    }

    // Update pilot license record
    const { data: license, error: licenseError } = await supabase
      .from('pilot_licenses')
      .update({
        place_of_birth: licenseData.placeOfBirth || null,
        nationality: licenseData.nationality || null,
        state_of_issue: licenseData.stateOfIssue,
        issuing_authority: licenseData.issuingAuthority,
        license_number: licenseData.licenseNumber,
        license_type: licenseData.licenseType,
        date_of_initial_issue: validateDate(licenseData.dateOfInitialIssue),
        country_code_of_initial_issue: licenseData.countryCodeOfInitialIssue,
        date_of_issue: validateDate(licenseData.dateOfIssue),
        issuing_officer_name: licenseData.issuingOfficerName || null,
        issuing_authority_seal: sealUrl || null,
        class_type_ratings: licenseData.classTypeRatings || null,
        ir_valid_until: validateDate(licenseData.irValidUntil),
        language_proficiency: licenseData.languageProficiency || null,
        medical_class_required: licenseData.medicalClassRequired || null,
        medical_certificate_expiry: validateDate(licenseData.medicalCertificateExpiry),
        radiotelephony_languages: licenseData.radiotelephonyLanguages || null,
        radiotelephony_remarks: licenseData.radiotelephonyRemarks || null,
        holder_signature_present: licenseData.holderSignaturePresent,
        examiner_signatures: licenseData.examinerSignatures || null,
        icao_compliant: licenseData.icaoCompliant,
        abbreviations_reference: licenseData.abbreviationsReference || null
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
