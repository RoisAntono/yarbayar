"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeSplits } from "@/lib/balances";
import { inferCategory } from "@/lib/categories";
import { isWithinEditWindow } from "@/lib/edit-window";
import type { SplitMethod } from "@/types/database";

export type ExpenseFormState =
  | {
      error?: string;
      fieldErrors?: {
        title?: string;
        amount?: string;
        paid_by?: string;
        splits?: string;
      };
    }
  | undefined;

const METHODS: SplitMethod[] = ["equal", "exact", "percent", "shares"];

function parseMethod(v: string): SplitMethod {
  return (METHODS as string[]).includes(v) ? (v as SplitMethod) : "equal";
}

/**
 * The expense form uses <input type="date"> which only emits YYYY-MM-DD.
 * Parsing that as an ISO string lands at midnight UTC, which destroys
 * the hour-of-day signal the timeline chart relies on. So:
 *
 *   - Empty input → use right-now (full datetime).
 *   - User picked TODAY → keep the date but use right-now's hour, so
 *     the chart can show "spent at 14:32".
 *   - User picked a past date → fall back to noon local. Better than
 *     midnight UTC for any timezone east of UTC, where 00:00 of a date
 *     can roll over into the previous day.
 */
function parseSpentAt(raw: string): string {
  if (!raw) return new Date().toISOString();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return raw; // already a full ISO string — trust it
  const [, y, mo, d] = m;
  const yy = Number(y);
  const mm = Number(mo);
  const dd = Number(d);
  const now = new Date();
  const isToday =
    now.getFullYear() === yy &&
    now.getMonth() + 1 === mm &&
    now.getDate() === dd;
  const dt = new Date(
    yy,
    mm - 1,
    dd,
    isToday ? now.getHours() : 12,
    isToday ? now.getMinutes() : 0,
    isToday ? now.getSeconds() : 0
  );
  return dt.toISOString();
}

/** Shared parser for both create and edit so validation stays consistent. */
function parseExpenseForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const amount = Number(String(formData.get("amount") ?? "0").replace(/[^\d]/g, ""));
  const paidBy = String(formData.get("paid_by_member_id") ?? "").trim();
  const method = parseMethod(String(formData.get("split_method") ?? "equal"));
  const spentAt = parseSpentAt(String(formData.get("spent_at") ?? "").trim());
  const receiptUrl = String(formData.get("receipt_url") ?? "").trim() || null;
  const memberIds = formData.getAll("member_id").map(String);
  const memberValues = formData.getAll("member_value").map((v) => Number(String(v) || "0"));

  const fieldErrors: NonNullable<ExpenseFormState>["fieldErrors"] = {};
  if (title.length < 1) fieldErrors.title = "Judul wajib diisi";
  if (!amount || amount <= 0) fieldErrors.amount = "Nominal tidak valid";
  if (!paidBy) fieldErrors.paid_by = "Pilih siapa yang bayar";
  if (memberIds.length === 0) fieldErrors.splits = "Tidak ada anggota";

  const inputs = memberIds.map((id, i) => ({
    memberId: id,
    value: memberValues[i] ?? 0,
  }));
  const splits = computeSplits(method, amount, inputs);
  const totalSplit = splits.reduce((s, x) => s + x.amount, 0);
  if (Object.keys(fieldErrors).length === 0 && totalSplit !== amount) {
    fieldErrors.splits = `Total bagian (${totalSplit}) tidak sama dengan nominal (${amount})`;
  }

  return {
    title,
    notes,
    amount,
    paidBy,
    method,
    spentAt,
    receiptUrl,
    splits,
    fieldErrors,
  };
}

/**
 * Look up the categories already used in this group so the auto-
 * categorizer can fold similar titles into existing buckets instead
 * of creating new ones for every variation. Cheap query — scoped to
 * one group, deduped, distinct values only.
 */
async function existingCategoriesForGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  excludeExpenseId?: string
): Promise<string[]> {
  let q = supabase
    .from("expenses")
    .select("category")
    .eq("group_id", groupId)
    .not("category", "is", null);
  if (excludeExpenseId) q = q.neq("id", excludeExpenseId);
  const { data } = await q;
  if (!data) return [];
  const set = new Set<string>();
  for (const row of data) {
    const c = (row as { category: string | null }).category;
    if (c) set.add(c);
  }
  return Array.from(set);
}

