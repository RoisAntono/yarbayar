import { Suspense, cache } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/animated-number";
import {
  getCurrentUser,
  getMonthlySummary,
  getMyGroupsWithSummary,
  getProfile,
} from "@/lib/data";
import { getCurrencyConfig } from "@/lib/currency";
import { cn, formatMoney, formatRupiah } from "@/lib/utils";

/**
 * Cached fetchers untuk dedup per-request.
 *
 * `getProfile` dipakai di GreetingHeader (untuk full_name) DAN di
 * CashflowCard (untuk currency). `getMyGroupsWithSummary` dipakai di
 * HeroBalanceCard DAN GroupsList. Tanpa cache, Supabase round-trip
 * akan double — meski masing-masing async component independent.
 *
 * `React.cache()` dedup per-request: panggilan kedua dengan arg sama
 * pakai promise dari panggilan pertama. Pattern ini setara dengan
 * `unstable_cache` lama tapi pure compute (no I/O cache layer).
 */
const fetchProfile = cache(getProfile);
const fetchGroups = cache(getMyGroupsWithSummary);
const fetchSummary = cache(getMonthlySummary);

export const dynamic = "force-dynamic";

/**
 * Beranda dengan streaming Suspense.
 *
 * Sebelumnya: satu `Promise.all([profile, groups, summary])` di top
 * function → halaman blokir sampai 3 query selesai. Di koneksi 3G
 * simulated bisa 800ms-1.2s blank screen.
 *
 * Sekarang: shell langsung di-render (greeting placeholder, quick
 * actions static), 4 boundary independent yang stream ketika masing-
 * masing data ready. Hero saldo + cashflow + groups list muncul
 * progressively. FCP < 600ms dengan content non-data udah visible
 * langsung.
 *
 * Why split jadi 4, bukan 1 Suspense besar?
 *   - GreetingHeader (profile.full_name) = ~50ms query
 *   - HeroBalanceCard (groups + nested expenses + splits) = ~250ms
 *   - CashflowCard (monthly summary = unified expenses) = ~200ms
 *   - GroupsList (groups, shared cache) = instant setelah hero
 *
 * Kalau gabung jadi 1 Suspense, user nunggu ~250ms untuk SEMUA card
 * muncul. Split bikin greeting + hero saldo (yang paling penting,
 * bukti app responsive) muncul duluan, sisanya nyusul.
 */
export default async function HomePage() {
  // getCurrentUser() = cookie validation, super cepat (~5-20ms).
  // Kita tetap await di top karena userId dipakai di 2 child components
  // dan tidak ada gunanya delay shell render untuk ini.
  const user = await getCurrentUser();
  if (!user) return null;
  const userId = user.id;
  const userEmail = user.email ?? "";

  return (
    <div className="space-y-6 px-4 pt-4 pb-2">
      {/* Greeting + avatar — first paint priority, smallest fetch */}
      <Suspense fallback={<GreetingHeaderSkeleton />}>
        <GreetingHeader userId={userId} userEmail={userEmail} />
      </Suspense>

      {/* Hero saldo bersih — primary data, biggest fetch (groups + splits) */}
      <Suspense fallback={<HeroBalanceSkeleton />}>
        <HeroBalanceCard />
      </Suspense>

      {/* Cashflow card — secondary, hidden kalau count 0 */}
      <Suspense fallback={<CashflowSkeleton />}>
        <CashflowCard userId={userId} />
      </Suspense>

      {/* Quick actions — pure static, no Suspense needed.
          Render synchronously sesuai shell, biar selalu visible
          walau data belum sampai. */}
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

      {/* Groups section — header static, list streamed */}
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

        <Suspense fallback={<GroupsListSkeleton />}>
          <GroupsList />
        </Suspense>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------
// Async section components — masing-masing punya Suspense parent
// ---------------------------------------------------------------

async function GreetingHeader({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const profile = await fetchProfile(userId);
  const greet = greeting();
  const firstName = (profile?.full_name ?? userEmail ?? "Teman").split(" ")[0];

  return (
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
          name={profile?.full_name ?? userEmail ?? "U"}
          size="md"
          className="ring-2 ring-[var(--color-card)] shadow-[var(--shadow-card)]"
        />
      </Link>
    </div>
  );
}

async function HeroBalanceCard() {
  const groups = await fetchGroups();
  const totalNet = groups.reduce((s, g) => s + g.my_net, 0);
  const owedToMe = groups.reduce((s, g) => s + Math.max(0, g.my_net), 0);
  const iOwe = groups.reduce((s, g) => s + Math.max(0, -g.my_net), 0);

  return (
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
  );
}

async function CashflowCard({ userId }: { userId: string }) {
  // Parallel fetch: summary + profile (cached, dedup dengan greeting).
  const [summary, profile] = await Promise.all([
    fetchSummary(),
    fetchProfile(userId),
  ]);

  // Hide kalau tidak ada catatan bulan ini — sama dengan implementasi
  // sebelumnya. Suspense fallback di atas akan tetap kosong kalau
  // count 0, tapi space tidak reserve karena card-nya null.
  if (summary.count === 0) return null;

  const userCurrency = getCurrencyConfig(profile?.currency).code;

  return (
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
  );
}

async function GroupsList() {
  const groups = await fetchGroups();

  if (groups.length === 0) {
    return (
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
    );
  }

  return (
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
  );
}

// ---------------------------------------------------------------
// Skeleton fallbacks — match dimensi card asli supaya CLS ≈ 0.
// Prinsip AGENTS.md: "Skeleton harus match real card dimension".
// ---------------------------------------------------------------

function GreetingHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-40" />
      </div>
      <Skeleton className="size-10 rounded-full" />
    </div>
  );
}

function HeroBalanceSkeleton() {
  // Match aurora hero card. Pakai bg muted-on-ink supaya kontrak
  // dengan aurora tidak jarring saat content swap masuk.
  return (
    <Card className="aurora grain relative overflow-hidden border-0 p-6 text-[var(--color-on-ink)]">
      <div className="relative z-[2] space-y-2">
        <Skeleton className="h-3 w-28 bg-white/15" />
        <Skeleton className="h-12 w-48 bg-white/15" />
        <Skeleton className="h-3 w-32 bg-white/15" />
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Skeleton className="h-[68px] rounded-2xl bg-white/15" />
          <Skeleton className="h-[68px] rounded-2xl bg-white/15" />
        </div>
      </div>
    </Card>
  );
}

function CashflowSkeleton() {
  // Note: cashflow card itself bisa ngga muncul (count 0). Skeleton
  // tetap reserve space karena di sebagian besar user yang udah
  // pakai app, count > 0. Worst-case: skeleton appear sebentar lalu
  // hilang = micro-flicker yang acceptable.
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-[52px] rounded-xl" />
        <Skeleton className="h-[52px] rounded-xl" />
      </div>
    </Card>
  );
}

function GroupsListSkeleton() {
  // 3 row skeleton — match group row dimension (size-12 emoji,
  // 2 line text, right-aligned amount).
  return (
    <ul className="space-y-2.5">
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <Card className="flex items-center gap-3.5 p-3.5">
            <Skeleton className="size-12 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <div className="shrink-0 space-y-1.5 text-right">
              <Skeleton className="ml-auto h-4 w-20" />
              <Skeleton className="ml-auto h-2.5 w-12" />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------
// Pure presentational helpers
// ---------------------------------------------------------------

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
