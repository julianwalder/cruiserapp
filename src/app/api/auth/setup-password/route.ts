import { NextRequest, NextResponse } from 'next/server';
import { PasswordSetupService } from '@/lib/password-setup-service';
import { z } from 'zod';

const setupPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = setupPasswordSchema.parse(body);
    
    // Complete password setup
    const result = await PasswordSetupService.completePasswordSetup(
      validatedData.token,
      validatedData.password
    );
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in setup-password API:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'An error occurred while setting up your password.',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Token is required',
      }, { status: 400 });
    }
    
    // Validate token
    const result = await PasswordSetupService.validateSetupToken(token);
    
    if (result.valid) {
      return NextResponse.json({
        success: true,
        message: result.message,
        valid: true,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        valid: false,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error validating setup token:', error);
    
    return NextResponse.json({
      success: false,
      message: 'An error occurred while validating the token.',
    }, { status: 500 });
  }
}
