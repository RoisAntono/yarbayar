/**
 * Auto-categorization for expenses — by title similarity only.
 *
 * Earlier this file used a keyword preset table (everything
 * containing "kopi" / "nasi" / "ayam" went to a generic `makan`
 * bucket). That was inconsistent: some titles got grouped in unexpected
 * ways while other items in the same domain stayed separate, because
 * the keyword list inevitably has gaps. The user wanted predictability,
 * not generic buckets.
 *
 * The replacement rules are mechanical and easy to predict:
 *
 *   1) Exact slug match — "Toilet" and "toilet" both slug to "toilet".
 *   2) Fuzzy exact for single-word slugs — "bensin" vs "bensn" via
 *      Levenshtein distance ≤ 1 (typo tolerance).
 *   3) Subset containment — a single-word slug is folded into a
 *      multi-word slug if that word appears (fuzzily) in the other.
 *      So "Bensin" merges with "Bensin Pertamax", but "Kopi bean" and
 *      "Kopi senja" stay separate (neither is a subset of the other).
 *   4) Otherwise: the title becomes its own brand-new category.
 *
 * No more domain knowledge baked in. The system stays out of the way
 * and only merges when the titles literally share a leading concept.
 */

export interface Category {
  slug: string;
  label: string;
  emoji: string;
}

/**
 * "Lain-lain" remains as a fallback display label for empty / unknown
 * slugs. We don't try to coerce arbitrary titles into preset emojis
 * any more — every custom slug renders with the generic 🏷️.
 */
export const CATEGORIES: Category[] = [
  { slug: "lain", label: "Lain-lain", emoji: "📦" },
];

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

// ---------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------

/** Lowercase, strip punctuation, collapse whitespace. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein edit distance — small inputs only, bounded loop is fine. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr.slice(), prev];
  }
  return prev[n];
}

/**
 * "Are these two words close enough to be the same word?" — typo-tolerant
 * but length-aware. Tight on short strings to avoid false positives.
 */
function similarEnough(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 2) return false;
  const max = Math.max(a.length, b.length);
  if (max < 4) return false; // exact-only for very short words
  const d = levenshtein(a, b);
  if (max <= 6) return d <= 1;
  if (max <= 10) return d <= 2;
  return d <= 3;
}

/**
 * Convert a free-form title into a URL-safe slug used as the category
 * key. Empty input falls back to "lain".
 */
export function slugifyTitle(title: string): string {
  const n = normalize(title).replace(/\s+/g, "-").slice(0, 40);
  return n || "lain";
}

/**
 * Pick a category slug for an expense based on its title and the
 * categories already used in this group.
 *
 * The matching rules below are intentionally conservative — we'd
 * rather create a brand-new category than wrongly merge unrelated
 * items (which is what the old preset list kept doing).
 */
export function inferCategory(title: string, existingInGroup: string[] = []): string {
  const titleSlug = slugifyTitle(title);
  if (titleSlug === "lain") return "lain";
  const titleWords = titleSlug.split("-").filter(Boolean);

  for (const ex of existingInGroup) {
    if (!ex || ex === "lain") continue;

    // (1) Exact slug match — "Toilet" and "toilet" land here.
    if (titleSlug === ex) return ex;

    const exWords = ex.split("-").filter(Boolean);

    // (2) Fuzzy single word — "bensin" vs "bensn" (typo).
    if (titleWords.length === 1 && exWords.length === 1) {
      if (similarEnough(titleWords[0], exWords[0])) return ex;
      continue;
    }

    // (3) Subset containment — the shorter slug's single word must
    // fuzzily appear in the longer slug.
    //
    //   "Bensin" + "Bensin Pertamax" → merge to whichever exists
    //   "Kopi bean" + "Kopi senja"   → don't merge (neither is a single
    //                                  word, neither is a subset)
    //
    // We deliberately do NOT do "shared first word" merging any more —
    // that's what produced "kopi bean" + "kopi senja" being grouped.
    if (titleWords.length === 1 && exWords.length > 1) {
      const w = titleWords[0];
      if (w.length >= 4 && exWords.some((ew) => similarEnough(ew, w))) {
        return ex;
      }
      continue;
    }
    if (exWords.length === 1 && titleWords.length > 1) {
      const w = exWords[0];
      if (w.length >= 4 && titleWords.some((tw) => similarEnough(tw, w))) {
        return ex;
      }
      continue;
    }

    // (4) Multi-word vs multi-word: only merge when the entire shorter
    // slug is contained (in order, fuzzy) in the longer one. Catches
    // "Nasi goreng" merging with "Nasi goreng spesial", but keeps
    // "Nasi goreng" and "Nasi padang" separate.
    const [shorter, longer] =
      titleWords.length <= exWords.length
        ? [titleWords, exWords]
        : [exWords, titleWords];
    if (containsInOrder(shorter, longer)) return ex;
  }

  return titleSlug;
}

/**
 * Does `shorter` appear as a contiguous fuzzy subsequence inside `longer`?
 * Both arrays are word arrays from a slug. Used by the multi-word
 * subset rule.
 */
function containsInOrder(shorter: string[], longer: string[]): boolean {
  if (shorter.length === 0) return false;
  outer: for (let start = 0; start <= longer.length - shorter.length; start++) {
    for (let i = 0; i < shorter.length; i++) {
      if (!similarEnough(shorter[i], longer[start + i])) continue outer;
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------
// Display helpers — work with both the "lain" fallback and any
// custom slug we've ever generated from a title.
// ---------------------------------------------------------------

export function getCategory(slug: string | null | undefined): Category | null {
  if (!slug) return null;
  return BY_SLUG.get(slug) ?? null;
}

export function categoryLabel(slug: string | null | undefined): string {
  if (!slug) return "Tanpa kategori";
  const preset = BY_SLUG.get(slug);
  if (preset) return preset.label;
  // Custom slug: humanize "nasi-padang" → "Nasi Padang"
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function categoryEmoji(slug: string | null | undefined): string {
  if (!slug) return "📦";
  return BY_SLUG.get(slug)?.emoji ?? "🏷️";
}
