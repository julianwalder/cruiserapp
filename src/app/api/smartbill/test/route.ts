import { NextRequest, NextResponse } from 'next/server';
import { SmartBillService } from '@/lib/smartbill-service';

export async function GET(request: NextRequest) {
  try {
    // Get SmartBill credentials from environment variables
    const username = process.env.SMARTBILL_USERNAME;
    const password = process.env.SMARTBILL_PASSWORD;
    const cif = process.env.SMARTBILL_CIF;

    if (!username || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'SmartBill credentials not configured',
          message: 'Please set SMARTBILL_USERNAME and SMARTBILL_PASSWORD environment variables',
          status: {
            connected: false,
            accountStatus: 'unknown',
            errorMessage: 'Credentials not configured',
            lastChecked: new Date().toISOString()
          }
        },
        { status: 500 }
      );
    }

    const smartbill = new SmartBillService({
      username,
      password,
      cif,
      timeout: 30000,
      retries: 2
    });

    // Test the connection with detailed diagnostics
    const testResult = await smartbill.testConnection();

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: 'SmartBill connection successful',
        credentials: {
          username: username ? `${username.substring(0, 3)}***` : 'not set',
          password: password ? '***' : 'not set',
          cif: cif || 'not set'
        },
        status: testResult.status,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'SmartBill connection failed',
          message: testResult.status.errorMessage || 'Unable to connect to SmartBill API',
          status: testResult.status,
          diagnostics: testResult.diagnostics,
          recommendations: getRecommendations(testResult.status.accountStatus),
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('SmartBill test connection error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'SmartBill test failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        status: {
          connected: false,
          accountStatus: 'unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

function getRecommendations(accountStatus: string): string[] {
  switch (accountStatus) {
    case 'suspended':
      return [
        'Your SmartBill account appears to be suspended',
        'Contact SmartBill support to reactivate your account',
        'Check your subscription status and payment history',
        'Consider using XML import as a temporary workaround'
      ];
    case 'inactive':
      return [
        'Your SmartBill credentials may be incorrect',
        'Verify your username and password',
        'Check if your account has API access enabled',
        'Contact SmartBill support for API access'
      ];
    case 'unknown':
      return [
        'Unable to determine account status',
        'Check your internet connection',
        'Verify SmartBill service availability',
        'Contact SmartBill support for assistance'
      ];
    default:
      return [
        'Check SmartBill API documentation',
        'Verify your credentials and API access permissions',
        'Contact SmartBill support for assistance'
      ];
  }
} 