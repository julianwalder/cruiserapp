import { NextRequest, NextResponse } from 'next/server';

// Simple test endpoint to verify API route is working
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Proforma invoices API route is working!',
    timestamp: new Date().toISOString(),
    method: 'GET',
    url: request.url,
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Proforma invoices API route is working!',
    timestamp: new Date().toISOString(),
    method: 'POST',
    url: request.url,
  });
}
