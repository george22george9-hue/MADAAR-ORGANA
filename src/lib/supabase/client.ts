import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sspnucqeksyaftdwgddx.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_FzJTNijHWA_ZSYUal1qRlQ_D6jGjosM';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

