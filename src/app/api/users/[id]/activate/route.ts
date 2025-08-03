import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { z } from 'zod';

const activateUserSchema = z.object({
  paymentReference: z.string().optional(),
  paymentAmount: z.number().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user roles from JWT token
    const payload = AuthService.verifyToken(token);
    const userRoles = payload?.roles || [];
    
    // Check if user has permission to activate users (ADMIN+ or BASE_MANAGER+)
    if (!AuthService.hasRole(userRoles, 'ADMIN') && 
        !AuthService.hasRole(userRoles, 'SUPER_ADMIN') && 
        !AuthService.hasRole(userRoles, 'BASE_MANAGER')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to activate users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = activateUserSchema.parse(body);

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Get the target user
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        status,
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('id', params.id)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is currently inactive
    if (targetUser.status !== 'INACTIVE') {
      return NextResponse.json(
        { error: 'User is not inactive and cannot be activated' },
        { status: 400 }
      );
    }

    // Update user status to ACTIVE
    const { error: updateError } = await supabase
      .from('users')
      .update({
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error activating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to activate user' },
        { status: 500 }
      );
    }

    // Log the activation (you might want to create a separate table for payment logs)
    console.log(`User ${targetUser.email} activated by ${user.email}`, {
      paymentReference: validatedData.paymentReference,
      paymentAmount: validatedData.paymentAmount,
      paymentMethod: validatedData.paymentMethod,
      notes: validatedData.notes,
      activatedAt: new Date().toISOString(),
      activatedBy: user.id,
    });

    return NextResponse.json({
      message: 'User activated successfully',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        status: 'ACTIVE',
      },
      paymentInfo: {
        reference: validatedData.paymentReference,
        amount: validatedData.paymentAmount,
        method: validatedData.paymentMethod,
        notes: validatedData.notes,
      },
    });

  } catch (error: any) {
    console.error('User activation error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 