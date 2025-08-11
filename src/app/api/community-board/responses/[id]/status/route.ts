import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { getSupabaseClient } from '@/lib/supabase';

// PATCH /api/community-board/responses/[id]/status - Update response status
async function updateResponseStatus(request: NextRequest, currentUser: any, responseId: string) {
  try {
    const body = await request.json();
    const { status } = body;
    
    // Validate status
    if (!['accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "accepted" or "rejected"' },
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
    
    // First, get the response to check if the current user is the post author
    const { data: response, error: responseError } = await supabase
      .from('help_responses')
      .select(`
        id,
        post_id,
        status,
        help_posts!help_responses_post_id_fkey (
          author_id
        )
      `)
      .eq('id', responseId)
      .single();
    
    if (responseError || !response) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }
    
    // Check if current user is the post author
    if (response.help_posts.author_id !== currentUser.id) {
      return NextResponse.json(
        { error: 'Only the post author can update response status' },
        { status: 403 }
      );
    }
    
    // Check if response is already processed
    if (response.status !== 'proposed') {
      return NextResponse.json(
        { error: 'Response has already been processed' },
        { status: 400 }
      );
    }
    
    // Update the response status
    const { data: updatedResponse, error: updateError } = await supabase
      .from('help_responses')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', responseId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating response status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update response status' },
        { status: 500 }
      );
    }
    
    // If accepting a response, update the post status to 'matched'
    if (status === 'accepted') {
      const { error: postUpdateError } = await supabase
        .from('help_posts')
        .update({ 
          status: 'matched',
          updated_at: new Date().toISOString()
        })
        .eq('id', response.post_id);
      
      if (postUpdateError) {
        console.error('Error updating post status:', postUpdateError);
        // Don't fail the response update if post update fails
      }
    }
    
    return NextResponse.json({
      message: `Response ${status} successfully`,
      response: {
        id: updatedResponse.id,
        postId: updatedResponse.post_id,
        responderId: updatedResponse.responder_id,
        message: updatedResponse.message,
        status: updatedResponse.status,
        createdAt: updatedResponse.created_at,
        updatedAt: updatedResponse.updated_at,
      },
    });
  } catch (error) {
    console.error('Error in updateResponseStatus:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(async (request: NextRequest, currentUser: any) => {
    return await updateResponseStatus(request, currentUser, params.id);
  })(request);
}
