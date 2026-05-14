"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function deleteGroupAction(formData: FormData) {
  const groupId = String(formData.get("group_id"));
  if (!groupId) return;
  const supabase = await createClient();
  await supabase.from("groups").delete().eq("id", groupId);
  revalidatePath("/", "layout");
  redirect("/groups");
}
