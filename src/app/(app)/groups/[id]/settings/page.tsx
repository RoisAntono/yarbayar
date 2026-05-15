import { notFound } from "next/navigation";
import { Trash2, UserPlus } from "lucide-react";
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

  return (
    <>
      <PageHeader title="Pengaturan grup" subtitle={group.name} back />

      <div className="space-y-6 px-4 py-4">
        <section>
          <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
            Anggota · {group.members.length}
          </h3>
          <Card className="divide-y divide-[var(--color-border)]">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3.5">
                <Avatar name={m.display_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.display_name}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {m.profile_id ? "Akun terdaftar" : "Tamu"}
                  </p>
                </div>
                {m.profile_id === group.owner_id && (
                  <Badge variant="secondary">Pemilik</Badge>
                )}
                {isOwner && m.profile_id !== group.owner_id && (
                  <form action={removeMemberAction}>
                    <input type="hidden" name="member_id" value={m.id} />
                    <input type="hidden" name="group_id" value={group.id} />
                    <Button
                      type="submit"
                      size="icon"
                      variant="ghost"
                      aria-label="Hapus anggota"
                      className="text-[var(--color-destructive)]"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </Card>
        </section>

        {isOwner && (
          <section>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Tambah anggota
            </h3>
            <Card className="p-4">
              <form action={addMemberAction} className="space-y-3">
                <input type="hidden" name="group_id" value={group.id} />
                <div className="space-y-1.5">
                  <Label htmlFor="display_name">Nama</Label>
                  <Input
                    id="display_name"
                    name="display_name"
                    placeholder="Nama anggota"
                    required
                  />
                </div>
                <Button type="submit" variant="accent" className="w-full">
                  <UserPlus className="size-4" /> Tambah
                </Button>
              </form>
            </Card>
          </section>
        )}

        {isOwner && (
          <section>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-destructive)]">
              Zona berbahaya
            </h3>
            <form action={deleteGroupAction}>
              <input type="hidden" name="group_id" value={group.id} />
              <Button
                type="submit"
                variant="outline"
                size="lg"
                className="w-full gap-2 text-[var(--color-destructive)] hover:bg-[color-mix(in_oklab,var(--color-destructive),transparent_92%)]"
              >
                <Trash2 className="size-4" />
                Hapus grup ini
              </Button>
            </form>
            <p className="mt-2 text-center text-xs text-[var(--color-muted-foreground)]">
              Semua pengeluaran dan riwayat di grup ini akan ikut terhapus.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
