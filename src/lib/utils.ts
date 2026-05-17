import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getCurrencyConfig } from "@/lib/currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Memoized formatter cache. Bikin Intl.NumberFormat instance per
 * currency code mahal — di-reuse antar render. Map keyed by code,
 * lazy-init pertama kali dipakai.
 *
 * Note untuk JPY: technically tidak punya decimal sama sekali, jadi
 * `maximumFractionDigits: 0` masih akurat. IDR pun begitu — kita
 * tidak handle Rp 1.5 (rupiah pecahan tidak relevan).
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(code: string): Intl.NumberFormat {
  let f = formatterCache.get(code);
  if (f) return f;
  const config = getCurrencyConfig(code);
  f = new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.code,
    maximumFractionDigits: 0,
  });
  formatterCache.set(code, f);
  return f;
}

/**
 * Format nilai uang dengan currency code yang dispesifikasikan.
 * Default ke IDR kalau tidak ada code (defensive — kalau profile.currency
 * null karena freshly-created user, fallback ke IDR).
 *
 * **Tidak melakukan conversion** — value dianggap sudah dalam currency
 * target. Lihat `lib/currency.ts` untuk reasoning kenapa MVP tidak
 * convert.
 */
export function formatMoney(
  value: number | null | undefined,
  currency: string | null | undefined = "IDR"
): string {
  const code = (currency ?? "IDR").toUpperCase();
  if (value === null || value === undefined || Number.isNaN(value)) {
    const config = getCurrencyConfig(code);
    return `${config.symbol}0`;
  }
  try {
    return getFormatter(code).format(value);
  } catch {
    // Intl.NumberFormat bisa throw kalau locale tidak supported di
    // runtime. Fallback ke prefix symbol + grouped digits.
    const config = getCurrencyConfig(code);
    return `${config.symbol}${Math.round(value).toLocaleString("id-ID")}`;
  }
}

/**
 * Short form (Rp1.5jt, $1.5K) — dipakai di tick label chart dan
 * tempat-tempat sempit. Localized prefix "rb/jt/M" hanya untuk IDR
 * karena itu Indonesian convention; currency lain pakai SI prefix
 * standard (K/M/B).
 */
export function formatMoneyShort(value: number, currency: string | null | undefined = "IDR"): string {
  const code = (currency ?? "IDR").toUpperCase();
  const config = getCurrencyConfig(code);
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (code === "IDR") {
    if (abs >= 1_000_000_000) return `${sign}${config.symbol}${(abs / 1_000_000_000).toFixed(1)}M`;
    if (abs >= 1_000_000) return `${sign}${config.symbol}${(abs / 1_000_000).toFixed(1)}jt`;
    if (abs >= 1_000) return `${sign}${config.symbol}${(abs / 1_000).toFixed(0)}rb`;
    return formatMoney(value, code);
  }

  // SI prefix untuk currency non-IDR
  if (abs >= 1_000_000_000) return `${sign}${config.symbol}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${config.symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${config.symbol}${(abs / 1_000).toFixed(0)}K`;
  return formatMoney(value, code);
}

/**
 * Backwards-compat aliases. Banyak callsite yang udah pake formatRupiah
 * sebelum currency feature ada — sengaja TIDAK di-rename mass biar
 * diff PR-nya kecil. New code sebaiknya pakai formatMoney() langsung.
 *
 * Group expense displays masih pakai formatRupiah karena group
 * punya currency sendiri di schema (`groups.currency` default IDR)
 * yang belum di-expose ke UI. Future refactor: replace dengan
 * `formatMoney(value, group.currency)`.
 */
export function formatRupiah(value: number | null | undefined): string {
  return formatMoney(value, "IDR");
}

export function formatRupiahShort(value: number): string {
  return formatMoneyShort(value, "IDR");
}

export function parseRupiahInput(value: string): number {
  const cleaned = value.replace(/[^\d]/g, "");
  return cleaned ? Number(cleaned) : 0;
}

export function initials(name: string | null | undefined) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PALETTE = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
];

/**
 * Hex equivalents of PALETTE — needed by Recharts (which doesn't read
 * Tailwind classes). Index-aligned with PALETTE so the avatar color and
 * chart line color for the same member always match.
 */
export const PALETTE_HEX = [
  "#f43f5e", // rose-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#0ea5e9", // sky-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
];

function hashString(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarColor(seed: string | null | undefined) {
  if (!seed) return PALETTE[0];
  return PALETTE[hashString(seed) % PALETTE.length];
}

/** Same hue as `avatarColor()`, but as a raw hex string for charts/SVG. */
export function memberColor(seed: string | null | undefined) {
  if (!seed) return PALETTE_HEX[0];
  return PALETTE_HEX[hashString(seed) % PALETTE_HEX.length];
}
