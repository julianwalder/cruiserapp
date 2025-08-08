import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../lib/auth';
import { getSupabaseClient } from '../../../lib/supabase';
import { ProformaInvoiceService } from '../../../lib/proforma-invoice-service';
import { z } from 'zod';

// Validation schema for proforma invoice request
const proformaInvoiceSchema = z.object({
  packageId: z.string().uuid('Invalid package ID'),
  paymentMethod: z.enum(['proforma', 'fiscal']),
  paymentLink: z.boolean().optional().default(false),
});

// GET /api/proforma-invoices - Get user invoice data for validation
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

    // Get user ID from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Handle "me" parameter - convert to actual user ID
    let targetUserId = user.id; // Default to current user
    
    if (userId) {
      if (userId === 'me') {
        targetUserId = user.id; // "me" means current user
      } else {
        // Check if user is admin for accessing other users' data
        const userRoles = user.user_roles?.map(ur => ur.roles?.name || ur.role?.name) || [];
        const isAdmin = userRoles.some(role => ['SUPER_ADMIN', 'ADMIN'].includes(role));
        
        if (!isAdmin && userId !== user.id) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
        
        targetUserId = userId;
      }
    }

    // Get user invoice data
    let userInvoiceData;
    try {
      userInvoiceData = await ProformaInvoiceService.getUserInvoiceData(targetUserId);
    } catch (error) {
      console.error('Error getting user invoice data:', error);
      return NextResponse.json({ 
        error: 'Database schema not ready. Please run the migration first.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
    if (!userInvoiceData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate user data for invoice generation
    const validation = ProformaInvoiceService.validateUserDataForInvoice(userInvoiceData);

    return NextResponse.json({
      userData: userInvoiceData,
      validation,
      canGenerateInvoice: validation.valid,
    });

  } catch (error) {
    console.error('Error in GET /api/proforma-invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/proforma-invoices - Generate proforma invoice
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
    const validatedData = proformaInvoiceSchema.parse(body);

    // All authenticated users can generate proforma invoices
    // No role-based restrictions needed

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

    // Get user invoice data
    const userInvoiceData = await ProformaInvoiceService.getUserInvoiceData(user.id);
    
    if (!userInvoiceData) {
      return NextResponse.json(
        { error: 'Unable to retrieve user data for invoice generation' },
        { status: 400 }
      );
    }

    // Validate user data for invoice generation
    const validation = ProformaInvoiceService.validateUserDataForInvoice(userInvoiceData);
    
    if (!validation.valid) {
      return NextResponse.json({
        error: 'Missing required data for invoice generation',
        missingFields: validation.missingFields,
        userData: userInvoiceData,
      }, { status: 400 });
    }

    // Prepare invoice data
    const invoiceData = {
      userId: user.id,
      packageId: packageTemplate.id,
      packageName: packageTemplate.name,
      hours: packageTemplate.hours,
      pricePerHour: packageTemplate.price_per_hour,
      totalPrice: packageTemplate.total_price,
      currency: packageTemplate.currency,
      validityDays: packageTemplate.validity_days,
    };

    // Generate proforma invoice
    const result = await ProformaInvoiceService.generateProformaInvoice({
      invoiceData,
      userData: userInvoiceData,
      paymentMethod: validatedData.paymentMethod,
      paymentLink: validatedData.paymentLink,
    });

    if (!result.success) {
      return NextResponse.json({
        error: result.error || 'Failed to generate proforma invoice'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Proforma invoice generated successfully',
      data: {
        invoiceId: result.invoiceId,
        smartbillId: result.smartbillId,
        paymentLink: result.paymentLink,
        package: {
          name: packageTemplate.name,
          hours: packageTemplate.hours,
          totalPrice: packageTemplate.total_price,
          currency: packageTemplate.currency,
        },
        userData: {
          name: `${userInvoiceData.firstName} ${userInvoiceData.lastName}`,
          email: userInvoiceData.email,
          hasCompany: !!userInvoiceData.companyId,
        },
      },
    });

  } catch (error) {
    console.error('Error in POST /api/proforma-invoices:', error);
    
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
