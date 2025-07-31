import { NextRequest, NextResponse } from 'next/server';
import { SmartBillService } from '@/lib/smartbill-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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

    const stats = await smartbill.getInvoiceStats(
      startDate || undefined,
      endDate || undefined
    );

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching SmartBill stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
} 