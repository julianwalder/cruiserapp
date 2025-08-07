import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { EnhancedVeriffWebhook } from '@/lib/enhanced-veriff-webhook';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    // Await params before destructuring
    const { userId } = await params;

    // Check if user is requesting their own data or is an admin
    if (decoded.userId !== userId && !decoded.roles?.includes('ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get comprehensive verification data
    try {
      const verificationData = await EnhancedVeriffWebhook.getUserVerificationData(userId);
      
      return NextResponse.json({
        success: true,
        data: verificationData
      });
    } catch (verificationError) {
      console.error('Verification data fetch error:', verificationError);
      
      // Fallback: return basic user verification status
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Database connection error');
      }
      
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, "identityVerified"')
        .eq('id', userId)
        .single();
      
      if (userError) {
        throw new Error(`Failed to fetch user data: ${userError.message}`);
      }
      
      return NextResponse.json({
        success: true,
        data: {
          isVerified: user?.identityVerified || false,
          status: user?.identityVerified ? 'approved' : 'not_started'
        }
      });
    }

  } catch (error) {
    console.error('Error fetching verification data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch verification data',
        details: (error as any)?.message || String(error)
      },
      { status: 500 }
    );
  }
} 