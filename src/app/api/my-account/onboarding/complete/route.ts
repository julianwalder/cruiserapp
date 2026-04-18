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
    const { onboardingId } = body;
    // veriffData MUST NOT come from the client. Accepting it would let
    // any PROSPECT write arbitrary identity verification payloads into
    // their own `users.veriffData` column and appear "verified" to the
    // rest of the app. The only legitimate writer is the Veriff webhook
    // (/api/veriff/webhook-*).

    if (!onboardingId) {
      return NextResponse.json(
        { error: 'Missing onboarding ID' },
        { status: 400 }
      );
    }

    // Get the onboarding record
    const { data: onboarding, error: getError } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('id', onboardingId)
      .eq('user_id', payload.userId)
      .single();

    if (getError) {
      console.error('Error fetching onboarding:', getError);
      return NextResponse.json(
        { error: 'Onboarding not found' },
        { status: 404 }
      );
    }

    if (onboarding.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Onboarding already completed' },
        { status: 409 }
      );
    }

    // Get the target role based on onboarding type
    const targetRoleName = onboarding.onboarding_type === 'STUDENT' ? 'STUDENT' : 'PILOT';
    
    const { data: targetRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', targetRoleName)
      .single();

    if (roleError) {
      console.error('Error getting target role:', roleError);
      return NextResponse.json(
        { error: 'Role configuration error' },
        { status: 500 }
      );
    }

    // Before promoting the user's role, require that identity
    // verification has actually happened. `identityVerified` is only
    // flipped to true by the Veriff/Stripe Identity webhooks, so this
    // guarantees onboarding can't be "completed" before the third-party
    // verification step.
    const { data: userRecord, error: userFetchError } = await supabase
      .from('users')
      .select('id, identityVerified')
      .eq('id', payload.userId)
      .single();
    if (userFetchError || !userRecord) {
      console.error('Error fetching user for onboarding completion:', userFetchError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }
    if (!userRecord.identityVerified) {
      return NextResponse.json(
        { error: 'Identity verification is required before completing onboarding.' },
        { status: 403 },
      );
    }

    // Start transaction-like operations
    try {
      // 1. Remove PROSPECT role and add target role
      // First, remove PROSPECT role
      const { data: prospectRole, error: prospectError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'PROSPECT')
        .single();

      if (prospectError) {
        console.error('Error getting PROSPECT role:', prospectError);
        throw new Error('Role configuration error');
      }

      const { error: removeProspectError } = await supabase
        .from('user_roles')
        .delete()
        .eq('"userId"', payload.userId)
        .eq('"roleId"', prospectRole.id);

      if (removeProspectError) {
        console.error('Error removing PROSPECT role:', removeProspectError);
        throw new Error('Failed to update user roles');
      }

      // Add target role
      const { error: addRoleError } = await supabase
        .from('user_roles')
        .insert({
          id: crypto.randomUUID(),
          "userId": payload.userId,
          "roleId": targetRole.id
        });

      if (addRoleError) {
        console.error('Error adding target role:', addRoleError);
        throw new Error('Failed to update user roles');
      }

      // 2. Create user payment plan record (skip for now since columns don't exist)
      // TODO: Implement payment plan creation when database schema is updated

      // 3. Update onboarding status to completed
      const { error: onboardingUpdateError } = await supabase
        .from('user_onboarding')
        .update({
          status: 'COMPLETED',
          contract_signed: true,
          contract_signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', onboardingId);

      if (onboardingUpdateError) {
        console.error('Error updating onboarding:', onboardingUpdateError);
        throw new Error('Failed to complete onboarding');
      }

      return NextResponse.json({
        message: 'Onboarding completed successfully',
        newRole: targetRoleName,
        onboarding: {
          ...onboarding,
          status: 'COMPLETED',
          contract_signed: true,
          contract_signed_at: new Date().toISOString()
        }
      });

    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      return NextResponse.json(
        { error: 'Failed to complete onboarding process' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Complete onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 