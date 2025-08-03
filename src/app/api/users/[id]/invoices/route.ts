import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { InvoiceImportService } from '@/lib/invoice-import-service';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = request.nextUrl.pathname.split('/')[3]; // Extract user ID from /api/users/[id]/invoices
    
    // Check if user has admin role or is viewing their own invoices
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    const { data: currentUser, error: userError } = await supabase
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

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasAdminRole = currentUser.user_roles?.some((userRole: any) => 
      userRole.roles.name === 'ADMIN' || userRole.roles.name === 'SUPER_ADMIN'
    );
    
    // Only allow users to view their own invoices or admins to view any user's invoices
    if (currentUser.id !== userId && !hasAdminRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Fetch user invoices
    const invoices = await InvoiceImportService.getUserInvoices(userId);

    // Apply filters
    let filteredInvoices = invoices;

    // Filter by date range
    if (startDate || endDate) {
      filteredInvoices = filteredInvoices.filter(invoice => {
        const invoiceDate = new Date(invoice.issue_date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start && invoiceDate < start) return false;
        if (end && invoiceDate > end) return false;
        return true;
      });
    }

    // Filter by status
    if (status && status !== 'all') {
      filteredInvoices = filteredInvoices.filter(invoice => 
        invoice.status.toLowerCase() === status.toLowerCase()
      );
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredInvoices = filteredInvoices.filter(invoice => 
        invoice.smartbill_id.toLowerCase().includes(searchLower) ||
        invoice.client.name.toLowerCase().includes(searchLower) ||
        invoice.client.email?.toLowerCase().includes(searchLower) ||
        invoice.items.some(item => item.name.toLowerCase().includes(searchLower))
      );
    }

    // Calculate summary statistics
    const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
    const totalHours = filteredInvoices.reduce((sum, invoice) => {
      const hours = invoice.items.reduce((itemSum, item) => {
        if (item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H') {
          return itemSum + item.quantity;
        }
        return itemSum;
      }, 0);
      return sum + hours;
    }, 0);

    return NextResponse.json({
      invoices: filteredInvoices,
      summary: {
        totalInvoices: filteredInvoices.length,
        totalAmount,
        totalHours,
        currency: filteredInvoices[0]?.currency || 'RON'
      }
    });

  } catch (error) {
    console.error('Error fetching user invoices:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch user invoices',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 