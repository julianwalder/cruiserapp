import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    
    // Fetch radio certificates for the user
    const { data: certificates, error: certificatesError } = await supabase
      .from('radio_certificates')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false });

    if (certificatesError) {
      console.error('Error fetching radio certificates:', certificatesError);
      return NextResponse.json({ error: 'Failed to fetch radio certificates' }, { status: 500 });
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
      radioCertificates: certificatesWithDocuments,
      documents: documents
    });
  } catch (error) {
    console.error('Error in radio certificates GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const documentId = formData.get('documentId') as string;
    const certificateNumber = formData.get('certificateNumber') as string;
    const validUntil = formData.get('validUntil') as string;

    if (!documentId || !certificateNumber || !validUntil) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    // Archive any existing active radio certificates
    await supabase
      .from('radio_certificates')
      .update({ 
        status: 'archived',
        archived_at: new Date().toISOString(),
        archive_reason: 'Replaced by new certificate'
      })
      .eq('user_id', decoded.userId)
      .eq('status', 'active');

    // Create new radio certificate
    const { data: radioCertificate, error } = await supabase
      .from('radio_certificates')
      .insert({
        user_id: decoded.userId,
        document_id: documentId,
        certificate_number: certificateNumber,
        valid_until: validUntil,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating radio certificate:', error);
      return NextResponse.json({ error: 'Failed to create radio certificate' }, { status: 500 });
    }

    return NextResponse.json({ radioCertificate });
  } catch (error) {
    console.error('Error in radio certificates POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
