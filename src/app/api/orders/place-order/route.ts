import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import microserviceClient from '@/lib/microservice-client';
import { z } from 'zod';

// Validation schema for place order request
const placeOrderSchema = z.object({
  packageId: z.string().uuid('Invalid package ID'),
  paymentMethod: z.enum(['proforma', 'fiscal']),
  paymentLink: z.boolean().optional().default(false),
});

// POST /api/orders/place-order - Place order via microservice
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const validatedData = placeOrderSchema.parse(body);

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Get hour package template
    const { data: packageTemplate, error: packageError } = await supabase
      .from('hour_package_templates')
      .select('*')
      .eq('id', validatedData.packageId)
      .eq('is_active', true)
      .single();

    if (packageError || !packageTemplate) {
      return NextResponse.json(
        { error: 'Hour package not found or inactive' },
        { status: 404 }
      );
    }

    // Get user data for invoice
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        phone,
        address,
        city,
        state,
        "zipCode",
        country,
        "personalNumber",
        "veriffPersonIdNumber"
      `)
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Unable to retrieve user data' },
        { status: 400 }
      );
    }

    // Get company data if user has one
    let companyData = null;
    if (userData.companyId) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          "vatCode",
          address,
          city,
          country
        `)
        .eq('id', userData.companyId)
        .single();

      if (!companyError && company) {
        companyData = company;
      }
    }

    // Prepare invoice data for microservice
    const invoiceData = {
      userId: user.id,
      packageId: packageTemplate.id,
      packageName: packageTemplate.name,
      hours: packageTemplate.hours,
      pricePerHour: packageTemplate.price_per_hour,
      totalPrice: packageTemplate.total_price,
      currency: packageTemplate.currency,
      validityDays: packageTemplate.validity_days,
      userData: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        address: userData.address,
        city: userData.city,
        state: userData.state,
        zipCode: userData.zipCode,
        country: userData.country,
        cnp: userData.personalNumber,
        idNumber: userData.veriffPersonIdNumber,
        companyId: companyData?.id,
        companyName: companyData?.name,
        companyVatCode: companyData?.vatCode,
        companyAddress: companyData?.address,
        companyCity: companyData?.city,
        companyCountry: companyData?.country,
      },
      paymentMethod: validatedData.paymentMethod,
      paymentLink: validatedData.paymentLink,
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

    // Store order record in database
    const orderId = crypto.randomUUID();
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        userId: user.id,
        packageId: packageTemplate.id,
        status: 'pending',
        totalAmount: packageTemplate.total_price,
        currency: packageTemplate.currency,
        paymentMethod: validatedData.paymentMethod,
        microserviceInvoiceId: microserviceResponse.data?.invoiceId,
        microserviceId: microserviceResponse.data?.microserviceId,
        paymentLink: microserviceResponse.data?.paymentLink,
        createdAt: new Date().toISOString(),
      });

    if (orderError) {
      console.error('Error storing order:', orderError);
      // Don't fail the request if order storage fails, but log it
    }

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId,
        invoiceId: microserviceResponse.data?.invoiceId,
        microserviceId: microserviceResponse.data?.microserviceId,
        paymentLink: microserviceResponse.data?.paymentLink,
        status: microserviceResponse.data?.status,
        package: {
          name: packageTemplate.name,
          hours: packageTemplate.hours,
          totalPrice: packageTemplate.total_price,
          currency: packageTemplate.currency,
        },
        userData: {
          name: `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          hasCompany: !!companyData,
        },
      },
    });

  } catch (error) {
    console.error('Error in POST /api/orders/place-order:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.issues,
      }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
