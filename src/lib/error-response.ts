import { NextResponse } from 'next/server';

// Centralized error-response helper.
//
// In production we must never echo raw `error.message` / stack-trace
// data to clients — it leaks schema, file paths, third-party API
// responses, and occasionally credentials.
//
// This helper logs the full error server-side (where operators can see
// it) and returns a generic, user-safe JSON body. In development the
// raw detail is still surfaced so developers can debug quickly.

export interface ErrorResponseOptions {
  status?: number;
  publicMessage?: string;
  /**
   * Extra structured data to include in the response — only when the
   * caller knows it is safe (e.g. a validation code, a user-facing
   * flag). Do NOT pass raw error objects here.
   */
  extra?: Record<string, unknown>;
}

export function errorResponse(
  context: string,
  error: unknown,
  options: ErrorResponseOptions = {},
): NextResponse {
  const {
    status = 500,
    publicMessage = 'Internal server error',
    extra,
  } = options;

  // Always log full detail server-side.
  console.error(`[${context}]`, error);

  const body: Record<string, unknown> = { error: publicMessage, ...extra };
  if (process.env.NODE_ENV !== 'production') {
    body.details = error instanceof Error ? error.message : String(error);
  }
  return NextResponse.json(body, { status });
}
