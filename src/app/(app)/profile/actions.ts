"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupportedCurrency } from "@/lib/currency";
import { parseRupiahInput } from "@/lib/utils";

/**
 * Set / update / clear target nabung bulanan.
 *
 * Pattern sama dengan updateCurrencyAction:
 *   - validate input → update DB → revalidatePath layout → redirect.
 *
 * Form fields:
 *   - "amount" string (parseRupiahInput) → angka, atau 0 / "" untuk
 *     reset goal ke NULL.
 *
 * Tidak return error state — UX kalau gagal: silently redirect balik
 * ke /profile (RLS catch unauthorized, validate clamp negative).
 * Failure mode rare di happy path; kalau perlu visible error nanti
 * bisa pakai useActionState pattern.
 */
export async function updateSavingsTargetAction(formData: FormData) {
  const raw = String(formData.get("amount") ?? "");
  const parsed = parseRupiahInput(raw);
  // 0 atau empty input → set ke null (clear goal). Negatif sudah
  // di-handle oleh CHECK constraint, tapi kita defensive: clamp di
  // app layer juga supaya error message dari DB tidak bocor ke user.
  const value = parsed > 0 ? Math.round(parsed) : null;

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) {
    redirect("/login");
  }

  await supabase
    .from("profiles")
    .update({ monthly_savings_target: value })
    .eq("id", u.user.id);

  // Revalidate /personal (goal progress card) + Beranda (kalau nanti
  // dipasang) + /profile (entry row sub-text). Layout-level revalidate
  // covers semuanya dengan satu call.
  revalidatePath("/", "layout");

  redirect("/profile");
}

/**
 * Server actions untuk halaman /profile/* (settings).
 *
 * Currently:
 *   - updateCurrencyAction: ubah display currency user
 *
 * Pattern: validate input → update DB → revalidatePath semua surface
 * yang render uang → redirect balik ke /profile.
 */

export async function updateCurrencyAction(formData: FormData) {
  const code = String(formData.get("currency") ?? "").toUpperCase();

  // Validate against curated list — defense in depth. RLS sudah scope
  // ke user_id, tapi kita tetap validate enum supaya tidak ada string
  // sampah masuk DB (bisa breaking di formatMoney kalau locale invalid).
  if (!isSupportedCurrency(code)) {
    // Ngga throw — silently redirect biar UX tetap halus. Kalau
    // tampered, user balik ke profile page tanpa perubahan.
    redirect("/profile");
  }

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) {
    redirect("/login");
  }

  await supabase
    .from("profiles")
    .update({ currency: code })
    .eq("id", u.user.id);

  // Revalidate semua surface yang render uang dengan profile.currency.
  // Group expenses tidak perlu — mereka pakai group.currency yang
  // independen.
  revalidatePath("/", "layout");

  redirect("/profile");
}
