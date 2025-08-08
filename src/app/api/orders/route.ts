import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/orders - List orders with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const userId = searchParams.get('userId') || '';

    // Check if user is admin for accessing other users' orders
    const userRoles = user.user_roles?.map(ur => ur.roles?.name || ur.role?.name) || [];
    const isAdmin = userRoles.some(role => ['SUPER_ADMIN', 'ADMIN'].includes(role));

    let query = supabase
      .from('orders')
      .select(`
        id,
        "userId",
        "packageId",
        status,
        "totalAmount",
        currency,
        "paymentMethod",
        "microserviceInvoiceId",
        "microserviceId",
        "paymentLink",
        "createdAt",
        "updatedAt",
        hour_package_templates (
          name,
          description,
          hours
        ),
        users (
          "firstName",
          "lastName",
          email
        )
      `, { count: 'exact' });

    // Apply filters
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    // Filter by user ID - users can only see their own orders unless they're admin
    if (userId && userId !== 'me') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      query = query.eq('userId', userId);
    } else if (!isAdmin) {
      // Non-admin users can only see their own orders
      query = query.eq('userId', user.id);
    }

    // Get total count first
    const { count: total } = await query;

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by creation date (newest first)
    query = query.order('createdAt', { ascending: false });

    // Execute query
    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    // Transform the data to include user and package information
    const transformedOrders = (orders || []).map(order => ({
      id: order.id,
      userId: order.userId,
      packageId: order.packageId,
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      microserviceInvoiceId: order.microserviceInvoiceId,
      microserviceId: order.microserviceId,
      paymentLink: order.paymentLink,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      package: order.hour_package_templates ? {
        name: order.hour_package_templates.name,
        description: order.hour_package_templates.description,
        hours: order.hour_package_templates.hours,
      } : null,
      user: order.users ? {
        firstName: order.users.firstName,
        lastName: order.users.lastName,
        email: order.users.email,
        fullName: `${order.users.firstName} ${order.users.lastName}`,
      } : null,
    }));

    return NextResponse.json({
      orders: transformedOrders,
      pagination: {
        page,
        limit,
        total: total || 0,
        pages: Math.ceil((total || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