export async function createExpenseAction(
  _prev: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const groupId = String(formData.get("group_id"));
  const parsed = parseExpenseForm(formData);
  if (Object.keys(parsed.fieldErrors).length > 0) {
    return { fieldErrors: parsed.fieldErrors };
  }

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: "Sesi habis, silakan masuk ulang" };

  // Auto-derive the category from the title. We pass the group's
  // existing categories so titles like "kopi senja" get folded into a
  // pre-existing "kopi-pagi" bucket via fuzzy match (see lib/categories).
  const existing = await existingCategoriesForGroup(supabase, groupId);
  const category = inferCategory(parsed.title, existing);

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      group_id: groupId,
      title: parsed.title,
      notes: parsed.notes,
      amount: parsed.amount,
      paid_by_member_id: parsed.paidBy,
      split_method: parsed.method,
      spent_at: parsed.spentAt,
      receipt_url: parsed.receiptUrl,
      category,
      created_by: u.user.id,
    })
    .select("id")
    .single();
  if (error || !expense) return { error: error?.message ?? "Gagal menyimpan" };

  const splitRows = parsed.splits
    .filter((s) => s.amount > 0)
    .map((s) => ({
      expense_id: expense.id,
      member_id: s.memberId,
      amount: s.amount,
    }));
  const { error: splitErr } = await supabase.from("expense_splits").insert(splitRows);
  if (splitErr) return { error: splitErr.message };

  revalidatePath("/", "layout");
  redirect(`/groups/${groupId}`);
}

export async function editExpenseAction(
  _prev: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const groupId = String(formData.get("group_id"));
  const expenseId = String(formData.get("expense_id"));
  if (!expenseId) return { error: "Pengeluaran tidak ditemukan" };

  const parsed = parseExpenseForm(formData);
  if (Object.keys(parsed.fieldErrors).length > 0) {
    return { fieldErrors: parsed.fieldErrors };
  }

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: "Sesi habis, silakan masuk ulang" };

  // Verify edit window. We use `created_at` as the anchor so the user
  // can't game the clock by changing `spent_at`.
  const { data: existingRow, error: fetchErr } = await supabase
    .from("expenses")
    .select("created_at")
    .eq("id", expenseId)
    .maybeSingle();
  if (fetchErr || !existingRow) {
    return { error: "Pengeluaran tidak ditemukan" };
  }
  if (!isWithinEditWindow(existingRow.created_at)) {
    return {
      error:
        "Pengeluaran ini sudah lebih dari 1 jam dan jadi permanen. Hapus lalu buat ulang kalau perlu.",
    };
  }

  // Re-derive category on edit too — when the user changes the title,
  // category should follow. Exclude the current row so its old category
  // doesn't influence the fuzzy match against itself.
  const existingCats = await existingCategoriesForGroup(
    supabase,
    groupId,
    expenseId
  );
  const category = inferCategory(parsed.title, existingCats);

  const { error: updateErr } = await supabase
    .from("expenses")
    .update({
      title: parsed.title,
      notes: parsed.notes,
      amount: parsed.amount,
      paid_by_member_id: parsed.paidBy,
      split_method: parsed.method,
      spent_at: parsed.spentAt,
      receipt_url: parsed.receiptUrl,
      category,
    })
    .eq("id", expenseId);
  if (updateErr) return { error: updateErr.message };

  // Replace splits — simpler and safer than diffing rows.
  const { error: delErr } = await supabase
    .from("expense_splits")
    .delete()
    .eq("expense_id", expenseId);
  if (delErr) return { error: delErr.message };

  const splitRows = parsed.splits
    .filter((s) => s.amount > 0)
    .map((s) => ({
      expense_id: expenseId,
      member_id: s.memberId,
      amount: s.amount,
    }));
  const { error: insErr } = await supabase.from("expense_splits").insert(splitRows);
  if (insErr) return { error: insErr.message };

  revalidatePath("/", "layout");
  redirect(`/groups/${groupId}/expenses/${expenseId}`);
}

export async function deleteExpenseAction(formData: FormData) {
  const id = String(formData.get("expense_id"));
  const groupId = String(formData.get("group_id"));
  if (!id || !groupId) return;
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", id);

  // Invalidate every surface that lists expenses, then send the user to
  // the group page so they don't end up on a now-404 detail route.
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/history");
  revalidatePath("/");
  redirect(`/groups/${groupId}`);
}
