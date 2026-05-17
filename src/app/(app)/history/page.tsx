import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { getRecentExpenses } from "@/lib/data";
import { formatRupiah } from "@/lib/utils";

export const metadata = { title: "Riwayat" };
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const expenses = await getRecentExpenses(50);

  // Group by date label
  const groups = new Map<string, typeof expenses>();
  for (const e of expenses) {
    const key = format(new Date(e.spent_at), "EEEE, d MMM yyyy", {
      locale: idLocale,
    });
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }

  const monthTotal = expenses
    .filter((e) => {
      const d = new Date(e.spent_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <>
      <PageHeader
        title="Riwayat"
        subtitle={
          expenses.length
            ? `Bulan ini · ${formatRupiah(monthTotal)}`
            : "Pengeluaran kamu di semua grup"
        }
      />
      <div className="space-y-6 px-4 py-4">
        {expenses.length === 0 ? (
          <Card className="float-in">
            <EmptyState
              icon={<Receipt className="size-7" />}
              title="Belum ada transaksi"
              description="Riwayat pengeluaran kamu di semua grup akan muncul di sini."
            />
          </Card>
        ) : (
          Array.from(groups.entries()).map(([day, items], gi) => {
            const dayTotal = items.reduce((s, e) => s + Number(e.amount), 0);
            // Animate only the first ~3 day-sections; older days come
            // in instantly so we don't run dozens of animations on a
            // long history list.
            const animate = gi < 3;
            return (
              <section
                key={day}
                className={animate ? "float-in" : undefined}
                style={animate ? { animationDelay: `${gi * 60}ms` } : undefined}
              >
                <header className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                    {day}
                  </h3>
                  <span className="tabular text-xs font-medium text-[var(--color-muted-foreground)]">
                    {formatRupiah(dayTotal)}
                  </span>
                </header>
                <ul className="space-y-2">
                  {items.map((e) => (
                    <li key={e.id}>
                      <Link href={`/groups/${e.group_id}/expenses/${e.id}`}>
                        <Card className="flex items-center gap-3 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
                          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-muted)] text-xl">
                            {e.group_emoji ?? "👥"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold leading-tight tracking-tight">
                              {e.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
                              {e.group_name} ·{" "}
                              {format(new Date(e.spent_at), "HH:mm", {
                                locale: idLocale,
                              })}
                            </p>
                          </div>
                          <p className="tabular shrink-0 font-semibold text-sm">
                            {formatRupiah(e.amount)}
                          </p>
                        </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
