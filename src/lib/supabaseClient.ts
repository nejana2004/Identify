import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// A DB reset (e.g. `DELETE FROM auth.users`) can leave a stale refresh token in this
// browser's localStorage. Detect that dead session on load and purge it locally so
// auth-gated flows (signup/login/onboarding) don't hang behind a failed background refresh.
if (typeof window !== 'undefined') {
  supabase.auth.getSession().then(({ error }) => {
    if (error?.message?.toLowerCase().includes('refresh token')) {
      supabase.auth.signOut({ scope: 'local' });
    }
  });
}
