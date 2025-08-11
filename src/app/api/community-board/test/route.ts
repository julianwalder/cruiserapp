import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Test if help_posts table exists
    const { data: posts, error: postsError } = await supabase
      .from('help_posts')
      .select('count', { count: 'exact', head: true });

    if (postsError) {
      return NextResponse.json({
        error: 'help_posts table error',
        details: postsError.message,
        code: postsError.code
      }, { status: 500 });
    }

    // Test if users table exists
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (usersError) {
      return NextResponse.json({
        error: 'users table error',
        details: usersError.message,
        code: usersError.code
      }, { status: 500 });
    }

    // Test if help_responses table exists
    const { data: responses, error: responsesError } = await supabase
      .from('help_responses')
      .select('count', { count: 'exact', head: true });

    if (responsesError) {
      return NextResponse.json({
        error: 'help_responses table error',
        details: responsesError.message,
        code: responsesError.code
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'All database tables are accessible',
      tables: {
        help_posts: 'accessible',
        users: 'accessible',
        help_responses: 'accessible'
      }
    });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
