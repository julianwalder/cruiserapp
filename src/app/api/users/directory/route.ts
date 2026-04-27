import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { PUBLIC_USER_FIELDS, sanitizeUsers } from '@/lib/sanitize';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';

// GET /api/users/directory
//
// Minimal user-list endpoint built specifically for populating UI
// dropdowns (instructor picker, pilot picker, payer picker, etc.).
//
// Why this exists separately from /api/users:
// - /api/users is intentionally admin-only (BASE_MANAGER+) because it
//   returns the full management view. Phase 8 of the security work
//   correctly tightened that gate, which broke every UI that was
//   reusing /api/users to populate pickers for non-admin users (e.g.
//   a STUDENT logging a flight needs to pick an instructor).
// - This endpoint exposes ONLY the public sanitized fields
//   (PUBLIC_USER_FIELDS — id, firstName, lastName, email, avatarUrl,
//   status). No PII.
// - Callers must be authenticated and not PROSPECT. PROSPECT users
//   have no business querying the user directory.

const ALLOWED_ROLES = new Set([
  'PILOT',
  'STUDENT',
  'INSTRUCTOR',
  'BASE_MANAGER',
  'ADMIN',
  'SUPER_ADMIN',
]);

const HARD_LIMIT = 1000;

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Block PROSPECT — they have no need to browse other users.
    const callerRoles: string[] = (decoded as any)?.roles || [];
    if (
      callerRoles.length === 0 ||
      (callerRoles.length === 1 && callerRoles[0] === 'PROSPECT')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limit: 60 requests / minute per authenticated user.
    const rl = checkRateLimit(
      rateLimitKey('users.directory', request, decoded.userId),
      60,
      60_000,
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const statusParam = searchParams.get('status') ?? 'ACTIVE';

    if (role && !ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 },
      );
    }

    // Pull users + their roles in one query so we can role-filter
    // server-side. Only the public fields are selected — never the
    // sanitized ones the management endpoint returns.
    const baseSelect = `${PUBLIC_USER_FIELDS.join(',')}, user_roles ( roles ( name ) )`;
    let query = supabase.from('users').select(baseSelect);

    if (statusParam !== 'all') {
      query = query.eq('status', statusParam);
    }

    query = query.limit(HARD_LIMIT);

    const { data, error } = await query;
    if (error) {
      console.error('[users/directory] supabase error', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 },
      );
    }

    const rowsWithRoles = (data || []).map((u: any) => ({
      ...u,
      roles: (u.user_roles || []).map((ur: any) => ur.roles?.name).filter(Boolean),
    }));

    // Apply role filter in app code (Supabase nested filtering on
    // roles is awkward). If `role` is omitted, exclude PROSPECT-only
    // users — they're never legitimate picker targets.
    const roleFiltered = role
      ? rowsWithRoles.filter((u: any) => u.roles.includes(role))
      : rowsWithRoles.filter((u: any) =>
          u.roles.some((r: string) => r !== 'PROSPECT'),
        );

    // Defense in depth: pass through sanitizeUsers so even if the
    // select string above is ever broadened by mistake, sensitive
    // fields can't reach the client.
    const safe = sanitizeUsers(roleFiltered, 'public').map((u: any, i: number) => ({
      ...u,
      roles: roleFiltered[i].roles,
    }));

    return NextResponse.json({ users: safe });
  } catch (err) {
    console.error('[users/directory] unexpected error', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
