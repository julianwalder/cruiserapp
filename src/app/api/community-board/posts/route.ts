import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/community-board/posts - List all open posts
async function getPosts(request: NextRequest, currentUser: any) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const baseIcao = searchParams.get('baseIcao');
    
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    // Build query using direct table joins (fallback if view doesn't exist)
    let query = supabase
      .from('help_posts')
      .select(`
        *,
        users!help_posts_author_id_fkey (
          "firstName",
          "lastName",
          "avatarUrl"
        )
      `, { count: 'exact' })
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (baseIcao) {
      query = query.eq('base_icao', baseIcao);
    }
    
    // Get total count
    const { count: total } = await query;
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    // Execute query
    const { data: posts, error } = await query;
    
    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }
    
    // Transform data to match frontend expectations
    const transformedPosts = await Promise.all((posts || []).map(async (post) => {
      // Get response count for each post
      const { count: responseCount, error: countError } = await supabase
        .from('help_responses')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)
        .eq('status', 'proposed');

      if (countError) {
        console.error('Error counting responses for post', post.id, ':', countError);
      }

      return {
        id: post.id,
        type: post.type,
        title: post.title,
        body: post.body,
        baseIcao: post.base_icao,
        whenTs: post.when_ts,
        category: post.category,
        seats: post.seats,
        status: post.status,
        expiresAt: post.expires_at,
        createdAt: post.created_at,
        authorId: post.author_id,
        authorFirstName: post.users?.firstName || 'Unknown',
        authorLastName: post.users?.lastName || 'User',
        authorAvatarUrl: post.users?.avatarUrl,
        responseCount: responseCount || 0,
      };
    }));
    
    return NextResponse.json({
      posts: transformedPosts,
      pagination: {
        page,
        limit,
        total: total || 0,
        pages: Math.ceil((total || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in getPosts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/community-board/posts - Create a new post
async function createPost(request: NextRequest, currentUser: any) {
  try {
    const body = await request.json();
    const { type, title, body: postBody, baseIcao, whenTs, category, seats } = body;
    
    // Validate required fields
    if (!type || !title || !postBody || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate type
    if (!['ask', 'offer'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid post type' },
        { status: 400 }
      );
    }
    
    // Validate category
    const validCategories = ['safety_pilot', 'cost_sharing', 'training_help', 'social_flight', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
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
    

    
    // Create the post
    const { data: post, error } = await supabase
      .from('help_posts')
      .insert({
        author_id: currentUser.id,
        type,
        title: title.trim(),
        body: postBody.trim(),
        base_icao: baseIcao?.trim() || null,
        when_ts: whenTs || null,
        category,
        seats: seats ? parseInt(seats) : null,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
      })
      .select(`
        *,
        users!help_posts_author_id_fkey (
          "firstName",
          "lastName",
          "avatarUrl"
        )
      `)
      .single();
    
          if (error) {
        console.error('Error creating post:', error);
        return NextResponse.json(
          { error: `Failed to create post: ${error.message}` },
          { status: 500 }
        );
      }

    // Send WebSocket notification for real-time updates
    try {
      await broadcastPostCreated(post, currentUser);
    } catch (wsError) {
      console.error('Failed to send WebSocket notification:', wsError);
      // Don't fail the post creation if WebSocket fails
    }
    
    return NextResponse.json({
      message: 'Post created successfully',
      post: {
        id: post.id,
        type: post.type,
        title: post.title,
        body: post.body,
        baseIcao: post.base_icao,
        whenTs: post.when_ts,
        category: post.category,
        seats: post.seats,
        status: post.status,
        expiresAt: post.expires_at,
        createdAt: post.created_at,
        authorId: post.author_id,
        authorFirstName: post.users?.firstName || 'Unknown',
        authorLastName: post.users?.lastName || 'User',
        authorAvatarUrl: post.users?.avatarUrl,
        responseCount: 0, // New posts start with 0 responses
      },
    });
  } catch (error) {
    console.error('Error in createPost:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to broadcast post creation via WebSocket
async function broadcastPostCreated(post: any, currentUser: any) {
  try {
    // In a real implementation, you'd send this to your WebSocket server
    // For now, we'll log the notification
    console.log('=== WEBSOCKET NOTIFICATION ===');
    console.log('Post created:', {
      type: 'post_created',
      data: {
        id: post.id,
        type: post.type,
        title: post.title,
        body: post.body,
        baseIcao: post.base_icao,
        whenTs: post.when_ts,
        category: post.category,
        seats: post.seats,
        status: post.status,
        expiresAt: post.expires_at,
        createdAt: post.created_at,
        authorId: post.author_id,
        authorFirstName: post.users?.firstName || 'Unknown',
        authorLastName: post.users?.lastName || 'User',
        authorAvatarUrl: post.users?.avatarUrl,
        responseCount: 0,
      }
    });
    console.log('=============================');
    
    // TODO: Send to WebSocket server
    // await fetch('/api/ws', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     type: 'post_created',
    //     data: { ... }
    //   })
    // });
  } catch (error) {
    console.error('Error broadcasting post creation:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  return requireAuth(async (request: NextRequest, currentUser: any) => {
    return await getPosts(request, currentUser);
  })(request);
}

export async function POST(request: NextRequest) {
  return requireAuth(async (request: NextRequest, currentUser: any) => {
    return await createPost(request, currentUser);
  })(request);
}
