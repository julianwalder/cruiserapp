import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PasswordResetService } from '@/lib/password-reset-service';
import { checkRateLimit } from '@/lib/rate-limit';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Throttle reset-email generation: 3 per 15 min per email, 10 per
    // 15 min per IP. Prevents using this endpoint as a mailbomb vector.
    const ip =
      (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const emailKey = email.trim().toLowerCase();
    const ipLimit = checkRateLimit(
      `auth.forgot:ip:${ip}`,
      10,
      15 * 60_000,
    );
    const emailLimit = checkRateLimit(
      `auth.forgot:email:${emailKey}`,
      3,
      15 * 60_000,
    );
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retry = !ipLimit.allowed
        ? ipLimit.retryAfterSec
        : (emailLimit as any).retryAfterSec;
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(retry) } },
      );
    }

    const result = await PasswordResetService.generateResetToken(email);

    if (result.success) {
      return NextResponse.json({ message: result.message });
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Forgot password error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
} 