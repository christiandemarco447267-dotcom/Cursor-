"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Brain,
  ChartPie,
  Home,
  LineChart,
  Sparkles,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/cls";
import { AppProvider } from "@/lib/app-context";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/app/markets", label: "Markets", icon: LineChart },
  { href: "/app/insights", label: "Insights", icon: Sparkles },
  { href: "/app/allocate", label: "Allocate", icon: ChartPie },
];

const SIDE: NavItem[] = [
  { href: "/app/learn", label: "Learn", icon: BookOpen },
  { href: "/app/check-in", label: "Check-in", icon: Brain },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AppProvider>
      <div className="app-shell">
        <aside className="app-sidebar">
          <Link href="/" className="brand-mark">
            <Image src="/icon.png" alt="" width={36} height={36} />
            <span>AInvestPro</span>
          </Link>
          <nav className="side-nav">
            {[...NAV, ...SIDE].map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("side-link", active && "active")}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <p className="side-disclaimer">
            Educational paper portfolio. Not investment advice.
          </p>
        </aside>

        <div className="app-main">
          <div className="app-canvas">{children}</div>
        </div>

        <nav className="bottom-nav" aria-label="Primary">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("bottom-link", active && "active")}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </AppProvider>
  );
}
