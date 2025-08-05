import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
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
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get current user's avatar URL before removing it
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, avatarUrl')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user to remove avatar URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        avatarUrl: null,
        updatedAt: new Date().toISOString()
      })
      .eq('id', decoded.userId);

    if (updateError) {
      console.error('Error removing avatar URL:', updateError);
      return NextResponse.json({ 
        error: 'Failed to remove avatar' 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Avatar removed successfully',
      previousAvatarUrl: user.avatarUrl
    });

  } catch (error) {
    console.error('Error removing avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as any)?.message || String(error) },
      { status: 500 }
    );
  }
} 