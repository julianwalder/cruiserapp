// Centralized user field allowlists + sanitizer for API responses.
// Never expose password hashes or full PII to clients — choose a view.

// Safe to display to any authenticated caller (names shown in UIs, pickers, logs).
export const PUBLIC_USER_FIELDS = [
  'id',
  'firstName',
  'lastName',
  'email',
  'avatarUrl',
  'status',
] as const;

// For admin list/detail views. Adds operational fields but still excludes
// password, national ID, DOB, home address, identity-verification payloads.
export const ADMIN_USER_FIELDS = [
  ...PUBLIC_USER_FIELDS,
  'phone',
  'city',
  'state',
  'country',
  'licenseNumber',
  'medicalClass',
  'instructorRating',
  'totalFlightHours',
  'identityVerified',
  'identityVerifiedAt',
  'lastLoginAt',
  'createdAt',
  'updatedAt',
  'createdById',
  'homebase_id',
  'requiresPasswordSetup',
] as const;

// Full self-view — a user reading their own record may see their own PII,
// but still never the password hash.
export const SELF_USER_FIELDS = [
  ...ADMIN_USER_FIELDS,
  'personalNumber',
  'dateOfBirth',
  'address',
  'zipCode',
] as const;

export const USER_FIELDS_PUBLIC_CSV = PUBLIC_USER_FIELDS.join(',');
export const USER_FIELDS_ADMIN_CSV = ADMIN_USER_FIELDS.join(',');
export const USER_FIELDS_SELF_CSV = SELF_USER_FIELDS.join(',');

// Fields that must NEVER appear in any API response.
const ALWAYS_STRIP = new Set([
  'password',
  'resetToken',
  'resetTokenExpiry',
  'passwordSetupToken',
  'passwordSetupTokenExpiry',
]);

export type UserView = 'public' | 'admin' | 'self';

const ALLOWLIST: Record<UserView, ReadonlyArray<string>> = {
  public: PUBLIC_USER_FIELDS,
  admin: ADMIN_USER_FIELDS,
  self: SELF_USER_FIELDS,
};

export function sanitizeUser<T extends Record<string, any> | null | undefined>(
  user: T,
  view: UserView = 'public',
): T {
  if (!user) return user;
  const allowed = new Set<string>(ALLOWLIST[view] as readonly string[]);
  // Preserve the role array if the caller attached it — it's not a column.
  allowed.add('roles');
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(user)) {
    if (ALWAYS_STRIP.has(k)) continue;
    if (allowed.has(k)) out[k] = v;
  }
  return out as T;
}

export function sanitizeUsers<T extends Record<string, any>>(
  users: T[] | null | undefined,
  view: UserView = 'public',
): T[] {
  if (!users) return [];
  return users.map((u) => sanitizeUser(u, view));
}
