import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';

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
    
    // Fetch medical certificates for the user
    const { data: certificates, error: certificatesError } = await supabase
      .from('medical_certificates')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false });

    if (certificatesError) {
      console.error('Error fetching medical certificates:', certificatesError);
      return NextResponse.json({ error: 'Failed to fetch medical certificates' }, { status: 500 });
    }

    // Fetch associated documents
    const documentIds = certificates
      .map(cert => cert.document_id)
      .filter(id => id !== null);

    let documents: any[] = [];
    if (documentIds.length > 0) {
      const { data: docs, error: docsError } = await supabase
        .from('pilot_documents')
        .select('*')
        .in('id', documentIds);

      if (docsError) {
        console.error('Error fetching documents:', docsError);
      } else {
        documents = docs || [];
      }
    }

    // Combine certificates with their documents
    const certificatesWithDocuments = certificates.map(certificate => ({
      ...certificate,
      pilot_documents: documents.filter(doc => doc.id === certificate.document_id)
    }));

    return NextResponse.json({
      certificates: certificatesWithDocuments,
      documents: documents
    });

  } catch (error) {
    console.error('Error in medical certificates GET:', error);
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

    const formData = await request.formData();
    const supabase = getSupabaseClient();

    // Extract form data
    const licensingAuthority = formData.get('licensingAuthority') as string;
    const medicalClass = formData.get('medicalClass') as string;
    const certificateNumber = formData.get('certificateNumber') as string;
    const validUntil = formData.get('validUntil') as string;
    const documentId = formData.get('documentId') as string;
    
    // Additional fields
    const issuedDate = formData.get('issuedDate') as string;
    const issuingDoctor = formData.get('issuingDoctor') as string;
    const medicalCenter = formData.get('medicalCenter') as string;
    const restrictions = formData.get('restrictions') as string;
    const remarks = formData.get('remarks') as string;

    // Validate required fields
    if (!licensingAuthority || !medicalClass || !certificateNumber || !validUntil || !documentId) {
      return NextResponse.json({ 
        error: 'Missing required fields: licensingAuthority, medicalClass, certificateNumber, validUntil, documentId' 
      }, { status: 400 });
    }

    // Archive any existing active certificates
    const { error: archiveError } = await supabase
      .from('medical_certificates')
      .update({ 
        status: 'archived',
        archive_reason: 'New certificate uploaded'
      })
      .eq('user_id', decoded.userId)
      .eq('status', 'active');

    if (archiveError) {
      console.error('Error archiving existing certificates:', archiveError);
      return NextResponse.json({ error: 'Failed to archive existing certificates' }, { status: 500 });
    }

    // Create new medical certificate
    const { data: certificate, error: insertError } = await supabase
      .from('medical_certificates')
      .insert({
        user_id: decoded.userId,
        document_id: documentId,
        licensing_authority: licensingAuthority,
        medical_class: medicalClass,
        certificate_number: certificateNumber,
        valid_until: validUntil,
        issued_date: issuedDate || null,
        issuing_doctor: issuingDoctor || null,
        medical_center: medicalCenter || null,
        restrictions: restrictions || null,
        remarks: remarks || null,
        status: 'active',
        version: 1
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating medical certificate:', insertError);
      return NextResponse.json({ error: 'Failed to create medical certificate' }, { status: 500 });
    }

    // Fetch the associated document
    const { data: document, error: docError } = await supabase
      .from('pilot_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError) {
      console.error('Error fetching document:', docError);
    }

    // Return certificate with document
    const certificateWithDocument = {
      ...certificate,
      pilot_documents: document ? [document] : []
    };

    return NextResponse.json({ certificate: certificateWithDocument });

  } catch (error) {
    console.error('Error in medical certificates POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
