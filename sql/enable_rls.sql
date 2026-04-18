-- ============================================================================
-- Row-Level Security (RLS) for sensitive tables
-- ============================================================================
--
-- STATUS: DRAFT — review carefully before applying to any environment.
--
-- WHY THIS EXISTS
-- ---------------
-- Even though the Next.js API routes all connect via the service-role key
-- (which BYPASSES RLS by design), enabling RLS is defense-in-depth:
--
--   1. If anyone ever connects with the anon key (Supabase client SDK
--      from the browser, Realtime channel, a misrouted query) the row
--      visibility is enforced at the DB, not at the application.
--   2. A bug that switches a route to `getSupabasePublicClient()` would
--      still not leak data outside of what RLS permits.
--   3. If the service-role key is ever rotated/compromised, the policies
--      still limit what an anon/authenticated client can see.
--
-- WHAT THIS DOES
-- --------------
-- - Enables RLS on: users, flight_logs, invoices, invoice_clients,
--   activity_log, normalized_addresses, stripe_identity_verifications,
--   ppl_course_tranches.
-- - Adds policies for the `authenticated` role (supabase JWT clients):
--     * users                     → read own row; admins read all
--     * flight_logs               → read own/instructed/paid rows;
--                                   admins read all
--     * invoices + invoice_clients → read own; admins read all
--     * activity_log              → admins only
--     * the rest                  → self-only read
-- - Writes (INSERT/UPDATE/DELETE) are not granted to `authenticated` —
--   only the service role (and thus the Next.js API) can write.
--
-- IMPORTANT CAVEATS
-- -----------------
-- * The service role bypasses RLS. Any code path already using
--   getSupabaseClient() / SUPABASE_SERVICE_ROLE_KEY is unchanged in
--   behavior; this migration does NOT make the existing API more
--   restrictive.
-- * The `is_admin()` helper uses the JWT `app_metadata.roles` claim.
--   If your auth service issues JWTs that put roles elsewhere (the
--   current custom AuthService may), the helper must be adapted.
--   Check the shape of a JWT issued by AuthService before applying.
-- * Realtime subscriptions honor RLS — enabling it may change which
--   rows clients receive via Realtime. Audit any Realtime usage.
-- * Rollback: each statement below has a paired DROP/DISABLE in the
--   ROLLBACK section at the bottom.
--
-- HOW TO APPLY
-- ------------
-- 1. Read the entire file.
-- 2. Test in a branch/staging database first.
-- 3. Verify every route still works by exercising a representative
--    request per role (anon, authenticated student, instructor, admin).
-- 4. Apply via Supabase SQL editor or `supabase db push`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: does the JWT claim an admin role?
-- Adjust the claim path if the custom AuthService uses a different shape.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT (auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ?| ARRAY[
        'SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER'
      ]
    ),
    false
  );
$$;

-- Helper: is the JWT subject the given user ID?
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.uid(), NULLIF(auth.jwt() ->> 'sub', '')::uuid)
$$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_read ON public.users
  FOR SELECT TO authenticated
  USING (id = public.current_user_id());

CREATE POLICY users_admin_read ON public.users
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- ---------------------------------------------------------------------------
-- flight_logs
-- ---------------------------------------------------------------------------
ALTER TABLE public.flight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY flight_logs_self_read ON public.flight_logs
  FOR SELECT TO authenticated
  USING (
    "userId" = public.current_user_id()
    OR "instructorId" = public.current_user_id()
    OR payer_id = public.current_user_id()
  );

CREATE POLICY flight_logs_admin_read ON public.flight_logs
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- ---------------------------------------------------------------------------
-- invoices + invoice_clients
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_admin_read ON public.invoices
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

CREATE POLICY invoices_self_read ON public.invoices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice_clients ic
      WHERE ic.invoice_id = public.invoices.id
        AND ic.user_id = public.current_user_id()
    )
  );

CREATE POLICY invoice_clients_admin_read ON public.invoice_clients
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

CREATE POLICY invoice_clients_self_read ON public.invoice_clients
  FOR SELECT TO authenticated
  USING (user_id = public.current_user_id());

-- ---------------------------------------------------------------------------
-- activity_log — admins only (it contains PII via descriptions/metadata)
-- ---------------------------------------------------------------------------
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_log_admin_read ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- ---------------------------------------------------------------------------
-- normalized_addresses — self only (contains user's physical address)
-- ---------------------------------------------------------------------------
ALTER TABLE public.normalized_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY normalized_addresses_self_read ON public.normalized_addresses
  FOR SELECT TO authenticated
  USING (user_id = public.current_user_id());

CREATE POLICY normalized_addresses_admin_read ON public.normalized_addresses
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- ---------------------------------------------------------------------------
-- stripe_identity_verifications — self only
-- ---------------------------------------------------------------------------
ALTER TABLE public.stripe_identity_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY stripe_identity_self_read ON public.stripe_identity_verifications
  FOR SELECT TO authenticated
  USING (user_id = public.current_user_id());

CREATE POLICY stripe_identity_admin_read ON public.stripe_identity_verifications
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- ---------------------------------------------------------------------------
-- ppl_course_tranches — self, instructor-of, or admin
-- ---------------------------------------------------------------------------
ALTER TABLE public.ppl_course_tranches ENABLE ROW LEVEL SECURITY;

CREATE POLICY ppl_tranches_self_read ON public.ppl_course_tranches
  FOR SELECT TO authenticated
  USING (user_id = public.current_user_id());

CREATE POLICY ppl_tranches_admin_read ON public.ppl_course_tranches
  FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- ============================================================================
-- ROLLBACK (run to revert everything this migration applied)
-- ============================================================================
-- DROP POLICY IF EXISTS users_self_read ON public.users;
-- DROP POLICY IF EXISTS users_admin_read ON public.users;
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS flight_logs_self_read ON public.flight_logs;
-- DROP POLICY IF EXISTS flight_logs_admin_read ON public.flight_logs;
-- ALTER TABLE public.flight_logs DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS invoices_self_read ON public.invoices;
-- DROP POLICY IF EXISTS invoices_admin_read ON public.invoices;
-- ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS invoice_clients_self_read ON public.invoice_clients;
-- DROP POLICY IF EXISTS invoice_clients_admin_read ON public.invoice_clients;
-- ALTER TABLE public.invoice_clients DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS activity_log_admin_read ON public.activity_log;
-- ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS normalized_addresses_self_read ON public.normalized_addresses;
-- DROP POLICY IF EXISTS normalized_addresses_admin_read ON public.normalized_addresses;
-- ALTER TABLE public.normalized_addresses DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS stripe_identity_self_read ON public.stripe_identity_verifications;
-- DROP POLICY IF EXISTS stripe_identity_admin_read ON public.stripe_identity_verifications;
-- ALTER TABLE public.stripe_identity_verifications DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS ppl_tranches_self_read ON public.ppl_course_tranches;
-- DROP POLICY IF EXISTS ppl_tranches_admin_read ON public.ppl_course_tranches;
-- ALTER TABLE public.ppl_course_tranches DISABLE ROW LEVEL SECURITY;
--
-- DROP FUNCTION IF EXISTS public.current_user_is_admin();
-- DROP FUNCTION IF EXISTS public.current_user_id();
