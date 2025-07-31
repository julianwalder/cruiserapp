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

    // Get comprehensive status
    const status = await smartbill.getConnectionStatus();
    
    // Get additional diagnostics if connection failed
    let diagnostics = null;
    if (!status.connected) {
      try {
        diagnostics = await smartbill.getCompanyInfo();
      } catch (error) {
        diagnostics = { 
          error: error instanceof Error ? error.message : 'Unknown error',
          code: error instanceof Error && 'code' in error ? (error as any).code : 'UNKNOWN'
        };
      }
    }

    // Get recommendations based on status
    const recommendations = getRecommendations(status.accountStatus);

    return NextResponse.json({
      success: status.connected,
      status,
      diagnostics,
      recommendations,
      credentials: {
        username: username ? `${username.substring(0, 3)}***` : 'not set',
        password: password ? '***' : 'not set',
        cif: cif || 'not set'
      },
      timestamp: new Date().toISOString(),
      apiInfo: {
        baseUrl: 'https://ws.smartbill.ro/SBORO/api',
        timeout: 30000,
        retries: 2
      }
    });

  } catch (error) {
    console.error('SmartBill status check error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'SmartBill status check failed',
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
        'Consider using XML import as a temporary workaround',
        'Verify your account is active in the SmartBill Cloud portal'
      ];
    case 'inactive':
      return [
        'Your SmartBill credentials may be incorrect',
        'Verify your username and password',
        'Check if your account has API access enabled',
        'Contact SmartBill support for API access',
        'Ensure your account is properly configured for API usage'
      ];
    case 'unknown':
      return [
        'Unable to determine account status',
        'Check your internet connection',
        'Verify SmartBill service availability',
        'Contact SmartBill support for assistance',
        'Try again in a few minutes'
      ];
    case 'active':
      return [
        'SmartBill connection is working properly',
        'You can now use the API to fetch invoices',
        'Consider setting up automated synchronization'
      ];
    default:
      return [
        'Check SmartBill API documentation',
        'Verify your credentials and API access permissions',
        'Contact SmartBill support for assistance'
      ];
  }
} 