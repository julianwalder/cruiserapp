import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/community-board/invite - Get or create invite code for current user
async function getInviteCode(request: NextRequest, currentUser: any) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    // Check if user already has an invite code
    const { data: existingInvite, error: checkError } = await supabase
      .from('peer_invitations')
      .select('invite_code')
      .eq('inviter_id', currentUser.id)
      .single();
    
    if (existingInvite) {
      return NextResponse.json({
        inviteCode: existingInvite.invite_code,
      });
    }
    
    // Generate a new invite code using the database function
    const { data: inviteCode, error: rpcError } = await supabase
      .rpc('generate_invite_code');
    
    if (rpcError) {
      console.error('Error generating invite code:', rpcError);
      return NextResponse.json(
        { error: 'Failed to generate invite code' },
        { status: 500 }
      );
    }
    
    const { data: newInvite, error } = await supabase
      .from('peer_invitations')
      .insert({
        inviter_id: currentUser.id,
        invite_code: inviteCode,
      })
      .select('invite_code')
      .single();
    
    if (error) {
      console.error('Error creating invite code:', error);
      return NextResponse.json(
        { error: 'Failed to create invite code' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      inviteCode: newInvite.invite_code,
    });
  } catch (error) {
    console.error('Error in getInviteCode:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/community-board/invite - Validate invite code (for registration)
async function validateInviteCode(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode } = body;
    
    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    // Check if invite code exists
    const { data: invite, error } = await supabase
      .from('peer_invitations')
      .select('id, inviter_id, invited_user_id')
      .eq('invite_code', inviteCode)
      .single();
    
    if (error || !invite) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      );
    }
    
    // Check if invite code has already been used
    if (invite.invited_user_id) {
      return NextResponse.json(
        { error: 'Invite code has already been used' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      valid: true,
      inviteId: invite.id,
      inviterId: invite.inviter_id,
    });
  } catch (error) {
    console.error('Error in validateInviteCode:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/community-board/invite - Link user to invite code (after registration)
async function linkUserToInvite(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteId, userId } = body;
    
    if (!inviteId || !userId) {
      return NextResponse.json(
        { error: 'Invite ID and User ID are required' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    // Update the invite to link the user
    const { error } = await supabase
      .from('peer_invitations')
      .update({ invited_user_id: userId })
      .eq('id', inviteId);
    
    if (error) {
      console.error('Error linking user to invite:', error);
      return NextResponse.json(
        { error: 'Failed to link user to invite' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'User successfully linked to invite',
    });
  } catch (error) {
    console.error('Error in linkUserToInvite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return requireAuth(async (request: NextRequest, currentUser: any) => {
    return await getInviteCode(request, currentUser);
  })(request);
}

export async function POST(request: NextRequest) {
  return validateInviteCode(request);
}

export async function PUT(request: NextRequest) {
  return linkUserToInvite(request);
}
