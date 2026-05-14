"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { computeSplits } from "@/lib/balances";
import type { SplitMethod } from "@/types/database";

export type ExpenseFormState =
  | {
      error?: string;
      fieldErrors?: { title?: string; amount?: string; paid_by?: string; splits?: string };
    }
  | undefined;

const METHODS: SplitMethod[] = ["equal", "exact", "percent", "shares"];

function parseMethod(v: string): SplitMethod {
  return (METHODS as string[]).includes(v) ? (v as SplitMethod) : "equal";
}

export async function createExpenseAction(
  _prev: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const groupId = String(formData.get("group_id"));
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const amount = Number(String(formData.get("amount") ?? "0").replace(/[^\d]/g, ""));
  const paidBy = String(formData.get("paid_by_member_id") ?? "").trim();
  const method = parseMethod(String(formData.get("split_method") ?? "equal"));
  const spentAt = String(formData.get("spent_at") ?? "").trim() || new Date().toISOString();
  const receiptUrl = String(formData.get("receipt_url") ?? "").trim() || null;

  // Per-member split values (each row: <id>=<value>)
  const memberIds = formData.getAll("member_id").map(String);
  const memberValues = formData.getAll("member_value").map((v) => Number(String(v) || "0"));

  const fieldErrors: NonNullable<ExpenseFormState>["fieldErrors"] = {};
  if (title.length < 1) fieldErrors.title = "Judul wajib diisi";
  if (!amount || amount <= 0) fieldErrors.amount = "Nominal tidak valid";
  if (!paidBy) fieldErrors.paid_by = "Pilih siapa yang bayar";
  if (memberIds.length === 0) fieldErrors.splits = "Tidak ada anggota";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const inputs = memberIds.map((id, i) => ({ memberId: id, value: memberValues[i] ?? 0 }));
  const splits = computeSplits(method, amount, inputs);
  const totalSplit = splits.reduce((s, x) => s + x.amount, 0);
  if (totalSplit !== amount) {
    return { fieldErrors: { splits: `Total bagian (${totalSplit}) tidak sama dengan nominal (${amount})` } };
  }

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: "Sesi habis, silakan masuk ulang" };

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      group_id: groupId,
      title,
      notes,
      amount,
      paid_by_member_id: paidBy,
      split_method: method,
      spent_at: spentAt,
      receipt_url: receiptUrl,
      created_by: u.user.id,
    })
    .select("id")
    .single();
  if (error || !expense) return { error: error?.message ?? "Gagal menyimpan" };

  const splitRows = splits
    .filter((s) => s.amount > 0)
    .map((s) => ({ expense_id: expense.id, member_id: s.memberId, amount: s.amount }));
  const { error: splitErr } = await supabase.from("expense_splits").insert(splitRows);
  if (splitErr) return { error: splitErr.message };

  revalidatePath("/", "layout");
  redirect(`/groups/${groupId}`);
}

export async function deleteExpenseAction(formData: FormData) {
  const id = String(formData.get("expense_id"));
  const groupId = String(formData.get("group_id"));
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", id);
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/history");
  revalidatePath("/");
}
