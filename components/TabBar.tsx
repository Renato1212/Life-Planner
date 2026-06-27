"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { cn, haptic } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: "Home" },
  { href: "/today", label: "Today", icon: "ListChecks" },
  { href: "/schedule", label: "Schedule", icon: "CalendarDays" },
  { href: "/review", label: "Review", icon: "TrendingUp" },
];

export function TabBar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 glass border-t border-border/60 pb-safe">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2">
        {TABS.map((t) => {
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              onClick={() => haptic()}
              className="tappable group flex flex-1 flex-col items-center gap-0.5 py-2 pt-2.5"
            >
              <Icon
                name={t.icon}
                size={24}
                strokeWidth={active ? 2.4 : 2}
                className={cn(
                  "transition-colors",
                  active ? "text-tint" : "text-ink-3",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  active ? "text-tint" : "text-ink-3",
                )}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
