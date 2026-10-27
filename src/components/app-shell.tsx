"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Cloud,
  CloudAlert,
  Home,
  MonitorSmartphone,
  Lightbulb,
  LineChart,
  Menu,
  NotebookPen,
  PieChart,
  Settings,
  Star,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppProvider, retryCloudLoad, useApp } from "@/lib/store";
import { AuthGate } from "./auth/auth-gate";
import { assetPath } from "@/lib/asset";
import { experienceLabel, initialsOf } from "@/lib/profile";
import { OnboardingTour } from "./onboarding-tour";
import { DemoPricesBadge, Loading, ToastHost } from "./ui";
import { ProfileSetup } from "./profile-setup";

type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number }>; section: string };

const NAV: NavItem[] = [
  { href: "/app", label: "Home", icon: Home, section: "Overview" },
  { href: "/app/portfolio", label: "Portfolio", icon: Wallet, section: "Overview" },
  { href: "/app/trade", label: "Trade", icon: ArrowLeftRight, section: "Overview" },
  { href: "/app/markets", label: "Markets", icon: LineChart, section: "Overview" },
  { href: "/app/watchlist", label: "Watchlist", icon: Star, section: "Overview" },
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
    <nav aria-label="Main" className="stack" style={{ gap: 6 }}>
      {SECTIONS.map((section) => (
        <div key={section} role="group" aria-labelledby={`nav-section-${section}`}>
          <div className="nav-section" id={`nav-section-${section}`}>
            {section}
          </div>
          {NAV.filter((item) => item.section === section).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={clsx("nav-link", isActive(href) && "active")}
              aria-current={isActive(href) ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

function BrandMark({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" className="brand" onClick={onClick} aria-label="Sentia home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={assetPath("/icon.png")} alt="" className="brand-mark" width={36} height={36} />
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
    <Link href="/app/settings" onClick={onNavigate} className="profile-chip" style={{ marginTop: onNavigate ? "auto" : 0 }}>
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

/** Where the paper account is saved: the signed-in account (cloud) or this device (guest/demo). */
function SyncBadge({ className }: { className?: string }) {
  const { sync } = useApp();
  const { configured } = useAuth();
  if (!configured || !sync.mode) return null;
  if (sync.mode === "guest") {
    return (
      <Link href="/signup" className={clsx("pill", className)} title="Demo mode: saved in this browser only. Create an account to sync.">
        <MonitorSmartphone size={13} /> Demo · this device
      </Link>
    );
  }
  const error = sync.status === "error";
  const text = error ? "Sync problem" : sync.status === "saving" || sync.status === "loading" ? "Saving…" : "Synced";
  return (
    <Link href="/app/settings" className={clsx("pill", error ? "pill-demo" : "pill-primary", className)} title={sync.error ?? "Saved to your account"} role="status">
      {error ? <CloudAlert size={13} /> : <Cloud size={13} />} {text}
    </Link>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <BrandMark />
      <NavLinks />
      <div className="stack gap-sm" style={{ marginTop: "auto", padding: "0 4px 6px", alignItems: "flex-start" }}>
        <SyncBadge />
        <DemoPricesBadge />
      </div>
      <ProfileChip />
    </aside>
  );
}

function MobileTopBar({
  onMenu,
  menuOpen,
  menuButtonRef,
}: {
  onMenu: () => void;
  menuOpen: boolean;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <header className="topbar">
      <BrandMark />
      <span className="grow" />
      <SyncBadge className="pill-compact" />
      <DemoPricesBadge className="pill-compact" />
      <button
        ref={menuButtonRef}
        type="button"
        className="btn btn-icon"
        onClick={onMenu}
        aria-label="Open menu"
        aria-expanded={menuOpen}
        aria-controls="mobile-drawer"
      >
        <Menu size={20} />
      </button>
    </header>
  );
}

function MobileDrawer({
  open,
  onClose,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes; focus moves into the drawer on open, Tab is kept inside it,
  // and focus returns to the menu button on close.
  useEffect(() => {
    if (!open) return;
    const returnTo = returnFocusRef.current;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo?.focus();
    };
  }, [open, onClose, returnFocusRef]);

  return (
    <div
      className={clsx("drawer-overlay", open && "open")}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-hidden={!open}
      inert={!open}
    >
      <aside
        ref={drawerRef}
        id="mobile-drawer"
        className={clsx("drawer", open && "open")}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="row between" style={{ marginBottom: 4 }}>
          <BrandMark onClick={onClose} />
          <button ref={closeRef} type="button" className="btn btn-icon" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
        <ProfileChip onNavigate={onClose} />
      </aside>
    </div>
  );
}

/** Blocks the workspace if a signed-in account couldn't be loaded (never shows stale/foreign data). */
function CloudLoadError() {
  const { state, sync } = useApp();
  const { signOut } = useAuth();
  if (state || sync.mode !== "cloud" || sync.status !== "error") return null;
  return (
    <div className="panel stack gap-md" role="alert" style={{ maxWidth: 520 }}>
      <strong>We couldn&apos;t load your account</strong>
      <span className="small muted">{sync.error}</span>
      <div className="row wrap gap-sm">
        <button className="btn btn-primary" onClick={retryCloudLoad}>
          Try again
        </button>
        <button className="btn" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </div>
  );
}

function ShellBody({ children }: { children: React.ReactNode }) {
  const { state, sync } = useApp();
  if (!state && sync.mode === "cloud" && sync.status === "error") return <CloudLoadError />;
  if (!state && sync.mode === "cloud") return <Loading label="Loading your account…" />;
  return <>{children}</>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="shell">
        <Sidebar />
        <main className="main" id="main-content" tabIndex={-1}>
          <MobileTopBar onMenu={() => setDrawerOpen(true)} menuOpen={drawerOpen} menuButtonRef={menuButtonRef} />
          <ShellBody>{children}</ShellBody>
        </main>
      </div>
      <MobileDrawer open={drawerOpen} onClose={closeDrawer} returnFocusRef={menuButtonRef} />
      <ProfileSetup />
      <OnboardingTour />
      <ToastHost />
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>
        {(mode) => (
          <AppProvider mode={mode}>
            <Shell>{children}</Shell>
          </AppProvider>
        )}
      </AuthGate>
    </AuthProvider>
  );
}
