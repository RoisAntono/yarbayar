import { notFound } from "next/navigation";
import { Trash2, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
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

      <div className="px-4 py-4 space-y-5">
        <section>
          <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)] mb-2">
            Anggota
          </h3>
          <Card className="divide-y divide-[var(--color-border)]">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <Avatar name={m.display_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{m.display_name}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {m.profile_id ? "Akun terdaftar" : "Tamu"}
                  </p>
                </div>
                {isOwner && m.profile_id !== group.owner_id && (
                  <form action={removeMemberAction}>
                    <input type="hidden" name="member_id" value={m.id} />
                    <input type="hidden" name="group_id" value={group.id} />
                    <Button
                      type="submit"
                      size="icon"
                      variant="ghost"
                      aria-label="Hapus anggota"
                    >
                      <Trash2 className="size-4 text-[var(--color-destructive)]" />
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </Card>
        </section>

        {isOwner && (
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)] mb-2">
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
                <Button type="submit" className="w-full">
                  <UserPlus className="size-4" /> Tambah
                </Button>
              </form>
            </Card>
          </section>
        )}

        {isOwner && (
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-destructive)] mb-2">
              Zona berbahaya
            </h3>
            <form action={deleteGroupAction}>
              <input type="hidden" name="group_id" value={group.id} />
              <Button
                type="submit"
                variant="outline"
                size="lg"
                className="w-full text-[var(--color-destructive)]"
              >
                <Trash2 className="size-4" />
                Hapus grup ini
              </Button>
            </form>
            <p className="text-xs text-[var(--color-muted-foreground)] text-center mt-2">
              Semua pengeluaran dan riwayat di grup ini akan ikut terhapus.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
