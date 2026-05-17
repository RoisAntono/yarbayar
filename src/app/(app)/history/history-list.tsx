"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, getDaysInMonth, getDay, parse } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowDownLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";
import type { UnifiedExpense } from "@/lib/data";

interface HistoryListProps {
  expenses: UnifiedExpense[];
  /**
   * User's currency code untuk render semua amount di list. Di-pass
   * dari parent server component (HistoryPage) supaya kita tidak
   * fetch profile di client. Default IDR untuk safety.
   */
  currency?: string;
}

/**
 * Riwayat dengan kalender grid sebagai navigation. Sumbernya unified:
 * pengeluaran pribadi (`personal_expenses`) digabung dengan share user
 * di setiap group expense. Lihat `getUnifiedExpenses` di lib/data.ts.
 *
 * Reference: BCA Mobile, GoPay, ShopeePay history pages — none of them
 * have a search box. Date-driven navigation (calendar + month arrows)
 * is the de-facto pattern for transaction history.
 *
 * Layout:
 *   1. Compact toolbar (always visible, ~64px):
 *      - Selected day pill (taps to toggle calendar)
 *      - Month prev/next inline
 *   2. Calendar grid 7-col (Sen-Min) — collapsed by default
 *      - Tanggal yang punya data: tinted bg + dot accent
 *      - Hari ini: ring accent
 *      - Tanggal aktif: filled accent
 *   3. Detail panel — list expenses untuk tanggal yang dipilih
 *      - Source badge (Pribadi vs Grup) bedakan visually
 *      - Tap personal → /personal/[id]/edit
 *      - Tap group → /groups/[id]/expenses/[id]
 */
