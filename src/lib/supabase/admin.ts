import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client untuk operasi privileged yang BUKAN
 * user-facing — saat ini cuma cron purge job. Bypasses RLS karena
 * pakai service role key.
 *
 * **Peraturan WAJIB:**
 *   1. JANGAN PERNAH import dari client/edge runtime. File ini
 *      `server-only` — kalau import di client component, build gagal.
 *   2. JANGAN expose di response API yang public. Cuma dipakai di
 *      route yang guarded by secret (mis. CRON_SECRET).
 *   3. Service role key = god mode. Kalau bocor di repo / env client,
 *      bypass semua RLS = data integrity disaster.
 *
 * Env: `SUPABASE_SERVICE_ROLE_KEY` di Vercel + .env.local. JANGAN
 * commit ke repo (.gitignore udah cover .env.local).
 *
 * Future use cases yang sah pakai client ini:
 *   - Cron purge (sekarang)
 *   - Migration scripts
 *   - Admin export tools
 *   - Webhook handler dari third-party (Stripe, OAuth callback,
 *     yang ngga punya user session)
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "createAdminClient: SUPABASE_SERVICE_ROLE_KEY atau NEXT_PUBLIC_SUPABASE_URL tidak ada di env"
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      // Admin client tidak perlu persist session di cookie — dia
      // stateless, satu request satu lifetime.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
