import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/companies - List companies
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('companies')
      .select(`
        *,
        user_company_relationships (
          user_id,
          relationship_type,
          is_primary,
          users (
            id,
            email,
            firstName,
            lastName,
            status
          )
        )
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,vat_code.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Get total count first
    const { count: total } = await query;

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    query = query.order('created_at', { ascending: false });

    // Execute query
    const { data: companies, error } = await query;

    if (error) {
      console.error('Error fetching companies:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      companies: companies || [],
      pagination: {
        page,
        limit,
        total: total || 0,
        pages: Math.ceil((total || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Get companies error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/companies - Create a new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, vat_code, email, phone, address, city, country, status } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Check if company with same VAT code already exists
    if (vat_code) {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('vat_code', vat_code)
        .single();

      if (existingCompany) {
        return NextResponse.json(
          { error: 'Company with this VAT code already exists' },
          { status: 400 }
        );
      }
    }

    // Create company
    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name,
        vat_code: vat_code || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        country: country || 'Romania',
        status: status || 'Active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating company:', error);
      return NextResponse.json(
        { error: 'Failed to create company' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      company,
      message: 'Company created successfully'
    });

  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 