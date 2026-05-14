import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyGroupsWithSummary } from "@/lib/data";
import { cn, formatRupiah } from "@/lib/utils";

export const metadata = { title: "Grup" };
export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const groups = await getMyGroupsWithSummary();

  return (
    <>
      <PageHeader
        title="Grup"
        right={
          <Link href="/groups/new" aria-label="Buat grup">
            <Button size="icon" variant="secondary">
              <Plus className="size-5" />
            </Button>
          </Link>
        }
      />
      <div className="px-4 py-4">
        {groups.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Users className="size-7" />}
              title="Belum ada grup"
              description="Grup memudahkan kamu mengelola pengeluaran bareng teman, keluarga, atau rekan trip."
              action={
                <Link href="/groups/new">
                  <Button size="sm" className="mt-2">
                    <Plus className="size-4" /> Buat grup
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.id}>
                <Link href={`/groups/${g.id}`}>
                  <Card className="p-4 flex items-center gap-3 hover:bg-[var(--color-muted)] transition-colors">
                    <span className="size-12 grid place-items-center rounded-xl bg-[var(--color-muted)] text-2xl">
                      {g.emoji ?? "👥"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{g.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {g.member_count} anggota · Total {formatRupiah(g.total_spent)}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        g.my_net > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : g.my_net < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-[var(--color-muted-foreground)]"
                      )}
                    >
                      {g.my_net === 0
                        ? "Lunas"
                        : g.my_net > 0
                          ? `+${formatRupiah(g.my_net)}`
                          : `-${formatRupiah(-g.my_net)}`}
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