export function HistoryList({ expenses, currency = "IDR" }: HistoryListProps) {
  // Index expenses by yyyy-MM-dd for O(1) lookup in calendar cells.
  const byDay = useMemo(() => {
    const m = new Map<string, UnifiedExpense[]>();
    for (const e of expenses) {
      const k = format(new Date(e.spent_at), "yyyy-MM-dd");
      const arr = m.get(k) ?? [];
      arr.push(e);
      m.set(k, arr);
    }
    return m;
  }, [expenses]);

  // Months that actually have data — used for prev/next bounds and
  // monthly totals shown in the switcher.
  const monthSummary = useMemo(() => buildMonthSummary(expenses), [expenses]);

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayMonthKey = format(new Date(), "yyyy-MM");

  // Default to current month if it has data, otherwise the most
  // recent month with data.
  const [viewMonth, setViewMonth] = useState<string>(() => {
    if (monthSummary.has(todayMonthKey)) return todayMonthKey;
    const latest = expenses[0];
    return latest
      ? format(new Date(latest.spent_at), "yyyy-MM")
      : todayMonthKey;
  });

  // Default selected day = today if today has data, else the most
  // recent expense day overall.
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    if (byDay.has(todayKey)) return todayKey;
    const latest = expenses[0];
    return latest ? format(new Date(latest.spent_at), "yyyy-MM-dd") : "";
  });

  // When user changes month, snap selection into that month so the
  // detail panel doesn't show data from a different month than what
  // the calendar header indicates.
  useEffect(() => {
    if (selectedDay.startsWith(viewMonth)) return;
    const days = expenses
      .filter((e) => format(new Date(e.spent_at), "yyyy-MM") === viewMonth)
      .map((e) => format(new Date(e.spent_at), "yyyy-MM-dd"));
    if (days.length > 0) {
      setSelectedDay(days.sort().reverse()[0]);
    } else {
      setSelectedDay(`${viewMonth}-01`);
    }
  }, [viewMonth, expenses, selectedDay]);

  const monthList = useMemo(
    () => Array.from(monthSummary.keys()).sort((a, b) => (a < b ? 1 : -1)),
    [monthSummary]
  );
  const monthIndex = monthList.indexOf(viewMonth);
  const canPrev = monthIndex < monthList.length - 1;
  const canNext = monthIndex > 0;

  const monthLabel = useMemo(() => {
    const d = parse(`${viewMonth}-01`, "yyyy-MM-dd", new Date());
    return format(d, "MMMM yyyy", { locale: idLocale });
  }, [viewMonth]);

  const monthSum = monthSummary.get(viewMonth);
  const monthTotal = monthSum?.total ?? 0;
  const monthCount = monthSum?.count ?? 0;

  const selectedItems = byDay.get(selectedDay) ?? [];
  const selectedTotal = selectedItems.reduce((s, e) => s + e.amount, 0);
  const selectedDate = selectedDay
    ? parse(selectedDay, "yyyy-MM-dd", new Date())
    : null;

  // Calendar starts collapsed — saves ~280px of vertical space. The
  // toolbar and prev/next month already cover the common navigation;
  // calendar is opt-in for jumping to a specific date.
  const [calendarOpen, setCalendarOpen] = useState(false);
  const handlePickDay = (k: string) => {
    setSelectedDay(k);
    // Auto-collapse so detail panel comes back into focus.
    setCalendarOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar — always visible */}
      <Card
        className={cn(
          "flex items-center gap-2 p-2 transition-colors",
          calendarOpen && "border-[var(--color-accent)]/40"
        )}
      >
        <button
          type="button"
          onClick={() => setCalendarOpen((v) => !v)}
          aria-expanded={calendarOpen}
          aria-controls="history-calendar"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-all hover:bg-[var(--color-muted)] active:scale-[0.98]"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--color-accent),transparent_85%)] text-[var(--color-accent)]">
            <CalendarDays className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
              {selectedDay === todayKey
                ? "Hari ini"
                : selectedDate
                  ? format(selectedDate, "EEEE", { locale: idLocale })
                  : "Pilih tanggal"}
            </span>
            <span className="block truncate text-sm font-semibold tracking-tight">
              {selectedDate
                ? format(selectedDate, "d MMMM yyyy", { locale: idLocale })
                : monthLabel}
            </span>
          </span>
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform",
              calendarOpen && "rotate-90"
            )}
          />
        </button>

        <div className="flex shrink-0 items-center gap-0.5 border-l border-[var(--color-border)] pl-1">
          <button
            type="button"
            onClick={() => {
              if (canPrev) setViewMonth(monthList[monthIndex + 1]);
            }}
            disabled={!canPrev}
            aria-label="Bulan sebelumnya"
            className="grid size-8 place-items-center rounded-xl text-[var(--color-foreground)] transition-all hover:bg-[var(--color-muted)] disabled:opacity-30 disabled:hover:bg-transparent active:scale-95"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (canNext) setViewMonth(monthList[monthIndex - 1]);
            }}
            disabled={!canNext}
            aria-label="Bulan berikutnya"
            className="grid size-8 place-items-center rounded-xl text-[var(--color-foreground)] transition-all hover:bg-[var(--color-muted)] disabled:opacity-30 disabled:hover:bg-transparent active:scale-95"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </Card>

      {/* Calendar grid — collapsible */}
      {calendarOpen && (
        <div id="history-calendar" className="space-y-2 float-in">
          <p className="px-1 text-center text-xs text-[var(--color-muted-foreground)]">
            <span className="font-medium capitalize text-[var(--color-foreground)]">
              {monthLabel}
            </span>
            {monthCount > 0
              ? ` · ${monthCount} transaksi · ${formatMoney(monthTotal, currency)}`
              : " · belum ada transaksi"}
          </p>
          <CalendarGrid
            monthKey={viewMonth}
            todayKey={todayKey}
            selectedDay={selectedDay}
            byDay={byDay}
            onSelect={handlePickDay}
          />
        </div>
      )}

      {/* Quick today shortcut — only when calendar closed */}
      {!calendarOpen && selectedDay !== todayKey && byDay.has(todayKey) && (
        <button
          type="button"
          onClick={() => {
            setViewMonth(todayMonthKey);
            setSelectedDay(todayKey);
          }}
          className="w-full text-xs font-medium text-[var(--color-accent)] underline-offset-2 hover:underline active:scale-[0.98]"
        >
          Lompat ke hari ini ↓
        </button>
      )}

      {/* Selected day detail */}
      <section className="space-y-2">
        {selectedDate && (
          <header className="flex items-baseline justify-between px-1">
            <h3 className="font-semibold tracking-tight">
              {format(selectedDate, "EEEE, d MMMM", { locale: idLocale })}
              {selectedDay === todayKey && (
                <span className="ml-2 inline-flex items-center rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-accent-foreground)] align-middle">
                  Hari ini
                </span>
              )}
            </h3>
            {selectedItems.length > 0 && (
              <span className="tabular text-sm font-semibold text-[var(--color-muted-foreground)]">
                {formatMoney(selectedTotal, currency)}
              </span>
            )}
          </header>
        )}

        {selectedItems.length === 0 ? (
          <Card className="p-6 text-center text-sm text-[var(--color-muted-foreground)]">
            Tidak ada transaksi di tanggal ini
          </Card>
        ) : (
          <ul className="space-y-1.5">
        {selectedItems.map((e) => (
              <li key={`${e.source}-${e.id}`}>
                <ExpenseRow expense={e} currency={currency} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Single expense row — handles both personal & group sources via
 * the discriminator. The Link target differs:
 *
 *   - personal → /personal/[id]/edit
 *   - group    → /groups/[gid]/expenses/[id]
 *
 * Visual difference: personal rows show a wallet icon + "Pribadi"
 * subtitle; group rows show the group's emoji + name. Same row
 * height for clean rhythm in the list.
 */
function ExpenseRow({
  expense,
  currency,
}: {
  expense: UnifiedExpense;
  currency: string;
}) {
  if (expense.source === "personal") {
    const isIncome = expense.kind === "income";
    return (
      <Link href={`/personal/${expense.id}/edit`}>
        <Card className="flex items-center gap-3 p-3.5 transition-colors hover:bg-[var(--color-muted)]">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-2xl",
              isIncome
                ? "bg-[color-mix(in_oklab,var(--color-success),transparent_85%)] text-[var(--color-success)]"
                : "bg-[color-mix(in_oklab,var(--color-accent),transparent_85%)] text-[var(--color-accent)]"
            )}
          >
            {isIncome ? (
              <ArrowDownLeft className="size-4" />
            ) : (
              <Wallet className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium leading-tight">{expense.title}</p>
            <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
              {isIncome ? "Pemasukan" : "Pribadi"} ·{" "}
              {format(new Date(expense.spent_at), "HH:mm", { locale: idLocale })}
            </p>
          </div>
          <p
            className={cn(
              "tabular shrink-0 text-sm font-semibold",
              isIncome && "text-[var(--color-success)]"
            )}
          >
            {isIncome ? "+" : ""}
            {formatMoney(expense.amount, currency)}
          </p>
        </Card>
      </Link>
    );
  }

  // group
  return (
    <Link href={`/groups/${expense.group_id}/expenses/${expense.id}`}>
      <Card className="flex items-center gap-3 p-3.5 transition-colors hover:bg-[var(--color-muted)]">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-muted)] text-base">
          {expense.group_emoji ?? "👥"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{expense.title}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--color-muted-foreground)]">
            <span className="truncate">{expense.group_name}</span>
            {expense.i_paid && (
              <span className="shrink-0 rounded-full bg-[color-mix(in_oklab,var(--color-success),transparent_85%)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-success)]">
                Kamu bayar
              </span>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular text-sm font-semibold">
            {formatMoney(expense.amount, currency)}
          </p>
          <p className="tabular text-[10px] text-[var(--color-muted-foreground)]">
            dari {formatMoney(expense.total_amount, currency)}
          </p>
        </div>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------
// Calendar grid — Sen-Min, 7 cols, max 6 rows
// ---------------------------------------------------------------

function CalendarGrid({
  monthKey,
  todayKey,
  selectedDay,
  byDay,
  onSelect,
}: {
  monthKey: string;
  todayKey: string;
  selectedDay: string;
  byDay: Map<string, UnifiedExpense[]>;
  onSelect: (k: string) => void;
}) {
  const firstOfMonth = parse(`${monthKey}-01`, "yyyy-MM-dd", new Date());
  const daysInMonth = getDaysInMonth(firstOfMonth);
  // date-fns getDay returns 0=Sun..6=Sat. Convert to 0=Mon..6=Sun.
  const firstWeekday = (getDay(firstOfMonth) + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const weekdayLabels = ["S", "S", "R", "K", "J", "S", "M"];

  return (
    <Card className="p-3">
      <div className="mb-1 grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((w, i) => (
          <span
            key={i}
            className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]"
          >
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) {
            return <div key={`blank-${i}`} className="aspect-square" />;
          }
          const dayKey = `${monthKey}-${String(d).padStart(2, "0")}`;
          const hasData = byDay.has(dayKey);
          const isToday = dayKey === todayKey;
          const isActive = dayKey === selectedDay;

          return (
            <button
              key={dayKey}
              type="button"
              onClick={() => onSelect(dayKey)}
              aria-pressed={isActive}
              aria-label={`Tanggal ${d}${hasData ? ", ada transaksi" : ""}${isToday ? ", hari ini" : ""}`}
              className={cn(
                "relative aspect-square rounded-xl text-sm font-medium tabular transition-all active:scale-95",
                isActive
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[var(--shadow-pop-accent)]"
                  : isToday
                    ? "bg-[var(--color-card)] text-[var(--color-foreground)] ring-1 ring-[var(--color-accent)]"
                    : hasData
                      ? "bg-[color-mix(in_oklab,var(--color-accent),transparent_85%)] text-[var(--color-foreground)] hover:bg-[color-mix(in_oklab,var(--color-accent),transparent_75%)]"
                      : "text-[var(--color-muted-foreground)]/50 hover:bg-[var(--color-muted)]"
              )}
            >
              {d}
              {hasData && !isActive && (
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[var(--color-accent)]"
                />
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------

interface MonthSummary {
  total: number;
  count: number;
}

function buildMonthSummary(
  expenses: UnifiedExpense[]
): Map<string, MonthSummary> {
  const m = new Map<string, MonthSummary>();
  for (const e of expenses) {
    const key = format(new Date(e.spent_at), "yyyy-MM");
    const cur = m.get(key) ?? { total: 0, count: 0 };
    cur.total += e.amount;
    cur.count += 1;
    m.set(key, cur);
  }
  return m;
}
