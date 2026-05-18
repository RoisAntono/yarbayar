"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CURRENCIES, getCurrencyConfig } from "@/lib/currency";
import { cn, formatMoney } from "@/lib/utils";
import { toast } from "sonner";
import { updateGroupCurrencyAction } from "../../actions";

/**
 * Owner-only currency picker untuk group settings page.
 *
 * Pakai pattern dropdown collapse (bukan navigate ke /currency page
 * yang terpisah) karena scope-nya kecil: cuma 1 row + 9 option, dan
 * konteks-nya udah di settings page yang udah deep nested. Navigate
 * tambah lebih friction.
 *
 * Disclaimer "format-only, bukan conversion" sama dengan picker
 * user-level. Wajib supaya user tidak kaget angka tetap sama setelah
 * pilih currency baru.
 *
 * Saving state via useTransition — selama action jalan, dropdown
 * di-disable + spinner di samping label terpilih. Toast success/error
 * dipakai untuk feedback konsisten dengan pattern di settlements +
 * trash actions.
 */
export function GroupCurrencyPicker({
  groupId,
  currentCurrency,
}: {
  groupId: string;
  currentCurrency: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const config = getCurrencyConfig(currentCurrency);

  const handlePick = (code: string) => {
    if (code === currentCurrency) {
      // No-op; tutup dropdown aja.
      setOpen(false);
      return;
    }

    const fd = new FormData();
    fd.set("group_id", groupId);
    fd.set("currency", code);

    startTransition(async () => {
      try {
        await updateGroupCurrencyAction(fd);
        const next = getCurrencyConfig(code);
        toast.success(`Mata uang grup → ${next.label}`, {
          description: `${next.symbol} · ${next.code}`,
        });
        setOpen(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Coba lagi ya";
        toast.error("Gagal ubah mata uang", { description: message });
      }
    });
  };

  return (
    <Card className="overflow-hidden">
      {/* Trigger row — clickable to expand */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-expanded={open}
        aria-controls="group-currency-options"
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-[var(--color-muted)] disabled:opacity-60"
      >
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--color-accent),transparent_85%)] text-[var(--color-accent)] tabular text-base font-semibold"
        >
          {config.symbol}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
            Mata uang grup
          </p>
          <p className="mt-0.5 text-sm font-semibold">
            {config.label} · {config.code}
          </p>
        </div>
        {isPending ? (
          <Loader2
            aria-hidden
            className="size-4 shrink-0 animate-spin text-[var(--color-muted-foreground)]"
          />
        ) : (
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform",
              open && "rotate-180"
            )}
          />
        )}
      </button>

      {/* Options list — collapsed by default */}
      {open && (
        <div
          id="group-currency-options"
          className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)] float-in"
        >
          {CURRENCIES.map((c) => {
            const isActive = c.code === currentCurrency;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => handlePick(c.code)}
                disabled={isPending}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-muted)] disabled:opacity-60",
                  isActive && "bg-[var(--color-muted)]/60"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-2xl tabular text-sm font-semibold",
                    isActive
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                      : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                  )}
                >
                  {c.symbol}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.label}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted-foreground)]">
                    {c.region} · {c.code}
                  </p>
                </div>
                <span className="tabular shrink-0 text-[11px] font-medium text-[var(--color-muted-foreground)]">
                  {/* Live preview supaya user lihat persis bagaimana
                      angka di-render dengan currency ini. */}
                  {formatMoney(100000, c.code)}
                </span>
                {isActive && (
                  <Check
                    aria-hidden
                    className="size-4 shrink-0 text-[var(--color-accent)]"
                    strokeWidth={2.5}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Disclaimer — same wording sebagai user-level picker */}
      <p className="border-t border-[var(--color-border)] bg-[var(--color-muted)]/50 px-4 py-3 text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
        Cuma ubah tampilan. Nominal yang udah ke-record tidak dikonversi
        otomatis ke mata uang baru.
      </p>
    </Card>
  );
}
