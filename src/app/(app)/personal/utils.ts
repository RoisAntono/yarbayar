/**
 * Pure helpers untuk halaman personal — tidak boleh masuk ke
 * `actions.ts` karena file "use server" hanya boleh export async
 * function.
 */

/** YYYY-MM-DD untuk default tanggal di form. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
