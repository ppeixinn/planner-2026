import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null when the build has no Supabase keys: the app then runs on this device only, without accounts. */
export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

/** Where email links (confirm sign-up, reset password) should land: this app's own page. */
export function appUrl(): string {
  return window.location.origin + window.location.pathname;
}
