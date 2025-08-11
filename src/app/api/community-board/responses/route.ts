import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { getSupabaseClient } from '@/lib/supabase';
import { emailNotificationService } from '@/lib/email-notifications';

// POST /api/community-board/responses - Create a new response
async function createResponse(request: NextRequest, currentUser: any) {
  try {
    const body = await request.json();
    const { postId, message } = body;
    
    // Validate required fields
    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
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
    
    // Check if the post exists and is open
    const { data: post, error: postError } = await supabase
      .from('help_posts')
      .select('id, status, author_id')
      .eq('id', postId)
      .single();
    
    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    if (post.status !== 'open') {
      return NextResponse.json(
        { error: 'Post is not open for responses' },
        { status: 400 }
      );
    }
    
    // Check if user is not responding to their own post
    if (post.author_id === currentUser.id) {
      return NextResponse.json(
        { error: 'You cannot respond to your own post' },
        { status: 400 }
      );
    }
    
    // Check if user has already responded to this post
    const { data: existingResponse, error: checkError } = await supabase
      .from('help_responses')
      .select('id')
      .eq('post_id', postId)
      .eq('responder_id', currentUser.id)
      .single();
    
    if (existingResponse) {
      return NextResponse.json(
        { error: 'You have already responded to this post' },
        { status: 400 }
      );
    }
    
    // Create the response
    const { data: response, error } = await supabase
      .from('help_responses')
      .insert({
        post_id: postId,
        responder_id: currentUser.id,
        message: message?.trim() || null,
        status: 'proposed',
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating response:', error);
      return NextResponse.json(
        { error: 'Failed to create response' },
        { status: 500 }
      );
    }

    // Send email notifications
    try {
      await sendEmailNotifications(postId, currentUser.id, message);
    } catch (emailError) {
      console.error('Failed to send email notifications:', emailError);
      // Don't fail the response creation if emails fail
    }

    // Send WebSocket notification for real-time updates
    try {
      console.log('=== WEBSOCKET NOTIFICATION ===');
      console.log('Response created:', {
        type: 'response_created',
        data: {
          postId: response.post_id,
          responseId: response.id,
          responderId: response.responder_id,
          message: response.message,
          status: response.status,
          createdAt: response.created_at,
        }
      });
      console.log('=============================');
    } catch (wsError) {
      console.error('Failed to send WebSocket notification:', wsError);
      // Don't fail the response creation if WebSocket fails
    }
    
    return NextResponse.json({
      message: 'Response submitted successfully',
      response: {
        id: response.id,
        postId: response.post_id,
        responderId: response.responder_id,
        message: response.message,
        status: response.status,
        createdAt: response.created_at,
      },
    });
  } catch (error) {
    console.error('Error in createResponse:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/community-board/responses?postId=xxx - Get responses for a post
async function getResponses(request: NextRequest, currentUser: any) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    
    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
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
    
    // Check if user can view responses (either post author or responder)
    const { data: post, error: postError } = await supabase
      .from('help_posts')
      .select('id, author_id')
      .eq('id', postId)
      .single();
    
    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    const isPostAuthor = post.author_id === currentUser.id;
    
    // Get responses with responder information
    let query = supabase
      .from('help_responses')
      .select(`
        *,
        users!help_responses_responder_id_fkey (
          "firstName",
          "lastName",
          "avatarUrl"
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    // If not post author, only show user's own responses
    if (!isPostAuthor) {
      query = query.eq('responder_id', currentUser.id);
    }
    
    const { data: responses, error } = await query;
    
    if (error) {
      console.error('Error fetching responses:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }
    
    // Transform data to match frontend expectations
    const transformedResponses = (responses || []).map(response => ({
      id: response.id,
      postId: response.post_id,
      responderId: response.responder_id,
      message: response.message,
      status: response.status,
      createdAt: response.created_at,
      responderFirstName: response.users?.firstName || 'Unknown',
      responderLastName: response.users?.lastName || 'User',
      responderAvatarUrl: response.users?.avatarUrl,
    }));
    
    return NextResponse.json({
      responses: transformedResponses,
    });
  } catch (error) {
    console.error('Error in getResponses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to send email notifications
async function sendEmailNotifications(postId: string, responderId: string, message?: string) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection error');
    }

    // Get post details
    const { data: post, error: postError } = await supabase
      .from('help_posts')
      .select(`
        id,
        title,
        type,
        author_id,
        users!help_posts_author_id_fkey (
          "firstName",
          "lastName",
          email
        )
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    // Get responder details
    const { data: responder, error: responderError } = await supabase
      .from('users')
      .select('"firstName", "lastName", email')
      .eq('id', responderId)
      .single();

    if (responderError || !responder) {
      throw new Error('Responder not found');
    }

    // Send email notifications
    await emailNotificationService.sendResponseNotification({
      postId: post.id,
      postTitle: post.title,
      postType: post.type,
      responderId: responderId,
      responderName: `${responder.firstName} ${responder.lastName}`,
      responderEmail: responder.email,
      message: message,
      postAuthorId: post.author_id,
      postAuthorName: `${post.users.firstName} ${post.users.lastName}`,
      postAuthorEmail: post.users.email,
    });
  } catch (error) {
    console.error('Error sending email notifications:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  return requireAuth(async (request: NextRequest, currentUser: any) => {
    return await createResponse(request, currentUser);
  })(request);
}

export async function GET(request: NextRequest) {
  return requireAuth(async (request: NextRequest, currentUser: any) => {
    return await getResponses(request, currentUser);
  })(request);
}
