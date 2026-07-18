"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconChart,
  IconHome,
  IconPie,
  IconSpark,
  IconWallet,
} from "@/components/icons";

const items = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/portfolio", label: "Portfolio", icon: IconWallet },
  { href: "/analytics", label: "Analytics", icon: IconChart },
  { href: "/insights", label: "Insights", icon: IconSpark },
  { href: "/learn", label: "Learn", icon: IconPie },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-surface/90 backdrop-blur-md"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-teal/10 text-teal-deep"
                    : "text-muted hover:text-ink"
                }`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${
                    active ? "bg-teal text-white shadow-[0_8px_20px_var(--glow)]" : ""
                  }`}
                >
                  <Icon />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
