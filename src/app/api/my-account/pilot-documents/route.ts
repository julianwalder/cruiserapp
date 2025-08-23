import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { PilotDocument, PilotLicense } from '@/types/pilot-documents';

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

    // Get pilot documents
    const { data: documents, error: documentsError } = await supabase
      .from('pilot_documents')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false });

    if (documentsError) {
      console.error('Error fetching pilot documents:', documentsError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
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

    return NextResponse.json({
      documents: documents || [],
      licenses: licenses || []
    });

  } catch (error) {
    console.error('Error in pilot documents GET:', error);
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
    const documentType = formData.get('documentType') as string;
    const file = formData.get('file') as File;

    if (!documentType || !file) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Upload file to Supabase Storage
    const fileName = `${decoded.userId}/${documentType}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pilot-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('pilot-documents')
      .getPublicUrl(fileName);

    // Create document record
    const { data: document, error: documentError } = await supabase
      .from('pilot_documents')
      .insert({
        user_id: decoded.userId,
        document_type: documentType,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type
      })
      .select()
      .single();

    if (documentError) {
      console.error('Error creating document record:', documentError);
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    return NextResponse.json({ document });

  } catch (error) {
    console.error('Error in pilot documents POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
