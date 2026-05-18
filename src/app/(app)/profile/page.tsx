import Link from "next/link";
import { ChevronRight, Clock, Coins, LogOut, Mail, Target, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { logoutAction } from "@/app/(auth)/actions";
import { getCurrencyConfig } from "@/lib/currency";
import {
  getArchivedPersonalCount,
  getCurrentUser,
  getProfile,
} from "@/lib/data";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Profil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  // Trash count di-fetch parallel — count-only query, super murah.
  const [profile, archivedCount] = await Promise.all([
    getProfile(user.id),
    getArchivedPersonalCount(),
  ]);

  return (
    <>
      <PageHeader title="Saya" />
      <div className="space-y-5 px-4 py-4">
        {/* Identity card with aurora */}
        <Card className="aurora grain relative overflow-hidden border-0 p-6 text-center text-[var(--color-on-ink)] float-in">
          <div className="relative z-[2] flex flex-col items-center">
            <Avatar
              name={profile?.full_name ?? user.email ?? "U"}
              size="lg"
              className="mb-3 size-20 text-2xl shadow-[var(--shadow-pop)] ring-4 ring-white/10"
            />
            <h2 className="text-xl tracking-tight">
              <span className="font-display-italic">Halo,</span>{" "}
              <span className="font-medium">
                {(profile?.full_name ?? "Pengguna").split(" ")[0]}
              </span>
            </h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs opacity-75">
              <Mail className="size-3.5" />
              {user.email}
            </p>
          </div>
        </Card>

        {/* Settings rows.
            Pattern: setiap row low-stakes navigasi → langsung Link
            tanpa confirm dialog. Trash bin punya destructive action di
            dalam halamannya sendiri, jadi entry-point ke /trash
            sendiri non-destructive. */}
        <Card className="overflow-hidden divide-y divide-[var(--color-border)]">
          <SettingsLinkRow
            href="/history"
            icon={<Clock className="size-4" />}
            label="Riwayat transaksi"
            hint="Semua pengeluaran & pemasukan kamu"
          />
          {/*
            Mata uang sekarang link ke picker page (/profile/currency).
            Tampilkan label ringkas (mis. "Rupiah · Rp") di kanan supaya
            user bisa lihat current setting tanpa masuk picker. Pakai
            getCurrencyConfig defensive — kalau profile.currency null
            untuk fresh user, default ke IDR.
          */}
          <SettingsLinkRow
            href="/profile/currency"
            icon={<Coins className="size-4" />}
            label="Mata uang"
            hint={(() => {
              const c = getCurrencyConfig(profile?.currency);
              return `${c.label} · ${c.symbol}`;
            })()}
          />
          {/* Target nabung — entry row dengan hint berbeda tergantung
              status. Sudah set: tampil nominal. Belum set: copy CTA
              "Belum di-set" yang prompt user untuk klik. */}
          <SettingsLinkRow
            href="/profile/goal"
            icon={<Target className="size-4" />}
            label="Target nabung"
            hint={(() => {
              const target = profile?.monthly_savings_target;
              if (target && target > 0) {
                const c = getCurrencyConfig(profile?.currency).code;
                return `${formatMoney(target, c)} per bulan`;
              }
              return "Belum di-set";
            })()}
          />
          <SettingsLinkRow
            href="/profile/trash"
            icon={<Trash2 className="size-4" />}
            label="Sampah"
            badge={archivedCount > 0 ? String(archivedCount) : undefined}
            hint={
              archivedCount > 0
                ? "Catatan yang dihapus, bisa dipulihkan"
                : "Kosong"
            }
          />
        </Card>

        {/* Logout */}
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="w-full gap-2 text-[var(--color-destructive)] hover:bg-[color-mix(in_oklab,var(--color-destructive),transparent_92%)]"
          >
            <LogOut className="size-4" />
            Keluar
          </Button>
        </form>

        <p className="text-center font-display-italic text-xs text-[var(--color-muted-foreground)]/70">
          Yarbayar · v0.1.0
        </p>
      </div>
    </>
  );
}

/**
 * Same shape as SettingsRow but anchored to a Link with optional
 * count badge (mis. trash count) dan hint subtitle.
 */
function SettingsLinkRow({
  href,
  icon,
  label,
  badge,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 transition-colors active:bg-[var(--color-muted)] active:scale-[0.99]"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && (
          <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted-foreground)]">
            {hint}
          </p>
        )}
      </div>
      {badge && (
        <span className="tabular rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-accent-foreground)]">
          {badge}
        </span>
      )}
      <ChevronRight className="size-4 text-[var(--color-muted-foreground)]/50" />
    </Link>
  );
}
