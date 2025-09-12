import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
        user_roles (
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
    const { id: invoiceId } = await params;
    
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

    // Check if this is a status-only update or if we're updating an existing invoice
    const isStatusOnlyUpdate = Object.keys(body).length === 1 && body.hasOwnProperty('status');
    const isUpdatingExistingInvoice = body.id && body.id === invoiceId;
    
    if (!isStatusOnlyUpdate && !isUpdatingExistingInvoice) {
      // Validate required fields for new invoice creation
      if (!smartbill_id || !issue_date || !client || !items) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Validate client data
      if (!client.name && !client.email) {
        return NextResponse.json({ error: 'Client name or email is required' }, { status: 400 });
      }
    }

    // Prepare update data based on what's being updated
    const updateData: any = {};
    
    if (isStatusOnlyUpdate) {
      // For status-only updates, only update the status
      updateData.status = status;
    } else if (isUpdatingExistingInvoice) {
      // For existing invoice updates, only update fields that are provided
      if (smartbill_id !== undefined) updateData.smartbill_id = smartbill_id;
      if (series !== undefined) updateData.series = series;
      if (issue_date !== undefined) updateData.issue_date = issue_date;
      if (due_date !== undefined) updateData.due_date = due_date;
      if (status !== undefined) updateData.status = status;
      if (total_amount !== undefined) updateData.total_amount = total_amount;
      if (vat_amount !== undefined) updateData.vat_amount = vat_amount;
      if (currency !== undefined) updateData.currency = currency;
    } else {
      // For new invoice creation, update all fields
      updateData.smartbill_id = smartbill_id;
      updateData.series = series;
      updateData.issue_date = issue_date;
      updateData.due_date = due_date;
      updateData.status = status;
      updateData.total_amount = total_amount;
      updateData.vat_amount = vat_amount;
      updateData.currency = currency;
    }

    // Update the invoice
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    // Update or create client information (only for full updates and when client data is provided)
    if (client && !isStatusOnlyUpdate) {
      
      // First, check if client record exists
      const { data: existingClient, error: checkError } = await supabase
        .from('invoice_clients')
        .select('id')
        .eq('invoice_id', invoiceId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        return NextResponse.json({ error: 'Failed to check client information' }, { status: 500 });
      }
      
      let clientError;
      
      if (existingClient) {
        // Update existing client record
        const { error: updateError } = await supabase
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
          .eq('invoice_id', invoiceId);
        clientError = updateError;
      } else {
        // Create new client record
        const { error: createError } = await supabase
          .from('invoice_clients')
          .insert({
            invoice_id: invoiceId,
            name: client.name,
            email: client.email,
            phone: client.phone,
            vat_code: client.vat_code,
            address: client.address,
            city: client.city,
            country: client.country,
            user_id: client.user_id || null
          });
        clientError = createError;
      }

      if (clientError) {
        return NextResponse.json({ error: 'Failed to update client information' }, { status: 500 });
      }
    }

    // Update invoice items (only for full updates)
    if (items && Array.isArray(items) && !isStatusOnlyUpdate) {
      // First, delete existing items
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceId);

      if (deleteError) {
        console.error('Error deleting existing items:', deleteError);
        return NextResponse.json({ error: 'Failed to update invoice items' }, { status: 500 });
      }

      // Then insert new items
      const itemsToInsert = items.map((item: any) => ({
        invoice_id: invoiceId,
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
  { params }: { params: Promise<{ id: string }> }
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

    const { id: invoiceId } = await params;

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
      .eq('id', invoiceId)
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