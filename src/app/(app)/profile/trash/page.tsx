import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import {
  purgePersonalExpenseAction,
  restorePersonalExpenseAction,
} from "../../personal/actions";
import { getCurrencyConfig } from "@/lib/currency";
import { categoryEmoji, categoryLabel } from "@/lib/categories";
import {
  getArchivedPersonalExpenses,
  getCurrentUser,
  getProfile,
} from "@/lib/data";
import { cn, formatMoney } from "@/lib/utils";
import { TrashRowActions } from "./trash-actions";

export const metadata = { title: "Sampah" };
export const dynamic = "force-dynamic";

/**
 * Trash bin untuk personal_expenses yang di-soft-delete dari
 * `/personal/[id]/edit`. Menampilkan archived rows, masing-masing
 * dengan action Pulihkan + Hapus permanen.
 *
 * Empty state: kalau belum pernah delete row, copy-nya bukan sad
 * "No data" — productive: "Sampah kosong, semua catatan kamu masih
 * aman" + balik ke /personal CTA.
 *
 * Catatan retention 30 hari ditampilkan di footer page — saat ini
 * belum ada cron purger di backend (lihat AGENTS.md Roadmap), jadi
 * effectively row stay forever sampai user manual purge. Copy
 * "30 hari" itu intent, bukan janji enforced.
 */
export default async function TrashPage() {
  const user = await getCurrentUser();
  const [archived, profile] = await Promise.all([
    getArchivedPersonalExpenses(200),
    user ? getProfile(user.id) : Promise.resolve(null),
  ]);
  const userCurrency = getCurrencyConfig(profile?.currency).code;

  return (
    <>
      <PageHeader title="Sampah" subtitle="Catatan keuangan" back />

      <div className="space-y-5 px-4 py-4">
        {archived.length === 0 ? (
          <Card className="grid place-items-center gap-3 px-6 py-10 text-center">
            <span
              aria-hidden
              className="grid size-14 place-items-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
            >
              <Inbox className="size-6" />
            </span>
            <div className="space-y-1.5">
              <p className="font-semibold">Sampah kosong</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Catatan yang kamu hapus muncul di sini, bisa dipulihkan kapan
                aja.
              </p>
            </div>
            <Link
              href="/personal"
              className="mt-2 text-xs font-medium text-[var(--color-accent)] underline-offset-2 hover:underline"
            >
              ← Balik ke Catatan keuangan
            </Link>
          </Card>
        ) : (
          <>
            <p className="px-1 text-[11px] text-[var(--color-muted-foreground)]">
              {archived.length} catatan diarsipkan · auto-purge 30 hari
            </p>

            <Card className="divide-y divide-[var(--color-border)]">
              {archived.map((row) => (
                <TrashRow
                  key={row.id}
                  id={row.id}
                  title={row.title}
                  amount={row.amount}
                  kind={row.kind}
                  category={row.category}
                  spent_at={row.spent_at}
                  archived_at={row.archived_at}
                  currency={userCurrency}
                />
              ))}
            </Card>

            <p className="px-1 text-[10px] leading-relaxed text-[var(--color-muted-foreground)]/70">
              Pulihkan = catatan balik ke list aktif dengan nominal dan
              kategori yang sama. Hapus permanen = data benar-benar dihapus
              dari database, tidak bisa dipulihkan.
            </p>
          </>
        )}
      </div>
    </>
  );
}

/**
 * Single row di trash bin. Layout:
 *   [icon kind+category] [title + meta] [amount + actions stacked]
 *
 * Sengaja tidak clickable untuk navigate edit — row archived ngga
 * boleh di-edit tanpa restore dulu (consistent dengan filter di
 * `personal/[id]/edit/page.tsx` yang notFound kalau archived_at set).
 */
function TrashRow({
  id,
  title,
  amount,
  kind,
  category,
  spent_at,
  archived_at,
  currency,
}: {
  id: string;
  title: string;
  amount: number;
  kind: "expense" | "income";
  category: string | null;
  spent_at: string;
  archived_at: string;
  currency: string;
}) {
  const isIncome = kind === "income";
  const archivedAgo = formatDistanceToNow(new Date(archived_at), {
    locale: idLocale,
    addSuffix: false,
  });

  return (
    <div className="space-y-3 p-3.5">
      <div className="flex items-start gap-3">
        {/* Icon — kind tone (hijau income, merah expense) tetap dipakai
            biar visual semantic-nya konsisten dengan list utama. */}
        <span
          aria-hidden
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-2xl text-base",
            isIncome
              ? "bg-[color-mix(in_oklab,var(--color-success),transparent_85%)] text-[var(--color-success)]"
              : "bg-[color-mix(in_oklab,var(--color-destructive),transparent_88%)] text-[var(--color-destructive)]"
          )}
        >
          {category ? (
            categoryEmoji(category)
          ) : isIncome ? (
            <ArrowDownLeft className="size-4" strokeWidth={2.5} />
          ) : (
            <ArrowUpRight className="size-4" strokeWidth={2.5} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted-foreground)]">
            {category ? categoryLabel(category) : "Tanpa kategori"} ·{" "}
            {format(new Date(spent_at), "d MMM yyyy", { locale: idLocale })}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]/70">
            Dihapus {archivedAgo} lalu
          </p>
        </div>

        <p
          className={cn(
            "tabular shrink-0 text-sm font-semibold",
            isIncome
              ? "text-[var(--color-success)]"
              : "text-[var(--color-destructive)]"
          )}
        >
          {isIncome ? "+" : "−"}
          {formatMoney(amount, currency)}
        </p>
      </div>

      <TrashRowActions
        id={id}
        title={title}
        restoreAction={restorePersonalExpenseAction}
        purgeAction={purgePersonalExpenseAction}
      />
    </div>
  );
}
