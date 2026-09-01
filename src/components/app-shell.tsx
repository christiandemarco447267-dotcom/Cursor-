"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Home,
  Lightbulb,
  LineChart,
  Menu,
  NotebookPen,
  PieChart,
  Settings,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { AppProvider, useApp } from "@/lib/store";
import { experienceLabel, initialsOf } from "@/lib/profile";
import { OnboardingTour } from "./onboarding-tour";
import { ProfileSetup } from "./profile-setup";

type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number }>; section: string };

const NAV: NavItem[] = [
  { href: "/app", label: "Home", icon: Home, section: "Overview" },
  { href: "/app/portfolio", label: "Portfolio", icon: Wallet, section: "Overview" },
  { href: "/app/trade", label: "Trade", icon: ArrowLeftRight, section: "Overview" },
  { href: "/app/markets", label: "Markets", icon: LineChart, section: "Overview" },
  { href: "/app/allocate", label: "Allocation", icon: PieChart, section: "Overview" },
  { href: "/app/thesis", label: "Theses", icon: NotebookPen, section: "Process" },
  { href: "/app/insights", label: "Insights", icon: Lightbulb, section: "Process" },
  { href: "/app/settings", label: "Settings", icon: Settings, section: "Process" },
];

const SECTIONS = ["Overview", "Process"] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`));
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const isActive = useIsActive();
  return (
    <>
      {SECTIONS.map((section) => (
        <div key={section}>
          <div className="nav-section">{section}</div>
          {NAV.filter((item) => item.section === section).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={clsx("nav-link", isActive(href) && "active")}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>
      ))}
    </>
  );
}

function BrandMark({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" className="brand" onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="Sentia logo" className="brand-mark" width={36} height={36} />
      Sentia
    </Link>
  );
}

function ProfileChip({ onNavigate }: { onNavigate?: () => void }) {
  const { state } = useApp();
  const name = state?.profileName ?? "";
  const initials = initialsOf(name);
  const color = state?.profile.avatarColor || "#0d9488";
  const subtitle = experienceLabel(state?.profile.experience ?? null) || "Tap to personalize";
  return (
    <Link href="/app/settings" onClick={onNavigate} className="profile-chip" style={{ marginTop: "auto" }}>
      <span className="avatar" style={{ background: color }}>
        {initials || <UserRound size={18} />}
      </span>
      <span className="stack" style={{ gap: 0, minWidth: 0 }}>
        <strong className="truncate">{name || "Set up profile"}</strong>
        <span className="small muted truncate">{subtitle}</span>
      </span>
    </Link>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <BrandMark />
      <NavLinks />
      <ProfileChip />
    </aside>
  );
}

function MobileTopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="topbar">
      <BrandMark />
      <button className="btn btn-icon" onClick={onMenu} aria-label="Open menu">
        <Menu size={20} />
      </button>
    </header>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={clsx("drawer-overlay", open && "open")}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-hidden={!open}
    >
      <aside className={clsx("drawer", open && "open")}>
        <div className="row between" style={{ marginBottom: 4 }}>
          <BrandMark onClick={onClose} />
          <button className="btn btn-icon" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
        <ProfileChip onNavigate={onClose} />
      </aside>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <>
      <div className="shell">
        <Sidebar />
        <main className="main">
          <MobileTopBar onMenu={() => setDrawerOpen(true)} />
          {children}
        </main>
      </div>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <ProfileSetup />
      <OnboardingTour />
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
