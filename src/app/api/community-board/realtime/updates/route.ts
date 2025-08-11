import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { getSupabaseClient } from '@/lib/supabase';

async function getUpdates(request: NextRequest, currentUser: any) {
  try {
    const body = await request.json();
    const { lastCheckTime } = body;

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('Supabase client not initialized');
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    const updates: any[] = [];
    const checkTime = new Date(lastCheckTime || 0);
    
    console.log('Checking for updates since:', checkTime.toISOString());

    // Check for new posts
    try {
      const { data: newPosts, error: postsError } = await supabase
        .from('help_posts')
        .select(`
          id,
          type,
          title,
          body,
          base_icao,
          category,
          status,
          created_at,
          updated_at,
          author_id,
          users!help_posts_author_id_fkey (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .gte('created_at', checkTime.toISOString())
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching new posts:', postsError);
      } else if (newPosts) {
        console.log('Found', newPosts.length, 'new posts');
        newPosts.forEach(post => {
          updates.push({
            type: 'post_created',
            data: {
              id: post.id,
              type: post.type,
              title: post.title,
              body: post.body,
              baseIcao: post.base_icao,
              category: post.category,
              status: post.status,
              createdAt: post.created_at,
              updatedAt: post.updated_at,
              authorId: post.author_id,
              authorFirstName: post.users?.first_name,
              authorLastName: post.users?.last_name,
              authorAvatarUrl: post.users?.avatar_url,
              responseCount: 0,
            }
          });
        });
      }
    } catch (error) {
      console.error('Error in new posts query:', error);
    }

    // Check for new responses
    const { data: newResponses, error: responsesError } = await supabase
      .from('help_responses')
      .select(`
        id,
        post_id,
        message,
        status,
        created_at,
        responder_id,
        users!help_responses_responder_id_fkey (
          first_name,
          last_name,
          avatar_url
        ),
        help_posts!help_responses_post_id_fkey (
          author_id
        )
      `)
      .gte('created_at', checkTime.toISOString())
      .order('created_at', { ascending: false });

    if (responsesError) {
      console.error('Error fetching new responses:', responsesError);
    } else if (newResponses) {
      newResponses.forEach(response => {
        updates.push({
          type: 'response_created',
          data: {
            id: response.id,
            postId: response.post_id,
            message: response.message,
            status: response.status,
            createdAt: response.created_at,
            responderId: response.responder_id,
            responderFirstName: response.users?.first_name,
            responderLastName: response.users?.last_name,
            responderAvatarUrl: response.users?.avatar_url,
            postAuthorId: response.help_posts?.author_id,
          }
        });
      });
    }

    // Check for updated posts (status changes, etc.)
    const { data: updatedPosts, error: updatedPostsError } = await supabase
      .from('help_posts')
      .select(`
        id,
        type,
        title,
        status,
        updated_at
      `)
      .gte('updated_at', checkTime.toISOString())
      .neq('created_at', 'updated_at') // Only posts that were actually updated, not created
      .order('updated_at', { ascending: false });

    if (updatedPostsError) {
      console.error('Error fetching updated posts:', updatedPostsError);
    } else if (updatedPosts) {
      updatedPosts.forEach(post => {
        updates.push({
          type: 'post_updated',
          data: {
            id: post.id,
            type: post.type,
            title: post.title,
            status: post.status,
            updatedAt: post.updated_at,
          }
        });
      });
    }

    console.log('Returning', updates.length, 'updates');
    return NextResponse.json(updates);
  } catch (error) {
    console.error('Error in getUpdates:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return requireAuth(async (request: NextRequest, currentUser: any) => {
    return await getUpdates(request, currentUser);
  })(request);
}

export async function GET(request: NextRequest) {
  // Simple test endpoint
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Realtime updates endpoint is working',
    timestamp: new Date().toISOString()
  });
}
