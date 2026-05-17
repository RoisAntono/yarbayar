/**
 * The 1-hour edit window for expenses. After this elapses, the row
 * becomes immutable: no edit, no delete. Lives in its own module so
 * both server actions and pages can import it without making the
 * server-actions file export a non-async function (which Next forbids).
 */

export const EDIT_WINDOW_MS = 60 * 60 * 1000;

export function isWithinEditWindow(createdAt: string | Date): boolean {
  const t =
    typeof createdAt === "string"
      ? new Date(createdAt).getTime()
      : createdAt.getTime();
  return Date.now() - t <= EDIT_WINDOW_MS;
}

/** Minutes left in the edit window, floored at 0. */
export function editMinutesLeft(createdAt: string | Date): number {
  const t =
    typeof createdAt === "string"
      ? new Date(createdAt).getTime()
      : createdAt.getTime();
  const remaining = EDIT_WINDOW_MS - (Date.now() - t);
  return Math.max(0, Math.ceil(remaining / 60_000));
}
