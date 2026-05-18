import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron purge endpoint — hapus permanen `personal_expenses` yang
 * `archived_at` >30 hari lalu.
 *
 * Di-call oleh Vercel Cron (schedule di `vercel.json`, daily 02:00
 * UTC = 09:00 WIB). Bisa juga di-trigger manual untuk testing.
 *
 * **Auth model:**
 *   1. Vercel Cron auto-attach `Authorization: Bearer ${CRON_SECRET}`
 *      header kalau env-nya di-set.
 *   2. Manual call (curl, debug) wajib pasang header yang sama.
 *   3. Tanpa secret → 401. Service role key tidak pernah keluar dari
 *      server, jadi tidak bisa di-leak via response.
 *
 * **Why not `export const runtime = 'edge'`?**
 *   Default node runtime. Edge runtime tidak punya `pg` driver yang
 *   reliable — Supabase server-side admin client butuh node fetch
 *   plus crypto module yang full-featured. Cost: ~5MB cold start
 *   bundle, but cron jalan max 1x/day, irrelevant.
 *
 * **Idempotency:**
 *   Function di DB pakai DELETE biasa. Kalau cron kena retry, run
 *   kedua tidak hapus apa-apa karena row pertama udah hilang.
 *   Returns deleted_count = 0 di run kedua, tapi 200 OK. Aman.
 */
export async function GET(request: Request) {
  // 1. Validate secret. Header check pertama supaya kita tidak boot
  //    Supabase admin client (yang minta env var) buat tendang request
  //    yang tidak punya secret.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Misconfig: env tidak di-set. Log + 500. Operator harus tau
    // cron tidak akan bisa jalan sampai mereka isi.
    console.error("[cron/purge-archived] CRON_SECRET env missing");
    return NextResponse.json(
      { ok: false, error: "Server misconfigured: CRON_SECRET missing" },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // 2. Call RPC. Service role bypass RLS, RPC sendiri SECURITY DEFINER
  //    so it runs with elevated privilege regardless of caller (defense
  //    in depth — kalau service role key di-revoke pun fungsi tetap
  //    bisa jalan via service_role grant).
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc(
      "purge_archived_personal_expenses"
    );

    if (error) {
      console.error("[cron/purge-archived] RPC error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    // RPC returns table with single row { deleted_count: bigint }.
    // Supabase types it as the row's first key — kita extract dengan
    // optional chaining biar resilient kalau bentuknya berubah.
    const row = Array.isArray(data) ? data[0] : data;
    const deletedCount =
      typeof row?.deleted_count === "number"
        ? row.deleted_count
        : Number(row?.deleted_count ?? 0);

    console.info(
      `[cron/purge-archived] Purged ${deletedCount} row(s) at ${new Date().toISOString()}`
    );

    return NextResponse.json({
      ok: true,
      deleted_count: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/purge-archived] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
