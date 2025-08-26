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
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const certificateNumber = formData.get('certificateNumber') as string;
    const validUntil = formData.get('validUntil') as string;

    if (!certificateNumber || !validUntil) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    const { data: radioCertificate, error } = await supabase
      .from('radio_certificates')
      .update({
        certificate_number: certificateNumber,
        valid_until: validUntil,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', decoded.userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating radio certificate:', error);
      return NextResponse.json({ error: 'Failed to update radio certificate' }, { status: 500 });
    }

    return NextResponse.json({ radioCertificate });
  } catch (error) {
    console.error('Error in radio certificate PUT:', error);
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
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('radio_certificates')
      .delete()
      .eq('id', params.id)
      .eq('user_id', decoded.userId);

    if (error) {
      console.error('Error deleting radio certificate:', error);
      return NextResponse.json({ error: 'Failed to delete radio certificate' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Radio certificate deleted successfully' });
  } catch (error) {
    console.error('Error in radio certificate DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
