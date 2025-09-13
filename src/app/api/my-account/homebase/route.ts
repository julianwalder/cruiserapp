import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Get user homebase API called');

    // Get token from request
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify token
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = payload.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user's current homebase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        homebase_id,
        airfields!homebase_id (
          id,
          name,
          icao,
          city,
          country
        )
      `)
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Error fetching user homebase:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user homebase' },
        { status: 500 }
      );
    }

    console.log('✅ User homebase fetched successfully');

    return NextResponse.json({
      homebase: user?.airfields || null,
      homebaseId: user?.homebase_id || null
    });

  } catch (error) {
    console.error('❌ Unexpected error in get homebase API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 Update user homebase API called');

    // Get token from request
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify token
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = payload.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { homebaseId } = body;

    if (homebaseId && typeof homebaseId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid homebase ID format' },
        { status: 400 }
      );
    }

    // If homebaseId is provided, validate it exists
    if (homebaseId) {
      const { data: airfield, error: airfieldError } = await supabase
        .from('airfields')
        .select('id, name')
        .eq('id', homebaseId)
        .eq('isActive', true)
        .single();

      if (airfieldError || !airfield) {
        return NextResponse.json(
          { error: 'Invalid airfield ID' },
          { status: 400 }
        );
      }
    }

    // Update user's homebase
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ homebase_id: homebaseId || null })
      .eq('id', userId)
      .select(`
        homebase_id,
        airfields!homebase_id (
          id,
          name,
          icao,
          city,
          country
        )
      `)
      .single();

    if (updateError) {
      console.error('❌ Error updating user homebase:', updateError);
      return NextResponse.json(
        { error: 'Failed to update homebase' },
        { status: 500 }
      );
    }

    console.log('✅ User homebase updated successfully');

    return NextResponse.json({
      success: true,
      homebase: updatedUser?.airfields || null,
      homebaseId: updatedUser?.homebase_id || null
    });

  } catch (error) {
    console.error('❌ Unexpected error in update homebase API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
