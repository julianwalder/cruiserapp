import { NextRequest, NextResponse } from 'next/server';
import { SmartBillService } from '@/lib/smartbill-service';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // Get SmartBill credentials from environment variables
    const username = process.env.SMARTBILL_USERNAME;
    const password = process.env.SMARTBILL_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'SmartBill credentials not configured' },
        { status: 500 }
      );
    }

    const smartbill = new SmartBillService({
      username,
      password,
    });

    const invoice = await smartbill.getInvoice(id);

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error fetching SmartBill invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
} 