import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import microserviceClient from '@/lib/microservice-client';
import { z } from 'zod';

// Validation schema for hour package order
const hourPackageOrderSchema = z.object({
  packageId: z.string(),
  packageName: z.string(),
  hours: z.number().positive(),
  pricePerHour: z.number().positive(),
  totalPrice: z.number().positive(),
  currency: z.string().default('EUR'),
  validityDays: z.number().positive().default(365),
});

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

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = hourPackageOrderSchema.parse(body);

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
      packageId: validatedData.packageId,
      packageName: validatedData.packageName,
      hours: validatedData.hours,
      pricePerHour: validatedData.pricePerHour,
      totalPrice: validatedData.totalPrice,
      currency: validatedData.currency,
      validityDays: validatedData.validityDays,
      userData: {
        userId: user.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        address: userData.address || 'N/A',
        city: userData.city || 'N/A',
        region: userData.state || 'N/A',
        country: userData.country || 'N/A',
        cnp: userData.personalNumber || 'N/A',
        companyId: companyData?.id,
        companyName: companyData?.name,
        companyVatCode: companyData?.vatCode,
        companyAddress: companyData?.address,
        companyCity: companyData?.city,
        companyCountry: companyData?.country,
      },
      paymentMethod: 'card',
      paymentLink: true,
      vatPercentage: 21,
      pricesIncludeVat: true,
      convertToRON: true,
    };

    // Send command to microservice
    console.log('Sending data to microservice:', JSON.stringify(invoiceData, null, 2));
    const microserviceResponse = await microserviceClient.issueProformaInvoice(invoiceData);

    if (!microserviceResponse.success) {
      console.error('Microservice error:', microserviceResponse.error);
      console.error('Full microservice response:', JSON.stringify(microserviceResponse, null, 2));
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
        package: {
          name: validatedData.packageName,
          hours: validatedData.hours,
          totalPrice: validatedData.totalPrice,
          currency: validatedData.currency,
        },
        userData: {
          name: `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          hasCompany: !!companyData,
        },
      },
    });

  } catch (error) {
    console.error('Error in POST /api/hour-packages/order:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.issues,
      }, { status: 400 });
    }

    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
