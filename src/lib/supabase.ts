import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://lvbukwpecrtdtrsmqass.supabase.co';

// Function to get Supabase client (only creates when called)
export function getSupabaseClient(): SupabaseClient | null {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not found');
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return null;
  }
}

// Lazy module-level client. Returns a Proxy that defers the real
// `createClient(...)` call until first property access, so route files
// can do `const supabase = getLazySupabaseClient()` at module top
// without crashing Next.js build-time "Collecting page data" when env
// vars aren't available. Methods are bound to the real client so
// `this` references inside the Supabase SDK still resolve correctly.
export function getLazySupabaseClient(): SupabaseClient {
  let client: SupabaseClient | null = null;
  const init = (): SupabaseClient => {
    if (client) return client;
    const url = process.env.SUPABASE_URL || supabaseUrl;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        'Supabase client unavailable: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set',
      );
    }
    client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return client;
  };
  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      const real = init() as any;
      const value = real[prop];
      return typeof value === 'function' ? value.bind(real) : value;
    },
  });
}

// Function to get public Supabase client (only creates when called)
export function getSupabasePublicClient(): SupabaseClient | null {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseAnonKey) {
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY not found');
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (error) {
    console.error('Failed to create public Supabase client:', error);
    return null;
  }
} 