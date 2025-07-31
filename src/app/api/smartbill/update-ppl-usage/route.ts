import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PPLCourseService } from '@/lib/ppl-course-service';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Updating PPL course usage for all users...');

    // Get all unique user IDs that have PPL courses
    const { data: pplTranches, error: pplError } = await supabase
      .from('ppl_course_tranches')
      .select('user_id')
      .order('user_id');

    if (pplError) {
      console.error('Error fetching PPL tranches:', pplError.message);
      return NextResponse.json(
        { error: 'Failed to fetch PPL tranches' },
        { status: 500 }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(pplTranches.map(t => t.user_id))];
    console.log(`Found ${userIds.length} users with PPL courses`);

    let updatedUsers = 0;
    const errors: string[] = [];

    // Update PPL usage for each user
    for (const userId of userIds) {
      try {
        await PPLCourseService.updatePPLCourseUsage(userId);
        updatedUsers++;
        console.log(`✅ Updated PPL usage for user ${userId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error updating PPL usage for user ${userId}:`, errorMessage);
        errors.push(`User ${userId}: ${errorMessage}`);
      }
    }

    console.log(`🎯 Updated PPL usage for ${updatedUsers} users`);

    return NextResponse.json({
      success: true,
      message: `Successfully updated PPL usage for ${updatedUsers} users`,
      updatedUsers,
      totalUsers: userIds.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error updating PPL usage:', error);
    return NextResponse.json(
      { error: 'Failed to update PPL usage' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to update PPL course usage for all users'
  });
} 