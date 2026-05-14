import Link from "next/link";
import { ArrowRight, Plus, Receipt, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser, getMyGroupsWithSummary, getProfile } from "@/lib/data";
import { cn, formatRupiah } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [profile, groups] = await Promise.all([
    getProfile(user.id),
    getMyGroupsWithSummary(),
  ]);

  const totalNet = groups.reduce((s, g) => s + g.my_net, 0);
  const owedToMe = groups.reduce((s, g) => s + Math.max(0, g.my_net), 0);
  const iOwe = groups.reduce((s, g) => s + Math.max(0, -g.my_net), 0);
  const greet = greeting();

  return (
    <div className="px-4 pt-4 pb-6 space-y-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">{greet}</p>
          <h2 className="text-xl font-semibold leading-tight">
            Halo, {profile?.full_name ?? "teman"} 👋
          </h2>
        </div>
        <Link href="/profile">
          <Avatar name={profile?.full_name ?? user.email ?? "U"} size="md" />
        </Link>
      </div>

      {/* Balance hero */}
      <Card className="relative overflow-hidden p-5 bg-gradient-to-br from-[var(--color-primary)] to-[color-mix(in_oklab,var(--color-primary),black_15%)] text-[var(--color-primary-foreground)] border-0">
        <p className="text-xs/4 opacity-80">Saldo bersih kamu</p>
        <p className="text-3xl font-bold tracking-tight mt-1">
          {totalNet >= 0 ? formatRupiah(totalNet) : `-${formatRupiah(-totalNet)}`}
        </p>
        <p className="text-xs/4 opacity-80 mt-1">
          {totalNet === 0
            ? "Lunas dengan semua orang ✨"
            : totalNet > 0
              ? "Total yang harus diterima"
              : "Total yang harus dibayar"}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-xl bg-white/15 backdrop-blur-sm p-3">
            <div className="flex items-center gap-1.5 text-xs opacity-90">
              <TrendingUp className="size-3.5" /> Diterima
            </div>
            <p className="font-semibold mt-1">{formatRupiah(owedToMe)}</p>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur-sm p-3">
            <div className="flex items-center gap-1.5 text-xs opacity-90">
              <TrendingDown className="size-3.5" /> Dibayar
            </div>
            <p className="font-semibold mt-1">{formatRupiah(iOwe)}</p>
          </div>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/groups/new">
          <Card className="p-4 hover:bg-[var(--color-muted)] transition-colors h-full flex items-center gap-3">
            <span className="size-10 grid place-items-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <Users className="size-5" />
            </span>
            <div className="text-sm font-medium leading-tight">Buat grup baru</div>
          </Card>
        </Link>
        <Link href="/history">
          <Card className="p-4 hover:bg-[var(--color-muted)] transition-colors h-full flex items-center gap-3">
            <span className="size-10 grid place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Receipt className="size-5" />
            </span>
            <div className="text-sm font-medium leading-tight">Riwayat transaksi</div>
          </Card>
        </Link>
      </div>

      {/* Groups */}
      <section>
        <header className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Grup kamu</h3>
          <Link
            href="/groups"
            className="text-xs text-[var(--color-primary)] font-medium flex items-center gap-1"
          >
            Lihat semua <ArrowRight className="size-3.5" />
          </Link>
        </header>

        {groups.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Users className="size-7" />}
              title="Belum ada grup"
              description="Mulai dengan buat grup, ajak teman, lalu catat pengeluaran bareng."
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
            {groups.slice(0, 5).map((g) => (
              <li key={g.id}>
                <Link href={`/groups/${g.id}`}>
                  <Card className="p-4 flex items-center gap-3 hover:bg-[var(--color-muted)] transition-colors">
                    <span className="size-11 grid place-items-center rounded-xl bg-[var(--color-muted)] text-xl">
                      {g.emoji ?? "👥"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{g.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {g.member_count} anggota · {formatRupiah(g.total_spent)}
                      </p>
                    </div>
                    <div className="text-right">
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
                      <p className="text-[10px] text-[var(--color-muted-foreground)]">
                        {g.my_net > 0 ? "diterima" : g.my_net < 0 ? "dibayar" : ""}
                      </p>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}
