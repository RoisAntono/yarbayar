/**
 * Expense categories. Kept lightweight (free-form text in DB) so users
 * can write anything, but the preset list gives Gen-Z trip-friendly
 * defaults so the picker is one-tap most of the time.
 *
 * The emoji is a visual anchor in lists and reports; the slug is what
 * we store in `expenses.category`.
 */

export interface Category {
  slug: string;
  label: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { slug: "makan", label: "Makan", emoji: "🍱" },
  { slug: "bensin", label: "Bensin", emoji: "⛽️" },
  { slug: "penginapan", label: "Penginapan", emoji: "🏨" },
  { slug: "tiket", label: "Tiket", emoji: "🎟️" },
  { slug: "transport", label: "Transport", emoji: "🚗" },
  { slug: "belanja", label: "Belanja", emoji: "🛍️" },
  { slug: "hiburan", label: "Hiburan", emoji: "🎬" },
  { slug: "lain", label: "Lain-lain", emoji: "📦" },
];

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug: string | null | undefined): Category | null {
  if (!slug) return null;
  return BY_SLUG.get(slug) ?? null;
}

export function categoryLabel(slug: string | null | undefined): string {
  return getCategory(slug)?.label ?? "Tanpa kategori";
}

export function categoryEmoji(slug: string | null | undefined): string {
  return getCategory(slug)?.emoji ?? "📦";
}
