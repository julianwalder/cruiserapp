import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const certificateId = params.id;
    const formData = await request.formData();
    const supabase = getSupabaseClient();

    // First, verify the certificate belongs to the user
    const { data: existingCertificate, error: fetchError } = await supabase
      .from('medical_certificates')
      .select('*')
      .eq('id', certificateId)
      .eq('user_id', decoded.userId)
      .single();

    if (fetchError || !existingCertificate) {
      return NextResponse.json({ error: 'Medical certificate not found' }, { status: 404 });
    }

    // Extract form data
    const licensingAuthority = formData.get('licensingAuthority') as string;
    const medicalClass = formData.get('medicalClass') as string;
    const certificateNumber = formData.get('certificateNumber') as string;
    const validUntil = formData.get('validUntil') as string;
    
    // Additional fields
    const issuedDate = formData.get('issuedDate') as string;
    const issuingDoctor = formData.get('issuingDoctor') as string;
    const medicalCenter = formData.get('medicalCenter') as string;
    const restrictions = formData.get('restrictions') as string;
    const remarks = formData.get('remarks') as string;

    // Validate required fields
    if (!licensingAuthority || !medicalClass || !certificateNumber || !validUntil) {
      return NextResponse.json({ 
        error: 'Missing required fields: licensingAuthority, medicalClass, certificateNumber, validUntil' 
      }, { status: 400 });
    }

    // Update the medical certificate
    const { data: updatedCertificate, error: updateError } = await supabase
      .from('medical_certificates')
      .update({
        licensing_authority: licensingAuthority,
        medical_class: medicalClass,
        certificate_number: certificateNumber,
        valid_until: validUntil,
        issued_date: issuedDate || null,
        issuing_doctor: issuingDoctor || null,
        medical_center: medicalCenter || null,
        restrictions: restrictions || null,
        remarks: remarks || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', certificateId)
      .eq('user_id', decoded.userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating medical certificate:', updateError);
      return NextResponse.json({ error: 'Failed to update medical certificate' }, { status: 500 });
    }

    // Fetch the associated document
    let document = null;
    if (updatedCertificate.document_id) {
      const { data: doc, error: docError } = await supabase
        .from('pilot_documents')
        .select('*')
        .eq('id', updatedCertificate.document_id)
        .single();

      if (!docError) {
        document = doc;
      }
    }

    // Return updated certificate with document
    const certificateWithDocument = {
      ...updatedCertificate,
      pilot_documents: document ? [document] : []
    };

    return NextResponse.json({ certificate: certificateWithDocument });

  } catch (error) {
    console.error('Error in medical certificates PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const certificateId = params.id;
    const supabase = getSupabaseClient();

    // Verify the certificate belongs to the user
    const { data: existingCertificate, error: fetchError } = await supabase
      .from('medical_certificates')
      .select('*')
      .eq('id', certificateId)
      .eq('user_id', decoded.userId)
      .single();

    if (fetchError || !existingCertificate) {
      return NextResponse.json({ error: 'Medical certificate not found' }, { status: 404 });
    }

    // Delete the medical certificate
    const { error: deleteError } = await supabase
      .from('medical_certificates')
      .delete()
      .eq('id', certificateId)
      .eq('user_id', decoded.userId);

    if (deleteError) {
      console.error('Error deleting medical certificate:', deleteError);
      return NextResponse.json({ error: 'Failed to delete medical certificate' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Medical certificate deleted successfully' });

  } catch (error) {
    console.error('Error in medical certificates DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
