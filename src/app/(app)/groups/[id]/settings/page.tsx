import { notFound } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import {
  addMemberAction,
  deleteGroupAction,
  removeMemberAction,
} from "../../actions";
import { getCurrentUser, getGroupDetail } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { DeleteGroupButton, RemoveMemberButton } from "./danger-actions";
import {
  ClaimInviteButton,
  NewMemberInviteCard,
  PendingInvitesList,
} from "./invite-link-card";

export const metadata = { title: "Pengaturan Grup" };
export const dynamic = "force-dynamic";

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, group] = await Promise.all([
    getCurrentUser(),
    getGroupDetail(id),
  ]);
  if (!group) notFound();

  const isOwner = user?.id === group.owner_id;

  // Owner-only: opportunistically clean up expired or used invites
  // for this group when the settings page loads. Cheap operation
  // (a single DELETE on indexed columns), keeps the table from
  // growing forever without needing a cron job. Non-owners just see
  // pending invites — RLS prevents them from deleting anyway.
  const supabase = await createClient();
  if (isOwner) {
    await supabase
      .from("group_invites")
      .delete()
      .eq("group_id", group.id)
      .or(`expires_at.lt.${new Date().toISOString()},used_at.not.is.null`);
  }

  // Load pending (unused & not expired) invites for this group. Only
  // group members can SELECT due to RLS, so we just hand it to the
  // client component.
  const { data: invitesRaw } = await supabase
    .from("group_invites")
    .select("token, display_name, expires_at, invited_member_id")
    .eq("group_id", group.id)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  const pendingInvites = (invitesRaw ?? []).map((i) => ({
    token: i.token,
    display_name: i.display_name,
    expires_at: i.expires_at,
    is_claim: i.invited_member_id !== null,
  }));

  return (
    <>
      <PageHeader title="Pengaturan grup" subtitle={group.name} back />

      <div className="space-y-6 px-4 py-4">
        {/* MEMBERS */}
        <section>
          <header className="mb-2 flex items-baseline justify-between gap-2 px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Anggota · {group.members.length}
            </h3>
            <p className="text-[10px] text-[var(--color-muted-foreground)]/70">
              Akun · Tamu · Pemilik
            </p>
          </header>
          <Card className="divide-y divide-[var(--color-border)]">
            {group.members.map((m) => {
              // Three role buckets:
              //   - Owner (= profile_id === group.owner_id)
              //   - Auth member (profile_id !== null && != owner)
              //   - Guest (profile_id === null)
              const isThisOwner = m.profile_id === group.owner_id;
              const isAuth = !!m.profile_id && !isThisOwner;
              const isGuest = !m.profile_id;

              return (
                <div key={m.id} className="flex items-center gap-3 p-3.5">
                  <Avatar name={m.display_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m.display_name}
                      {m.profile_id === user?.id && (
                        <span className="ml-1.5 text-[11px] font-normal text-[var(--color-muted-foreground)]">
                          (kamu)
                        </span>
                      )}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {isThisOwner ? (
                        <Badge className="text-[10px]">Pemilik</Badge>
                      ) : isAuth ? (
                        <Badge variant="success" className="text-[10px]">
                          Akun terhubung
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Tamu
                        </Badge>
                      )}
                      {isGuest && (
                        <span className="text-[10px] text-[var(--color-muted-foreground)]/70">
                          Pemilik bertindak atas nama mereka
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Owner-only actions per row */}
                  {isOwner && isGuest && (
                    <ClaimInviteButton
                      groupId={group.id}
                      memberId={m.id}
                      memberName={m.display_name}
                    />
                  )}
                  {isOwner && !isThisOwner && (
                    <RemoveMemberButton
                      action={removeMemberAction}
                      groupId={group.id}
                      memberId={m.id}
                      memberName={m.display_name}
                    />
                  )}
                </div>
              );
            })}
          </Card>
          <p className="mt-2 px-1 text-[10px] leading-relaxed text-[var(--color-muted-foreground)]/80">
            Tamu = anggota tanpa akun, pemilik konfirmasi pelunasannya. Akun
            terhubung = anggota yang punya login sendiri dan konfirmasi
            pelunasan secara mandiri.
          </p>
        </section>

        {/* PENDING INVITES — owner-only, only when there are any */}
        {isOwner && pendingInvites.length > 0 && (
          <section>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Link aktif · {pendingInvites.length}
            </h3>
            <PendingInvitesList
              groupId={group.id}
              invites={pendingInvites}
            />
          </section>
        )}

        {/* ADD MEMBER — owner only, two patterns */}
        {isOwner && (
          <section>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Tambah anggota
            </h3>

            <div className="space-y-3">
              {/* Quick add as guest — for friends who don't have the
                  app, owner-managed flow */}
              <Card className="p-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                    <UserPlus className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Tambah cepat (tamu)</p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Buat anggota tanpa undangan · kamu yang konfirmasi
                      pelunasan
                    </p>
                  </div>
                </div>
                <form action={addMemberAction} className="space-y-3">
                  <input type="hidden" name="group_id" value={group.id} />
                  <div className="space-y-1.5">
                    <Label htmlFor="display_name" className="sr-only">
                      Nama
                    </Label>
                    <Input
                      id="display_name"
                      name="display_name"
                      placeholder="Nama anggota"
                      required
                    />
                  </div>
                  <Button type="submit" variant="outline" className="w-full">
                    Tambah sebagai tamu
                  </Button>
                </form>
              </Card>

              {/* Invite link → joiner becomes auth member */}
              <NewMemberInviteCard groupId={group.id} />
            </div>
          </section>
        )}

        {/* DANGER ZONE */}
        {isOwner && (
          <section>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-destructive)]">
              Zona berbahaya
            </h3>
            <DeleteGroupButton
              action={deleteGroupAction}
              groupId={group.id}
              groupName={group.name}
            />
            <p className="mt-2 text-center text-xs text-[var(--color-muted-foreground)]">
              Semua pengeluaran dan riwayat di grup ini akan ikut terhapus.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
