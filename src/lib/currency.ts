/**
 * Currency catalog untuk Yarbayar.
 *
 * **Scope**: format-only. Currency setting di profile mengubah how
 * angka di-render di hero/list display — TIDAK convert nilai dari
 * IDR ke target currency. Pengguna yang switch IDR → USD akan lihat
 * "$ 25.000" untuk row yang dulu tampil "Rp 25.000". Itu deliberate
 * trade-off MVP.
 *
 * Future scope (di luar bahasan saat ini):
 *   - Live exchange rate fetch (e.g. ECB, openexchangerates.org)
 *   - Per-row stored currency + display conversion
 *   - Group-level currency override (groups udah punya kolom currency
 *     di DB, tapi belum dipakai di UI)
 *
 * Catatan untuk future devs: kalau mau add conversion, primary
 * concern-nya adalah `expenses.currency` + `personal_expenses.currency`
 * sudah ada di schema sejak migration 0001. Tinggal dipakai.
 */

export interface CurrencyConfig {
  /** ISO 4217 code, uppercase */
  code: string;
  /** Display label di picker, bilingual */
  label: string;
  /** Intl.NumberFormat locale untuk format angka (separator, decimal) */
  locale: string;
  /** Symbol untuk fallback display (kalau Intl format ngga support) */
  symbol: string;
  /** Negara/region asal — dipakai di picker subtitle */
  region: string;
}

/**
 * Curated list — bukan full ISO 4217 (~150 currency). Kita pilih yang
 * relevan untuk Gen-Z Indonesia: IDR primary, lalu USD untuk subscriber
 * services, plus tetangga ASEAN + EU/AU/JP yang common saat traveling
 * atau study abroad.
 *
 * Order matters — IDR di atas (primary), lalu disusun by familiarity
 * (USD/SGD common, JP/EU travel, AU study).
 */
export const CURRENCIES: CurrencyConfig[] = [
  {
    code: "IDR",
    label: "Rupiah Indonesia",
    locale: "id-ID",
    symbol: "Rp",
    region: "Indonesia",
  },
  {
    code: "USD",
    label: "Dolar Amerika",
    locale: "en-US",
    symbol: "$",
    region: "Amerika Serikat",
  },
  {
    code: "SGD",
    label: "Dolar Singapura",
    locale: "en-SG",
    symbol: "S$",
    region: "Singapura",
  },
  {
    code: "MYR",
    label: "Ringgit Malaysia",
    locale: "ms-MY",
    symbol: "RM",
    region: "Malaysia",
  },
  {
    code: "THB",
    label: "Baht Thailand",
    locale: "th-TH",
    symbol: "฿",
    region: "Thailand",
  },
  {
    code: "JPY",
    label: "Yen Jepang",
    locale: "ja-JP",
    symbol: "¥",
    region: "Jepang",
  },
  {
    code: "EUR",
    label: "Euro",
    locale: "de-DE",
    symbol: "€",
    region: "Uni Eropa",
  },
  {
    code: "GBP",
    label: "Poundsterling",
    locale: "en-GB",
    symbol: "£",
    region: "Britania Raya",
  },
  {
    code: "AUD",
    label: "Dolar Australia",
    locale: "en-AU",
    symbol: "A$",
    region: "Australia",
  },
];

/**
 * Lookup config berdasarkan ISO code. Default ke IDR kalau code tidak
 * dikenali — defensive default biar app tidak crash kalau DB-nya kotor
 * (mis. user pernah pakai code custom yang sudah dihapus dari list).
 */
export function getCurrencyConfig(code: string | null | undefined): CurrencyConfig {
  if (!code) return CURRENCIES[0];
  const upper = code.toUpperCase();
  return CURRENCIES.find((c) => c.code === upper) ?? CURRENCIES[0];
}

/**
 * Validasi: apakah code ada di list? Dipakai di server action untuk
 * sanity-check input sebelum write ke DB.
 */
export function isSupportedCurrency(code: string): boolean {
  return CURRENCIES.some((c) => c.code === code.toUpperCase());
}
