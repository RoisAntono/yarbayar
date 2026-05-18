import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyGroupsWithSummary } from "@/lib/data";
import { cn, formatMoney, formatRupiah } from "@/lib/utils";

export const metadata = { title: "Grup" };
export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const groups = await getMyGroupsWithSummary();
  const totalGroups = groups.length;
  const totalSpent = groups.reduce((s, g) => s + g.total_spent, 0);

  return (
    <>
      <PageHeader
        title="Grup"
        subtitle={
          totalGroups
            ? `${totalGroups} grup · total ${formatRupiah(totalSpent)}`
            : "Buat grup pertama kamu"
        }
        // Catatan: totalSpent agregat lintas grup. Kalau ada grup
        // dengan currency campur, kita tampilkan dalam IDR sebagai
        // catch-all (lihat formatRupiah default). Per-group amount
        // di list di bawah pakai g.currency masing-masing — itu
        // signal yang lebih akurat.
        right={
          <Link href="/groups/new" aria-label="Buat grup">
            <Button size="icon" variant="secondary">
              <Plus className="size-5" />
            </Button>
          </Link>
        }
      />

      <div className="space-y-3 px-4 py-4">
        {totalGroups === 0 ? (
          <Card className="float-in">
            <EmptyState
              icon={<Users className="size-7" />}
              title="Belum ada grup"
              description="Splitbill bareng teman, keluarga, atau geng trip."
              action={
                <Link href="/groups/new">
                  <Button variant="accent" size="sm" className="mt-2">
                    <Plus className="size-4" /> Buat grup
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {groups.map((g, i) => (
              <li
                key={g.id}
                className="float-in"
                style={{ animationDelay: `${50 * i}ms` }}
              >
                <Link href={`/groups/${g.id}`}>
                  <Card className="group flex items-center gap-3.5 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-muted)] text-2xl">
                      {g.emoji ?? "👥"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold tracking-tight">{g.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                        {g.member_count} anggota · Total{" "}
                        <span className="tabular">
                          {formatMoney(g.total_spent, g.currency)}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "tabular text-sm font-semibold",
                          g.my_net > 0
                            ? "text-[var(--color-success)]"
                            : g.my_net < 0
                              ? "text-[var(--color-destructive)]"
                              : "text-[var(--color-muted-foreground)]"
                        )}
                      >
                        {g.my_net === 0
                          ? "Lunas"
                          : g.my_net > 0
                            ? `+${formatMoney(g.my_net, g.currency)}`
                            : `−${formatMoney(-g.my_net, g.currency)}`}
                      </p>
                      {g.my_net !== 0 && (
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]/70">
                          {g.my_net > 0 ? "diterima" : "dibayar"}
                        </p>
                      )}
                    </div>
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
