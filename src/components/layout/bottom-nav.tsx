"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Receipt, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Beranda", icon: Home, match: (p: string) => p === "/" },
  { href: "/groups", label: "Grup", icon: Users, match: (p: string) => p.startsWith("/groups") },
  { href: "/history", label: "Riwayat", icon: Receipt, match: (p: string) => p.startsWith("/history") },
  { href: "/profile", label: "Saya", icon: User, match: (p: string) => p.startsWith("/profile") },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigasi utama"
    >
      <ul className="grid grid-cols-4 max-w-md mx-auto">
        {ITEMS.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs transition-colors",
                  active
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.5]")} />
                <span className={cn("font-medium", active && "font-semibold")}>
                  {it.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
