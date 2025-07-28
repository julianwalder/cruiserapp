import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lvbukwpecrtdtrsmqass.supabase.co';

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