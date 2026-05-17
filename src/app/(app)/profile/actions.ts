"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupportedCurrency } from "@/lib/currency";

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
