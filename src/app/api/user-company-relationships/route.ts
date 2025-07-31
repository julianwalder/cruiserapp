import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/user-company-relationships - List user-company relationships
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const companyId = searchParams.get('companyId');
    const relationshipType = searchParams.get('relationshipType');

    let query = supabase
      .from('user_company_relationships')
      .select(`
        *,
        users (
          id,
          email,
          firstName,
          lastName,
          status
        ),
        companies (
          id,
          name,
          vat_code,
          email,
          status
        )
      `);

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (relationshipType) {
      query = query.eq('relationship_type', relationshipType);
    }

    query = query.order('created_at', { ascending: false });

    // Execute query
    const { data: relationships, error } = await query;

    if (error) {
      console.error('Error fetching user-company relationships:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      relationships: relationships || []
    });

  } catch (error) {
    console.error('Get user-company relationships error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/user-company-relationships - Create a new user-company relationship
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, companyId, relationshipType, isPrimary, startDate, endDate } = body;

    if (!userId || !companyId) {
      return NextResponse.json(
        { error: 'User ID and Company ID are required' },
        { status: 400 }
      );
    }

    // Check if relationship already exists
    const { data: existingRelationship } = await supabase
      .from('user_company_relationships')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    if (existingRelationship) {
      return NextResponse.json(
        { error: 'User-company relationship already exists' },
        { status: 400 }
      );
    }

    // If this is marked as primary, unset other primary relationships for this user
    if (isPrimary) {
      await supabase
        .from('user_company_relationships')
        .update({ is_primary: false })
        .eq('user_id', userId);
    }

    // Create relationship
    const { data: relationship, error } = await supabase
      .from('user_company_relationships')
      .insert({
        user_id: userId,
        company_id: companyId,
        relationship_type: relationshipType || 'employee',
        is_primary: isPrimary || false,
        start_date: startDate || null,
        end_date: endDate || null
      })
      .select(`
        *,
        users (
          id,
          email,
          firstName,
          lastName
        ),
        companies (
          id,
          name,
          vat_code
        )
      `)
      .single();

    if (error) {
      console.error('Error creating user-company relationship:', error);
      return NextResponse.json(
        { error: 'Failed to create user-company relationship' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      relationship,
      message: 'User-company relationship created successfully'
    });

  } catch (error) {
    console.error('Create user-company relationship error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 