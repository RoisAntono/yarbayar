"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupportedCurrency } from "@/lib/currency";

export type GroupFormState =
  | { error?: string; fieldErrors?: { name?: string } }
  | undefined;

export async function createGroupAction(
  _prev: GroupFormState,
  formData: FormData
): Promise<GroupFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || null;
  const memberNamesRaw = formData
    .getAll("member_name")
    .map((v) => String(v).trim())
    .filter((n) => n.length > 0);

  if (name.length < 2) return { fieldErrors: { name: "Nama grup minimal 2 karakter" } };

  const supabase = await createClient();
  const { data: u, error: userErr } = await supabase.auth.getUser();
  if (userErr || !u?.user) {
    return { error: "Sesi habis, silakan masuk ulang" };
  }

  const ownerName =
    String(formData.get("owner_name") ?? "").trim() ||
    u.user.user_metadata?.full_name ||
    u.user.email?.split("@")[0] ||
    "Saya";

  // Use the SECURITY DEFINER RPC so the create-group flow is atomic and
  // doesn't depend on per-table RLS policies aligning correctly. The RPC
  // re-verifies auth.uid() server-side before doing anything.
  type Rpc = {
    rpc: (
      fn: "create_group_with_members",
      args: {
        _name: string;
        _emoji: string | null;
        _owner_display_name: string;
        _member_names: string[];
      }
    ) => Promise<{ data: string | null; error: { message: string } | null }>;
  };
  const { data: groupId, error } = await (supabase as unknown as Rpc).rpc(
    "create_group_with_members",
    {
      _name: name,
      _emoji: emoji,
      _owner_display_name: ownerName,
      _member_names: memberNamesRaw,
    }
  );

  if (error || !groupId) {
    console.error("createGroup: rpc failed", error);
    if (error?.message.toLowerCase().includes("could not find")) {
      return {
        error:
          "Migrasi SQL `0003_create_group_rpc.sql` belum dijalankan di Supabase. Buka SQL Editor lalu jalankan file itu.",
      };
    }
    return { error: error?.message ?? "Gagal membuat grup" };
  }

  revalidatePath("/", "layout");
  redirect(`/groups/${groupId}`);
}

export async function addMemberAction(formData: FormData) {
  const groupId = String(formData.get("group_id"));
  const display_name = String(formData.get("display_name") ?? "").trim();
  if (!groupId || display_name.length < 1) return;

  const supabase = await createClient();
  await supabase.from("group_members").insert({ group_id: groupId, display_name });
  revalidatePath(`/groups/${groupId}`);
}

export async function removeMemberAction(formData: FormData) {
  const memberId = String(formData.get("member_id"));
  const groupId = String(formData.get("group_id"));
  if (!memberId) return;
  const supabase = await createClient();
  await supabase.from("group_members").delete().eq("id", memberId);
  revalidatePath(`/groups/${groupId}`);
}

/**
 * Update mata uang grup. Owner-only — RLS di `groups` policy
 * memastikan ini, tapi kita re-check di sini juga buat pesan error
 * yang lebih jelas (kalau cuma RLS, error generic "permission denied").
 *
 * Sama dengan picker user-level di `/profile/currency`: ini cuma
 * format display, BUKAN conversion. Nilai amount yang udah ke-record
 * tidak dikonversi otomatis ke currency baru.
 */
export async function updateGroupCurrencyAction(formData: FormData) {
  const groupId = String(formData.get("group_id"));
  const code = String(formData.get("currency") ?? "").trim();
  if (!groupId || !code) return;

  if (!isSupportedCurrency(code)) {
    // Silent fallback — UI cuma kasih currency yang valid via dropdown,
    // jadi kalau sampai sini = tampering. Tidak perlu user-facing error.
    return;
  }

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return;

  // Verify owner sebelum write — defense in depth (RLS juga enforce).
  const { data: group } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .maybeSingle();
  if (!group || group.owner_id !== u.user.id) return;

  await supabase.from("groups").update({ currency: code }).eq("id", groupId);

  // Revalidate semua path yang display group amount — overkill tapi
  // lebih aman dari miss. Layout-level revalidate cover Beranda
  // (group nets) + groups list + group detail.
  revalidatePath("/", "layout");
}

export async function deleteGroupAction(formData: FormData) {
  const groupId = String(formData.get("group_id"));
  if (!groupId) return;
  const supabase = await createClient();
  await supabase.from("groups").delete().eq("id", groupId);
  revalidatePath("/", "layout");
  redirect("/groups");
}
