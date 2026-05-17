"use client";

import { useEffect, useRef } from "react";

/**
 * Persist form draft to localStorage.
 *
 * Why: Gen-Z user sering buka multiple tabs, refresh accidentally, atau
 * notification interruption — kalau form ngga punya draft persistence,
 * data yang sudah diketik 5 menit hilang. Itu friction yang ngga perlu.
 *
 * Pattern:
 *   1. On mount, baca draft dari localStorage → kalau ada dan masih
 *      fresh (< staleAfterMs), restore ke setter.
 *   2. Setiap `value` berubah, debounce ~300ms lalu save.
 *   3. `clear()` dipanggil setelah submit sukses — page redirect
 *      mungkin sebelum cleanup, jadi caller harus eksplisit panggil ini.
 *
 * Tidak auto-save tiap detik karena bisa kacau saat koneksi drop atau
 * user lagi delete-typing. 300ms debounce cukup natural.
 *
 * @param key       Unique localStorage key (mis. "personal-form-draft").
 * @param value     Current form snapshot (akan di-JSON.stringify).
 * @param onRestore Callback saat draft ditemukan saat mount.
 * @param staleAfterMs Default 24 jam — draft lebih lama dianggap stale.
 */
export function useFormDraft<T>(
  key: string,
  value: T,
  onRestore: (draft: T) => void,
  staleAfterMs = 24 * 60 * 60 * 1000
) {
  const restored = useRef(false);

  // Restore on mount only — strictly once.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const { savedAt, draft } = JSON.parse(raw) as {
        savedAt: number;
        draft: T;
      };
      if (Date.now() - savedAt > staleAfterMs) {
        localStorage.removeItem(key);
        return;
      }
      onRestore(draft);
    } catch {
      // Corrupt JSON — nuke and move on.
      localStorage.removeItem(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Debounced save on every value change.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ savedAt: Date.now(), draft: value })
        );
      } catch {
        // Storage full or disabled — fail silently.
      }
    }, 300);
    return () => clearTimeout(t);
  }, [key, value]);
}

/**
 * Clear draft eksplisit — panggil setelah submit sukses dari client
 * sebelum redirect, atau dari useEffect di success page.
 */
export function clearFormDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // No-op
  }
}

/**
 * Helper untuk simpan single string preference (mis. last paidBy per
 * group) — bukan draft form yang stale, melainkan smart default yang
 * persist tanpa expiry.
 */
export function getLocalPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setLocalPref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // No-op
  }
}
