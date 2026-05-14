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

  return (
    <>
      <PageHeader title="Riwayat transaksi" />
      <div className="px-4 py-4 space-y-5">
        {expenses.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Receipt className="size-7" />}
              title="Belum ada transaksi"
              description="Riwayat pengeluaran kamu di semua grup akan muncul di sini."
            />
          </Card>
        ) : (
          Array.from(groups.entries()).map(([day, items]) => {
            const dayTotal = items.reduce((s, e) => s + Number(e.amount), 0);
            return (
              <section key={day}>
                <header className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    {day}
                  </h3>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {formatRupiah(dayTotal)}
                  </span>
                </header>
                <ul className="space-y-2">
                  {items.map((e) => (
                    <li key={e.id}>
                      <Link href={`/groups/${e.group_id}/expenses/${e.id}`}>
                        <Card className="p-3.5 flex items-center gap-3 hover:bg-[var(--color-muted)] transition-colors">
                          <span className="size-10 grid place-items-center rounded-xl bg-[var(--color-muted)] text-lg">
                            {e.group_emoji ?? "👥"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate leading-tight">
                              {e.title}
                            </p>
                            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 truncate">
                              {e.group_name} ·{" "}
                              {format(new Date(e.spent_at), "HH:mm", {
                                locale: idLocale,
                              })}
                            </p>
                          </div>
                          <p className="font-semibold text-sm shrink-0">
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
