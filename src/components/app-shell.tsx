"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Compass,
  GraduationCap,
  HeartPulse,
  Home,
  Lightbulb,
  LineChart,
  NotebookPen,
  PieChart,
  Settings,
  Target,
  Wallet,
} from "lucide-react";
import type { ComponentType } from "react";
import { AppProvider } from "@/lib/store";

type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number }>; section: string };

const NAV: NavItem[] = [
  { href: "/app", label: "Home", icon: Home, section: "Overview" },
  { href: "/app/portfolio", label: "Portfolio", icon: Wallet, section: "Overview" },
  { href: "/app/trade", label: "Trade", icon: ArrowLeftRight, section: "Overview" },
  { href: "/app/markets", label: "Markets", icon: LineChart, section: "Overview" },
  { href: "/app/allocate", label: "Allocation", icon: PieChart, section: "Overview" },
  { href: "/app/goals", label: "Goals", icon: Target, section: "Plan" },
  { href: "/app/thesis", label: "Theses", icon: NotebookPen, section: "Plan" },
  { href: "/app/insights", label: "Insights", icon: Lightbulb, section: "Plan" },
  { href: "/app/learn", label: "Learn", icon: GraduationCap, section: "Grow" },
  { href: "/app/check-in", label: "Check-in", icon: HeartPulse, section: "Grow" },
  { href: "/app/quiz", label: "Quiz", icon: Compass, section: "Grow" },
  { href: "/app/settings", label: "Settings", icon: Settings, section: "Grow" },
];

const SECTIONS = ["Overview", "Plan", "Grow"] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`));
}

function Sidebar() {
  const isActive = useIsActive();
  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="AInvestPro logo" className="brand-mark" width={36} height={36} />
        AInvestPro
      </Link>
      {SECTIONS.map((section) => (
        <div key={section}>
          <div className="nav-section">{section}</div>
          {NAV.filter((item) => item.section === section).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={clsx("nav-link", isActive(href) && "active")}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}

function BottomNav() {
  const isActive = useIsActive();
  return (
    <nav className="bottom-nav">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={clsx("bottom-link", isActive(href) && "active")}>
          <Icon size={20} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="shell">
        <Sidebar />
        <main className="main">{children}</main>
        <BottomNav />
      </div>
    </AppProvider>
  );
}
