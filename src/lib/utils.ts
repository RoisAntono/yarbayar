import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RUPIAH = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "Rp0";
  return RUPIAH.format(value);
}

export function formatRupiahShort(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(value) >= 1_000) return `Rp${(value / 1_000).toFixed(0)}rb`;
  return formatRupiah(value);
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

export function avatarColor(seed: string | null | undefined) {
  if (!seed) return PALETTE[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
