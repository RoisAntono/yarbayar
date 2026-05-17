"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, User, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating pill bottom navigation.
 *
 * Anatomy:
 *   - Container: detached pill with glass + heavy shadow, sitting above
 *     the safe-area inset (NOT spanning edge-to-edge).
 *   - 4 nav items + 1 center FAB:
 *       Beranda · Grup · [+ Tambah] · Pribadi · Saya
 *   - The FAB is *raised* above the pill (negative top margin) and uses
 *     the saffron accent so it pops against the dark midnight pill.
 *   - FAB is context-aware:
 *       • In a group → /groups/[id]/expenses/new
 *       • On /personal → /personal/new
 *       • Anywhere else → /personal/new (most common solo case)
 *   - "Pribadi" tab also lights up on /history because /history is the
 *     unified personal+group share view — it's the same mental model.
 *     Direct entry to /history is via the Beranda card or the
 *     "Riwayat →" link inside /personal.
 *   - Active item shows a small dot below it (animated in via .nav-pop).
 */

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
};

const ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Beranda",
    icon: Home,
    match: (p) => p === "/",
  },
  {
    href: "/groups",
    label: "Grup",
    icon: Users,
    match: (p) => p.startsWith("/groups"),
  },
  {
    href: "/personal",
    label: "Pribadi",
    icon: Wallet,
    // Also light up "Pribadi" when user is on /history since
    // history is the default flow that surfaces personal data.
    match: (p) => p.startsWith("/personal") || p.startsWith("/history"),
  },
  {
    href: "/profile",
    label: "Saya",
    icon: User,
    match: (p) => p.startsWith("/profile"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  // Decide where the "+ Tambah" button takes the user. Three cases:
  //
  //   1. Inside a group — straight to that group's new-expense flow.
  //   2. On /personal subtree — straight to new personal expense.
  //   3. Anywhere else — go to new personal expense (most common for
  //      Gen-Z daily-tracking flow).
  const groupMatch = pathname.match(/^\/groups\/([^/]+)/);
  let addHref: string;
  if (groupMatch && groupMatch[1] !== "new") {
    addHref = `/groups/${groupMatch[1]}/expenses/new`;
  } else if (pathname.startsWith("/personal")) {
    addHref = "/personal/new";
  } else {
    addHref = "/personal/new";
  }

  // Split items into left and right halves around the center FAB
  const left = ITEMS.slice(0, 2);
  const right = ITEMS.slice(2);

  return (
    <nav
      aria-label="Navigasi utama"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <div className="pointer-events-auto relative w-full max-w-md">
        {/* Floating pill */}
        <div
          className={cn(
            "glass-strong relative flex items-center justify-between gap-1 rounded-full px-2 py-1.5",
            "shadow-[var(--shadow-float)]"
          )}
        >
          {left.map((it) => (
            <NavButton key={it.href} item={it} active={it.match(pathname)} />
          ))}

          {/* Spacer for the FAB sitting above */}
          <div aria-hidden className="w-16 shrink-0" />

          {right.map((it) => (
            <NavButton key={it.href} item={it} active={it.match(pathname)} />
          ))}
        </div>

        {/* Raised center FAB */}
        <Link
          href={addHref}
          aria-label="Tambah pengeluaran"
          className={cn(
            "absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3",
            "grid size-16 place-items-center rounded-full",
            "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]",
            "shadow-[var(--shadow-pop-accent)] ring-4 ring-[var(--color-background)]",
            "transition-all duration-200 ease-out",
            "hover:scale-105 active:scale-95"
          )}
        >
          <Plus className="size-7 stroke-[2.5]" />
          <span className="sr-only">Tambah pengeluaran</span>
        </Link>
      </div>
    </nav>
  );
}

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-3 py-2",
        "transition-colors duration-200",
        "active:scale-[0.96]"
      )}
    >
      <Icon
        className={cn(
          "size-[22px] transition-all duration-300",
          active
            ? "scale-110 text-[var(--color-foreground)]"
            : "text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]"
        )}
        strokeWidth={active ? 2.4 : 1.8}
      />
      <span
        className={cn(
          "text-[10px] font-medium transition-colors",
          active
            ? "text-[var(--color-foreground)]"
            : "text-[var(--color-muted-foreground)]"
        )}
      >
        {item.label}
      </span>

      {/* Active dot indicator */}
      {active && (
        <span
          aria-hidden
          className="nav-pop absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[var(--color-accent)]"
        />
      )}
    </Link>
  );
}
