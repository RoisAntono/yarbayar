import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { CURRENCIES } from "@/lib/currency";
import { getCurrentUser, getProfile } from "@/lib/data";
import { cn, formatMoney } from "@/lib/utils";
import { updateCurrencyAction } from "../actions";

export const metadata = { title: "Mata uang" };
export const dynamic = "force-dynamic";

/**
 * Currency picker — list dengan tap-to-select pattern. Sengaja TIDAK
 * pake search input meski list 9 item, karena:
 *   - List pendek + curated, scroll cepat
 *   - Search adds keyboard friction di mobile
 *   - User typically pilih sekali doang lalu lupa
 *
 * Tampilan tiap row:
 *   [symbol bg-tinted]  Rupiah Indonesia        Rp 100.000  ✓
 *                       Indonesia · IDR
 *
 * Symbol di kiri pakai design grid+rounded-xl yang konsisten dengan
 * SettingsLinkRow / member rows. Preview `Rp 100.000` di kanan kasih
 * user bayangan instan how angka bakal di-render — better UX dari
 * sekadar tampilin symbol abstract.
 */
export default async function CurrencyPickerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  const current = (profile?.currency ?? "IDR").toUpperCase();

  return (
    <>
      <PageHeader
        title="Mata uang"
        subtitle="Pilih cara tampilan angka"
        back
      />

      <div className="space-y-4 px-4 py-4">
        {/* Disclaimer card — penting buat user yang mungkin ekspektasi
            conversion. Tone netral, bukan apologetic. */}
        <Card className="space-y-1.5 p-4 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
          <p className="font-semibold text-[var(--color-foreground)]">
            Cuma ubah tampilan
          </p>
          <p>
            Nilai yang sudah kamu catat tidak dikonversi otomatis. Misal kamu
            ganti ke USD, &ldquo;25.000&rdquo; tetap angka 25.000 — cuma
            simbolnya jadi $.
          </p>
        </Card>

        {/* Currency list. Setiap item = form mini supaya server action
            di-call langsung tanpa perlu confirm. Pattern radio-list
            tappable dengan submit on-tap. */}
        <Card className="overflow-hidden divide-y divide-[var(--color-border)]">
          {CURRENCIES.map((c) => {
            const isActive = c.code === current;
            return (
              <form action={updateCurrencyAction} key={c.code}>
                <input type="hidden" name="currency" value={c.code} />
                <button
                  type="submit"
                  className={cn(
                    "flex w-full items-center gap-3 p-4 text-left transition-colors",
                    "active:bg-[var(--color-muted)] active:scale-[0.99]",
                    isActive && "bg-[color-mix(in_oklab,var(--color-accent),transparent_92%)]"
                  )}
                  aria-pressed={isActive}
                >
                  {/* Symbol container — saffron bg untuk current,
                      muted untuk yang lain. Kasih signal visual jelas
                      mana yang aktif tanpa cuma centang kanan. */}
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold tabular tracking-tight",
                      isActive
                        ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                        : "bg-[var(--color-muted)] text-[var(--color-foreground)]"
                    )}
                    aria-hidden
                  >
                    {c.symbol}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.label}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted-foreground)]">
                      {c.region} · {c.code}
                    </p>
                  </div>

                  {/* Preview format — angka 100.000 di-render pakai
                      currency ini. Memberi user "what you see is what
                      you get" sebelum tap. */}
                  <span className="tabular shrink-0 text-[11px] text-[var(--color-muted-foreground)]/80">
                    {formatMoney(100000, c.code)}
                  </span>

                  {isActive && (
                    <Check
                      className="size-4 shrink-0 text-[var(--color-accent)]"
                      aria-label="Sedang dipakai"
                    />
                  )}
                </button>
              </form>
            );
          })}
        </Card>

        <p className="px-1 text-center text-[10px] leading-relaxed text-[var(--color-muted-foreground)]/70">
          Mau lebih banyak pilihan? Drop request di feedback. Daftar saat ini
          fokus ke yang paling sering dipakai pengguna Indonesia.
        </p>
      </div>
    </>
  );
}
