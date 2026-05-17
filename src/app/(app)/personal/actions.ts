"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inferCategory } from "@/lib/categories";

/**
 * Server actions untuk pengeluaran pribadi (personal_expenses).
 *
 * Form state mirrors the group expense actions for consistency with
 * the existing `useActionState` pattern in client forms.
 */

export type PersonalExpenseFormState =
  | {
      error?: string;
      fieldErrors?: { title?: string; amount?: string; spent_at?: string };
    }
  | undefined;

function parseRupiah(raw: string): number {
  // Strip everything that isn't a digit; we accept "Rp 25.000", "25,000",
  // "25000" etc. Returns 0 on empty so the caller can validate.
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length ? Number(digits) : 0;
}

/** Coerce form input to one of "expense" | "income"; default expense. */
function parseKind(raw: unknown): "expense" | "income" {
  return raw === "income" ? "income" : "expense";
}

export async function createPersonalExpenseAction(
  _prev: PersonalExpenseFormState,
  formData: FormData
): Promise<PersonalExpenseFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const spentAtDate = String(formData.get("spent_at") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const categoryInput =
    String(formData.get("category") ?? "").trim() || null;
  const kind = parseKind(formData.get("kind"));

  const fieldErrors: NonNullable<PersonalExpenseFormState>["fieldErrors"] = {};
  if (title.length < 1) fieldErrors.title = "Judul wajib diisi";
  const amount = parseRupiah(amountRaw);
  if (amount <= 0) fieldErrors.amount = "Jumlah harus lebih dari 0";
  if (!spentAtDate) fieldErrors.spent_at = "Tanggal wajib";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return { error: "Sesi habis, silakan masuk ulang" };

  // Auto-infer category from title if user didn't pick one. Income
  // entries skip auto-infer (a "Gaji bulan ini" shouldn't land in
  // "Lain-lain expense category"); user can still pick one.
  const category =
    categoryInput ?? (kind === "expense" ? inferCategory(title, []) : null);

  // Pad the date to a noon timestamp so timezone shifts don't push it
  // to the wrong day. Same trick used elsewhere in the app.
  const spent_at = `${spentAtDate}T12:00:00.000Z`;

  const { error } = await supabase.from("personal_expenses").insert({
    user_id: u.user.id,
    title,
    amount,
    notes,
    category,
    kind,
    spent_at,
  });

  if (error) {
    console.error("createPersonalExpense failed", error);
    return { error: error.message };
  }

  revalidatePath("/personal");
  revalidatePath("/history");
  revalidatePath("/");
  redirect("/personal");
}

export async function updatePersonalExpenseAction(
  _prev: PersonalExpenseFormState,
  formData: FormData
): Promise<PersonalExpenseFormState> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const spentAtDate = String(formData.get("spent_at") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const categoryInput =
    String(formData.get("category") ?? "").trim() || null;
  const kind = parseKind(formData.get("kind"));

  if (!id) return { error: "ID tidak valid" };

  const fieldErrors: NonNullable<PersonalExpenseFormState>["fieldErrors"] = {};
  if (title.length < 1) fieldErrors.title = "Judul wajib diisi";
  const amount = parseRupiah(amountRaw);
  if (amount <= 0) fieldErrors.amount = "Jumlah harus lebih dari 0";
  if (!spentAtDate) fieldErrors.spent_at = "Tanggal wajib";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const category =
    categoryInput ?? (kind === "expense" ? inferCategory(title, []) : null);
  const spent_at = `${spentAtDate}T12:00:00.000Z`;

  const { error } = await supabase
    .from("personal_expenses")
    .update({ title, amount, notes, category, kind, spent_at })
    .eq("id", id);

  if (error) {
    console.error("updatePersonalExpense failed", error);
    return { error: error.message };
  }

  revalidatePath("/personal");
  revalidatePath("/history");
  revalidatePath("/");
  redirect("/personal");
}

export async function deletePersonalExpenseAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Soft-delete: tandai archived_at saja, jangan hard-delete. User
  // bisa restore dari /profile/trash dalam 30 hari, dan financial
  // record tetap punya audit trail. RLS user-scoped → data ngga bocor.
  const supabase = await createClient();
  await supabase
    .from("personal_expenses")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/personal");
  revalidatePath("/history");
  revalidatePath("/");
  revalidatePath("/profile/trash");
  revalidatePath("/profile");
}

/**
 * Restore soft-deleted personal expense. Set `archived_at = NULL`,
 * row langsung muncul kembali di list. Idempotent — restore row
 * yang udah aktif tetap aman karena update no-op.
 */
export async function restorePersonalExpenseAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("personal_expenses")
    .update({ archived_at: null })
    .eq("id", id);

  revalidatePath("/personal");
  revalidatePath("/history");
  revalidatePath("/");
  revalidatePath("/profile/trash");
  revalidatePath("/profile");
}

/**
 * Permanent purge — hard-delete. Hanya boleh dipanggil dari trash bin
 * UI dengan confirm dialog. Tidak ada way back setelah ini.
 *
 * Pattern aman: action ini tidak update apapun, langsung delete.
 * RLS user-scoped policy tetap melindungi cross-user purge.
 */
export async function purgePersonalExpenseAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("personal_expenses").delete().eq("id", id);

  revalidatePath("/profile/trash");
  revalidatePath("/profile");
}
