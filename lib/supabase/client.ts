import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase côté navigateur (composants client).
 * Utilise la clé anon publique — les permissions réelles sont garanties par
 * les politiques RLS en base (cf. supabase/migrations).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
