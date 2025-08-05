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
    const { onboardingId, veriffData } = body;

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
      .eq('userId', payload.userId)
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
    const targetRoleName = onboarding.onboardingType === 'STUDENT' ? 'STUDENT' : 'PILOT';
    
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

    // Start transaction-like operations
    try {
      // 1. Update user with Veriff data and mark as verified
      const userUpdates: any = {
        identityVerified: true,
        identityVerifiedAt: new Date().toISOString(),
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (veriffData) {
        userUpdates.veriffData = veriffData;
      }

      const { error: userUpdateError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', payload.userId);

      if (userUpdateError) {
        console.error('Error updating user:', userUpdateError);
        throw new Error('Failed to update user');
      }

      // 2. Remove PROSPECT role and add target role
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
        .eq('userId', payload.userId)
        .eq('roleId', prospectRole.id);

      if (removeProspectError) {
        console.error('Error removing PROSPECT role:', removeProspectError);
        throw new Error('Failed to update user roles');
      }

      // Add target role
      const { error: addRoleError } = await supabase
        .from('user_roles')
        .insert({
          id: crypto.randomUUID(),
          userId: payload.userId,
          roleId: targetRole.id
        });

      if (addRoleError) {
        console.error('Error adding target role:', addRoleError);
        throw new Error('Failed to update user roles');
      }

      // 3. Create user payment plan record
      const paymentPlanData = {
        id: crypto.randomUUID(),
        userId: payload.userId,
        paymentPlanId: onboarding.paymentPlanId,
        hourPackageId: onboarding.hourPackageId,
        status: 'PENDING',
        totalAmount: 0, // Will be set based on plan/package
        paidAmount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Get the amount based on plan or package
      if (onboarding.onboardingType === 'STUDENT' && onboarding.paymentPlanId) {
        const { data: paymentPlan, error: planError } = await supabase
          .from('payment_plans')
          .select('totalAmount')
          .eq('id', onboarding.paymentPlanId)
          .single();

        if (!planError && paymentPlan) {
          paymentPlanData.totalAmount = paymentPlan.totalAmount;
        }
      } else if (onboarding.onboardingType === 'PILOT' && onboarding.hourPackageId) {
        const { data: hourPackage, error: packageError } = await supabase
          .from('hour_packages')
          .select('price')
          .eq('id', onboarding.hourPackageId)
          .single();

        if (!packageError && hourPackage) {
          paymentPlanData.totalAmount = hourPackage.price;
        }
      }

      const { error: paymentPlanError } = await supabase
        .from('user_payment_plans')
        .insert(paymentPlanData);

      if (paymentPlanError) {
        console.error('Error creating payment plan:', paymentPlanError);
        // Don't fail the entire process for this
      }

      // 4. Update onboarding status to completed
      const { error: onboardingUpdateError } = await supabase
        .from('user_onboarding')
        .update({
          status: 'COMPLETED',
          contractSigned: true,
          contractSignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
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
          contractSigned: true,
          contractSignedAt: new Date().toISOString()
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