import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Check if user is SUPER_ADMIN
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        user_roles!user_roles_userId_fkey (
          roles (
            name
          )
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRoles = user.user_roles.map((userRole: any) => userRole.roles.name);
    const isSuperAdmin = userRoles.includes('SUPER_ADMIN');

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions. Only SUPER_ADMIN can edit invoices.' }, { status: 403 });
    }

    const body = await request.json();
    console.log('🔍 Received update request for invoice:', params.id);
    console.log('🔍 Request body:', JSON.stringify(body, null, 2));
    
    const { 
      smartbill_id, 
      series, 
      issue_date, 
      due_date, 
      status, 
      total_amount, 
      vat_amount, 
      currency,
      client,
      items 
    } = body;

    // Validate required fields
    if (!smartbill_id || !issue_date || !client || !items) {
      console.error('❌ Missing required fields:', { smartbill_id, issue_date, client: !!client, items: !!items });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate client data
    if (!client.name) {
      console.error('❌ Client name is required');
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    // Update the invoice
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        smartbill_id,
        series,
        issue_date,
        due_date,
        status,
        total_amount,
        vat_amount,
        currency
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    // Update client information
    if (client) {
      console.log('🔍 Updating client information for invoice:', params.id);
      console.log('🔍 Client data:', JSON.stringify(client, null, 2));
      
      const { error: clientError } = await supabase
        .from('invoice_clients')
        .update({
          name: client.name,
          email: client.email,
          phone: client.phone,
          vat_code: client.vat_code,
          address: client.address,
          city: client.city,
          country: client.country,
          user_id: client.user_id || null
        })
        .eq('invoice_id', params.id);

      if (clientError) {
        console.error('❌ Error updating client:', clientError);
        console.error('❌ Error details:', JSON.stringify(clientError, null, 2));
        return NextResponse.json({ error: 'Failed to update client information' }, { status: 500 });
      }
      
      console.log('✅ Client information updated successfully');
    }

    // Update invoice items
    if (items && Array.isArray(items)) {
      // First, delete existing items
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', params.id);

      if (deleteError) {
        console.error('Error deleting existing items:', deleteError);
        return NextResponse.json({ error: 'Failed to update invoice items' }, { status: 500 });
      }

      // Then insert new items
      const itemsToInsert = items.map((item: any) => ({
        invoice_id: params.id,
        line_id: item.line_id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
        vat_rate: item.vat_rate
      }));

      const { error: insertError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (insertError) {
        console.error('Error inserting new items:', insertError);
        return NextResponse.json({ error: 'Failed to update invoice items' }, { status: 500 });
      }
    }

    return NextResponse.json({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice
    });

  } catch (error) {
    console.error('Error in invoice update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get the invoice with all related data
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_clients (
          name,
          email,
          phone,
          vat_code,
          address,
          city,
          country,
          user_id,
          company_id
        ),
        invoice_items (
          line_id,
          name,
          description,
          quantity,
          unit,
          unit_price,
          total_amount,
          vat_rate
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching invoice:', error);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice });

  } catch (error) {
    console.error('Error in invoice fetch API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 