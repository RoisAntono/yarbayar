"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions untuk invite link flow.
 *
 * Pattern:
 *   - Owner generate invite (ada 2 mode: claim guest, atau new member).
 *   - Joiner klik link → /join/[token] → tap "Gabung" → accept_invite RPC.
 *   - Token single-use, 7 hari kadaluarsa.
 *
 * RPC accept_invite + preview_invite ada di migration 0006.
 */

export type InviteFormState =
  | { error?: string; created?: { token: string; url: string } }
  | undefined;

/** Build the absolute invite URL using the configured app origin. */
function buildInviteUrl(token: string): string {
  // NEXT_PUBLIC_APP_URL is set in production (vercel env). In dev we
  // fall back to localhost so QR / "salin link" still work locally.
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}/join/${token}`;
}

/**
 * Both invite kinds are now strictly idempotent: at most ONE valid
 * pending invite per (group, target). Re-tapping "Buat link" returns
 * the same token — no spam, no duplicate links to keep track of.
 *
 * For claim invites, target = (group_id, member_id).
 * For new-member invites, target = (group_id, null) → at most 1
 * open-seat invite per group ever. Owner who needs to invite
 * multiple people can share the same link to all of them since the
 * token is only burned when accepted.
 *
 * Wait — single-use! If 2 people need to join via the same generic
 * link, only 1 can. So "1 open-seat per group" is intentionally
 * restrictive: owner thinks "I need 3 friends to join", and the
 * system is honest: "use the link once, regenerate, share again."
 * Alternative would be making open-seat invites multi-use, but that
 * complicates the threat model.
 */


/**
 * Idempotent! If there's already a valid (unused, unexpired) invite
 * for this guest, return that token instead of inserting a fresh one.
 * This means tapping "Undang" twice on the same guest gives back the
 * same link both times — owner can re-share without creating waste.
 *
 * Anti-abuse: prevents spamming a thousand tokens per member by
 * mashing the button.
 */
export async function createClaimInviteAction(
  _prev: InviteFormState,
  formData: FormData
): Promise<InviteFormState> {
  const groupId = String(formData.get("group_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  if (!groupId || !memberId) return { error: "Data tidak lengkap" };

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return { error: "Sesi habis, silakan masuk ulang" };

  // Pull guest's display_name to store as a hint on the invite — we
  // use that on the /join page header.
  const { data: gm } = await supabase
    .from("group_members")
    .select("display_name, profile_id")
    .eq("id", memberId)
    .eq("group_id", groupId)
    .maybeSingle();
  if (!gm) return { error: "Anggota tidak ditemukan" };
  if (gm.profile_id) {
    return { error: "Anggota ini sudah punya akun terhubung" };
  }

  // ── IDEMPOTENT GUARD ────────────────────────────────────────────
  // Look for an existing valid claim invite for this exact member
  // first. If found, just return that token — no new insert.
  const { data: existing } = await supabase
    .from("group_invites")
    .select("token")
    .eq("group_id", groupId)
    .eq("invited_member_id", memberId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.token) {
    return {
      created: { token: existing.token, url: buildInviteUrl(existing.token) },
    };
  }

  const { data: inv, error } = await supabase
    .from("group_invites")
    .insert({
      group_id: groupId,
      invited_member_id: memberId,
      display_name: gm.display_name,
      created_by: u.user.id,
    })
    .select("token")
    .single();

  if (error || !inv) {
    console.error("createClaimInvite failed", error);
    return { error: error?.message ?? "Gagal membuat link undangan" };
  }
  revalidatePath(`/groups/${groupId}/settings`);
  return {
    created: { token: inv.token, url: buildInviteUrl(inv.token) },
  };
}

/**
 * Create a NEW member invite (no specific guest target). Idempotent:
 * if there's already a valid open-seat invite for this group, return
 * its token. Owner can re-share the same link without duplication.
 * To get a fresh link, owner must explicitly revoke the existing one
 * from the "Link aktif" list first.
 */
export async function createNewMemberInviteAction(
  _prev: InviteFormState,
  formData: FormData
): Promise<InviteFormState> {
  const groupId = String(formData.get("group_id") ?? "");
  const displayName =
    String(formData.get("display_name") ?? "").trim() || null;
  if (!groupId) return { error: "Data tidak lengkap" };

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return { error: "Sesi habis, silakan masuk ulang" };

  // ── IDEMPOTENT GUARD ────────────────────────────────────────────
  // If there's already a valid open-seat invite for this group, just
  // hand it back. Same pattern as the claim flow.
  const { data: existing } = await supabase
    .from("group_invites")
    .select("token")
    .eq("group_id", groupId)
    .is("invited_member_id", null)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.token) {
    return {
      created: { token: existing.token, url: buildInviteUrl(existing.token) },
    };
  }

  const { data: inv, error } = await supabase
    .from("group_invites")
    .insert({
      group_id: groupId,
      invited_member_id: null,
      display_name: displayName,
      created_by: u.user.id,
    })
    .select("token")
    .single();

  if (error || !inv) {
    console.error("createNewMemberInvite failed", error);
    return { error: error?.message ?? "Gagal membuat link undangan" };
  }
  revalidatePath(`/groups/${groupId}/settings`);
  return {
    created: { token: inv.token, url: buildInviteUrl(inv.token) },
  };
}


/** Revoke (delete) an outstanding invite. */
export async function revokeInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const groupId = String(formData.get("group_id") ?? "");
  if (!token) return;

  const supabase = await createClient();
  await supabase.from("group_invites").delete().eq("token", token);
  revalidatePath(`/groups/${groupId}/settings`);
}

/**
 * Run on the joiner side after they tap "Gabung". Calls the RPC,
 * which atomically claims the seat / inserts new member, then
 * redirects to the group page.
 */
export async function acceptInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/groups");

  const supabase = await createClient();
  type Rpc = {
    rpc: (
      fn: "accept_invite",
      args: { _token: string }
    ) => Promise<{ data: string | null; error: { message: string } | null }>;
  };
  const { data: groupId, error } = await (supabase as unknown as Rpc).rpc(
    "accept_invite",
    { _token: token }
  );

  if (error || !groupId) {
    console.error("acceptInvite failed", error);
    // Rather than throw, redirect with a query param so the join
    // page can render a friendly message.
    const reason = error?.message ?? "unknown";
    redirect(`/join/${token}?error=${encodeURIComponent(reason)}`);
  }

  revalidatePath("/", "layout");
  redirect(`/groups/${groupId}`);
}
