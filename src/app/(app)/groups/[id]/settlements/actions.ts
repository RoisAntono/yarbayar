"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Settlement actions implement the two-phase payback flow:
 *
 *   1. The debtor records a payment via `markPaidAction` — this creates
 *      a row with `confirmed_at = null`. The creditor sees a "menunggu
 *      konfirmasi" badge.
 *   2. The creditor calls `confirmAction` — this stamps `confirmed_at`,
 *      and only then does the settlement subtract from outstanding debt.
 *
 * Either side can call `unmarkPaidAction` if they made a mistake — but
 * only while the row is still pending (not yet confirmed).
 */

export type SettlementFormState =
  | { error?: string }
  | undefined;

export async function markPaidAction(formData: FormData): Promise<void> {
  const groupId = String(formData.get("group_id"));
  const fromId = String(formData.get("from_member_id"));
  const toId = String(formData.get("to_member_id"));
  const amount = Number(String(formData.get("amount") ?? "0").replace(/[^\d]/g, ""));
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!groupId || !fromId || !toId || amount <= 0) return;
  if (fromId === toId) return;

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;

  await supabase.from("settlements").insert({
    group_id: groupId,
    from_member_id: fromId,
    to_member_id: toId,
    amount,
    note,
    created_by: u.user.id,
  });

  revalidatePath(`/groups/${groupId}`);
}

export async function confirmSettlementAction(formData: FormData): Promise<void> {
  const id = String(formData.get("settlement_id"));
  const groupId = String(formData.get("group_id"));
  if (!id || !groupId) return;

  const supabase = await createClient();
  await supabase
    .from("settlements")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", id)
    .is("confirmed_at", null); // idempotent: don't re-stamp if already confirmed

  revalidatePath(`/groups/${groupId}`);
}

export async function unmarkPaidAction(formData: FormData): Promise<void> {
  const id = String(formData.get("settlement_id"));
  const groupId = String(formData.get("group_id"));
  if (!id || !groupId) return;

  const supabase = await createClient();
  // Guard: only delete if still pending. Once confirmed, history stays.
  await supabase
    .from("settlements")
    .delete()
    .eq("id", id)
    .is("confirmed_at", null);

  revalidatePath(`/groups/${groupId}`);
}
