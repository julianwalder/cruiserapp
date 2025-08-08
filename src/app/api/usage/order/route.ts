import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import microserviceClient from '@/lib/microservice-client';

export async function POST(request: NextRequest) {
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

    // Get user to check permissions
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
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

    // Check user roles and determine access level
    const userRoles = user.user_roles.map((userRole: any) => userRole.roles.name);
    const isAdmin = userRoles.some(role => ['SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'].includes(role));
    const isPilot = userRoles.includes('PILOT');
    const isStudent = userRoles.includes('STUDENT');
    const isInstructor = userRoles.includes('INSTRUCTOR');
    const isProspect = userRoles.includes('PROSPECT');

    // Determine if user can order hours
    const canOrder = isAdmin || isPilot || isStudent || isInstructor || isProspect;

    if (!canOrder) {
      return NextResponse.json({ error: 'Insufficient permissions to order hours' }, { status: 403 });
    }

    const { clientId, hours, price } = await request.json();

    if (!clientId || !hours || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For non-admins, they can only order for themselves
    if (!isAdmin && clientId !== user.email) {
      return NextResponse.json({ error: 'You can only order hours for yourself' }, { status: 403 });
    }

    // Get client information
    const clientEmail = clientId;
    const clientName = isAdmin ? 'Stefan Avadanei' : `${user.firstName} ${user.lastName}`; // For non-admins, use their own name

    // Prepare data for microservice
    const invoiceData = {
      userId: user.id,
      packageId: `package-${Date.now()}`,
      packageName: `${hours} Hour Flight Package`,
      hours: hours,
      pricePerHour: price / hours,
      totalPrice: price,
      currency: 'EUR',
      validityDays: 365, // 1 year validity
              userData: {
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: clientEmail,
          address: 'N/A',
          city: 'N/A',
          region: 'N/A',
          country: 'N/A',
          cnp: 'N/A',
        },
      paymentMethod: 'card',
      paymentLink: true,
      vatPercentage: 21,
      pricesIncludeVat: true,
      convertToRON: true,
    };

    // Send command to microservice
    const microserviceResponse = await microserviceClient.issueProformaInvoice(invoiceData);

    if (!microserviceResponse.success) {
      console.error('Microservice error:', microserviceResponse.error);
      return NextResponse.json({
        error: 'Failed to place order',
        details: microserviceResponse.error,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Hour package ordered successfully',
      data: {
        invoiceId: microserviceResponse.data?.invoiceId,
        invoiceNumber: microserviceResponse.data?.invoiceNumber,
        microserviceId: microserviceResponse.data?.microserviceId,
        paymentLink: microserviceResponse.data?.paymentLink,
        status: microserviceResponse.data?.status,
        hours: hours,
        price: price
      }
    });

  } catch (error) {
    console.error('Error in client hours order API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 