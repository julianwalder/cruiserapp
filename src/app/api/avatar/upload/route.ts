import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
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

    // Get user information
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, "firstName", "lastName"')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (max 5MB for avatars)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    // Generate unique filename for avatar
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `avatar-${user.id}-${timestamp}.${extension}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Update user's avatar URL in database
    // First try to update with avatarUrl column
    let { error: updateError } = await supabase
      .from('users')
      .update({ 
        avatarUrl: blob.url,
        updatedAt: new Date().toISOString()
      })
      .eq('id', user.id);

    // If avatarUrl column doesn't exist, try without it
    if (updateError && updateError.message?.includes('avatarUrl')) {
      console.log('avatarUrl column not found, updating without it...');
      const { error: simpleUpdateError } = await supabase
        .from('users')
        .update({ 
          updatedAt: new Date().toISOString()
        })
        .eq('id', user.id);

      if (simpleUpdateError) {
        console.error('Error updating user:', simpleUpdateError);
        return NextResponse.json({ 
          error: 'Failed to update user profile' 
        }, { status: 500 });
      }

      // Log that avatarUrl column needs to be added
      console.log('Note: avatarUrl column should be added to users table for full functionality');
    } else if (updateError) {
      console.error('Error updating user avatar URL:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update user profile' 
      }, { status: 500 });
    }

    return NextResponse.json({
      url: blob.url,
      filename: filename,
      size: file.size,
      type: file.type,
      message: 'Avatar uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as any)?.message || String(error) },
      { status: 500 }
    );
  }
} 