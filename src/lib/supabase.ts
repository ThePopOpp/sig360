import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not set at import time; using placeholder until runtime env is available.');
}

// createClient() throws on an empty URL/key. `next build` imports these modules
// to collect page data BEFORE any runtime env exists, so a bare createClient
// crashes the production build. Fall back to a harmless placeholder at module
// load; the real credentials come from runtime env (injected by the host at
// container start), which is the only time a query actually runs. All Supabase
// access here is server-side, so this never reaches a browser.
const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_KEY = 'placeholder-key';
const url = supabaseUrl || FALLBACK_URL;
const anonKey = supabaseAnonKey || FALLBACK_KEY;

// Client-side Supabase client (uses anon key)
export const supabase = createClient(url, anonKey);

// Server-side client with service role (for admin operations)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(url, supabaseServiceKey)
  : supabase;

// Alternative function-based server client creator
export const createServerClient = () => {
  return createClient(url, supabaseServiceKey || anonKey);
};

// Types
export interface Voicemail {
  id: string;
  call_sid?: string;
  from?: string;
  from_number: string;
  to?: string;
  recording_url?: string;
  transcription?: string;
  duration: number;
  status?: 'new' | 'read' | 'archived';
  is_read: boolean;
  created_at: string;
  updated_at?: string;
}
