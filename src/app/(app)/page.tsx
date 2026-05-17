import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedNumber } from "@/components/animated-number";
import {
  getCurrentUser,
  getMonthlySummary,
  getMyGroupsWithSummary,
  getProfile,
} from "@/lib/data";
import { getCurrencyConfig } from "@/lib/currency";
import { cn, formatMoney, formatRupiah } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [profile, groups, summary] = await Promise.all([
    getProfile(user.id),
    getMyGroupsWithSummary(),
    getMonthlySummary(),
  ]);

  const totalNet = groups.reduce((s, g) => s + g.my_net, 0);
  const owedToMe = groups.reduce((s, g) => s + Math.max(0, g.my_net), 0);
  const iOwe = groups.reduce((s, g) => s + Math.max(0, -g.my_net), 0);
  const greet = greeting();
  const firstName = (profile?.full_name ?? user.email ?? "Teman").split(" ")[0];
  // User's currency preference — dipakai untuk personal-scope display
  // (cashflow card). Hero saldo + group rows tetap pakai formatRupiah
  // karena nilai aggregat dari group expenses yang punya currency
  // sendiri di schema (groups.currency, default IDR, belum exposed
  // ke UI).
  const userCurrency = getCurrencyConfig(profile?.currency).code;

  return (
    <div className="space-y-6 px-4 pt-4 pb-2">
      {/* Greeting row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
            {greet}
          </p>
          <h2 className="mt-0.5 text-2xl tracking-tight">
            <span className="font-display-italic">Halo,</span>{" "}
            <span className="font-medium">{firstName}</span>
          </h2>
        </div>
        <Link href="/profile" aria-label="Profil">
          <Avatar
            name={profile?.full_name ?? user.email ?? "U"}
            size="md"
            className="ring-2 ring-[var(--color-card)] shadow-[var(--shadow-card)]"
          />
        </Link>
      </div>

      {/* Hero saldo — aurora bg, serif display number */}
      <Card className="aurora grain relative overflow-hidden border-0 p-6 text-[var(--color-on-ink)] float-in">
        <div className="relative z-[2]">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] opacity-70">
            <Sparkles className="size-3.5" />
            Saldo bersih
          </div>
          <p className="mt-2 text-5xl leading-none">
            <span className="font-display tabular">
              {totalNet >= 0 ? (
                <AnimatedNumber value={totalNet} />
              ) : (
                <>
                  <span aria-hidden>−</span>
                  <AnimatedNumber value={-totalNet} />
                </>
              )}
            </span>
          </p>
          <p className="mt-2 text-sm opacity-75">
            {totalNet === 0
              ? "Lunas dengan semua orang ✨"
              : totalNet > 0
                ? "yang harus kamu terima"
                : "yang harus kamu bayar"}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <BalanceTile
              icon={<TrendingUp className="size-3.5" />}
              label="Diterima"
              value={owedToMe}
              tone="positive"
            />
            <BalanceTile
              icon={<TrendingDown className="size-3.5" />}
              label="Dibayar"
              value={iOwe}
              tone="neutral"
            />
          </div>
        </div>
      </Card>

      {/* Cashflow bulan ini — gabungan pemasukan/pengeluaran personal
          + share di grup. Hadir setelah hero saldo karena ini adalah
          secondary signal: saldo = "berapa hutang/piutang", cashflow
          = "berapa duit masuk vs keluar".

          Whole card di-wrap Link ke /history — single tappable
          affordance match pattern row di seluruh app (group rows,
          personal rows, settings rows). Dua link kecil "Riwayat
          →" + "Detail →" yang sebelumnya ada di header itu visual
          clutter — sekarang tap area = card-wide, dengan
          ChevronRight subtle di pojok kanan sebagai cue. */}
      {summary.count > 0 && (
        <Link href="/history" className="block">
          <Card className="space-y-3 p-4 float-in transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] active:scale-[0.99]">
            <div className="flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent),transparent_85%)] text-[var(--color-accent)]">
                <Wallet className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                  Cashflow bulan ini
                </p>
                <p
                  className={cn(
                    "tabular text-lg font-semibold tracking-tight",
                    summary.net > 0
                      ? "text-[var(--color-success)]"
                      : summary.net < 0
                        ? "text-[var(--color-destructive)]"
                        : ""
                  )}
                >
                  {summary.net > 0 ? "+" : summary.net < 0 ? "−" : ""}
                  {formatMoney(Math.abs(summary.net), userCurrency)}
                </p>
              </div>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-[var(--color-muted-foreground)]/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-[var(--color-muted)] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Masuk
                </p>
                <p className="tabular mt-0.5 text-sm font-semibold text-[var(--color-success)]">
                  {formatMoney(summary.income_total, userCurrency)}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--color-muted)] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Keluar
                </p>
                <p className="tabular mt-0.5 text-sm font-semibold">
                  {formatMoney(summary.total, userCurrency)}
                </p>
              </div>
            </div>
          </Card>
        </Link>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          href="/personal/new"
          icon={<Plus className="size-5" />}
          title="Catat pribadi"
          subtitle="Pemasukan & pengeluaran solo"
          tone="accent"
        />
        <QuickAction
          href="/groups/new"
          icon={<Users className="size-5" />}
          title="Grup baru"
          subtitle="Splitbill bareng teman"
        />
      </div>

      {/* Groups section */}
      <section>
        <header className="mb-3 flex items-baseline justify-between">
          <h3 className="text-base font-semibold tracking-tight">Grup kamu</h3>
          <Link
            href="/groups"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            Lihat semua <ArrowRight className="size-3.5" />
          </Link>
        </header>

        {groups.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Users className="size-7" />}
              title="Belum ada grup"
              description="Buat grup, ajak teman, mulai splitbill."
              action={
                <Link href="/groups/new">
                  <Button variant="accent" size="sm" className="mt-2">
                    Buat grup pertama
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {groups.slice(0, 5).map((g, i) => (
              <li
                key={g.id}
                // Stagger only the first 4 entries; deeper rows skip the
                // entrance animation to keep low-end paint costs down.
                className={i < 4 ? "float-in" : undefined}
                style={i < 4 ? { animationDelay: `${60 * i}ms` } : undefined}
              >
                <Link href={`/groups/${g.id}`}>
                  <Card className="group flex items-center gap-3.5 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-muted)] text-2xl">
                      {g.emoji ?? "👥"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold tracking-tight">{g.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                        {g.member_count} anggota · Total{" "}
                        <span className="tabular">{formatRupiah(g.total_spent)}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          // CSS var so theming stays consistent
                          // app-wide (sebelumnya hardcoded
                          // emerald/rose dari tailwind, beda dari
                          // semantic var di file lain).
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
                            ? `+${formatRupiah(g.my_net)}`
                            : `−${formatRupiah(-g.my_net)}`}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]/70">
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

function BalanceTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "positive" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-3.5 py-3 backdrop-blur-md",
        tone === "positive"
          ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
          : "bg-white/10 text-[var(--color-on-ink)]"
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] opacity-80">
        {icon} {label}
      </div>
      <p className="mt-1.5 tabular text-lg font-semibold">{formatRupiah(value)}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  subtitle,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone?: "accent";
}) {
  return (
    <Link href={href}>
      <Card
        className={cn(
          "h-full p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]",
          tone === "accent" &&
            "border-0 bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[var(--shadow-pop-accent)]"
        )}
      >
        <span
          className={cn(
            "mb-2 grid size-9 place-items-center rounded-xl",
            tone === "accent"
              ? "bg-black/15 text-[var(--color-accent-foreground)]"
              : "bg-[var(--color-muted)] text-[var(--color-foreground)]"
          )}
        >
          {icon}
        </span>
        <p className="text-sm font-semibold tracking-tight">{title}</p>
        <p
          className={cn(
            "mt-0.5 text-[11px]",
            tone === "accent" ? "opacity-80" : "text-[var(--color-muted-foreground)]"
          )}
        >
          {subtitle}
        </p>
      </Card>
    </Link>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}
