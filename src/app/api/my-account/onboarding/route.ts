import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { onboardingType, paymentPlanId, hourPackageId } = body;

    // Validate onboarding type
    if (!onboardingType || !['STUDENT', 'PILOT'].includes(onboardingType)) {
      return NextResponse.json(
        { error: 'Invalid onboarding type' },
        { status: 400 }
      );
    }

    // Check if user already has an active onboarding
    const { data: existingOnboarding, error: checkError } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', payload.userId)
      .in('status', ['PENDING', 'IN_PROGRESS'])
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing onboarding:', checkError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (existingOnboarding) {
      return NextResponse.json(
        { error: 'User already has an active onboarding process' },
        { status: 409 }
      );
    }

    // Create onboarding record
    const onboardingData = {
      id: crypto.randomUUID(),
      user_id: payload.userId,
      onboarding_type: onboardingType,
      status: 'PENDING',
      current_step: 1,
      total_steps: 5
    };

    const { data: onboarding, error: createError } = await supabase
      .from('user_onboarding')
      .insert(onboardingData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating onboarding:', createError);
      return NextResponse.json(
        { error: 'Failed to create onboarding record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Onboarding started successfully',
      onboarding
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Get user's onboarding status
    const { data: onboarding, error } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', payload.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching onboarding:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      onboarding: onboarding || null
    });

  } catch (error) {
    console.error('Get onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { onboardingId, updates } = body;

    if (!onboardingId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update onboarding record
    const { data: onboarding, error } = await supabase
      .from('user_onboarding')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', onboardingId)
      .eq('user_id', payload.userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating onboarding:', error);
      return NextResponse.json(
        { error: 'Failed to update onboarding' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Onboarding updated successfully',
      onboarding
    });

  } catch (error) {
    console.error('Update onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 