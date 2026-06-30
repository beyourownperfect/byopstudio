import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Zap, BookOpen, Calendar, Activity, Command as CmdIcon, Menu, X, Sun, Moon } from "lucide-react";
import { TID } from "@/lib/constants";
import CommandPalette from "@/components/CommandPalette";
import JanCountdown from "@/components/JanCountdown";
import useTheme from "@/hooks/useTheme";

const tabs = [
  { to: "/solve/repository", label: "SOLVE", tid: TID.navSolve, icon: BookOpen, match: "/solve" },
  { to: "/pulse", label: "PULSE", tid: TID.navPulse, icon: Zap, match: "/pulse" },
  { to: "/log", label: "LOG", tid: TID.navLog, icon: Activity, match: "/log" },
  { to: "/timeline", label: "TIMELINE", tid: TID.navTimeline, icon: Calendar, match: "/timeline" },
];

const solveSubs = [
  { to: "/solve/repository", label: "Repository", tid: TID.solveRepo },
  { to: "/solve/practice", label: "Practice", tid: TID.solvePractice },
  { to: "/solve/bookmarks", label: "Bookmarks", tid: TID.solveBookmarks },
  { to: "/solve/mistakes", label: "Mistakes", tid: TID.solveMistakes },
];

export default function Layout() {
  const loc = useLocation();
  const isSolve = loc.pathname.startsWith("/solve");
  const isMac = typeof navigator !== "undefined" && navigator.platform?.toLowerCase().includes("mac");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdHint, setCmdHint] = useState(false);
  const { theme, toggle } = useTheme();

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    const seen = localStorage.getItem("byop.cmdk_hint_seen");
    if (!seen) setCmdHint(true);
  }, []);

  const dismissCmdHint = () => {
    localStorage.setItem("byop.cmdk_hint_seen", "1");
    setCmdHint(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b-2 border-border bg-[hsl(var(--bg))] sticky top-0 z-30">
        <div className="px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded bg-[hsl(var(--accent))]/15 border-2 border-[hsl(var(--accent))]/40 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-[hsl(var(--accent))]" strokeWidth={2} />
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-semibold text-[13px] truncate">BYOPGateCS<span className="text-[hsl(var(--fg-subtle))]">.studio</span></div>
              <div className="text-[9px] tracking-[0.18em] uppercase text-[hsl(var(--fg-subtle))] truncate">Study OS · v1.2</div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {tabs.map((t) => {
              const active = loc.pathname.startsWith(t.match);
              const Icon = t.icon;
              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  data-testid={t.tid}
                  className={`px-3 py-1.5 text-xs font-semibold tracking-wider rounded inline-flex items-center gap-1.5 transition-colors ${
                    active ? "bg-[hsl(var(--bg-elev-2))] text-[hsl(var(--accent))]" : "text-[hsl(var(--fg-muted))] hover:text-[hsl(var(--fg))] hover:bg-[hsl(var(--bg-elev-2))]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} /> {t.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <JanCountdown />

            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="btn-ghost p-1.5"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              data-testid={TID.cmdK}
              onClick={() => {
                const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true });
                document.dispatchEvent(e);
              }}
              className="hidden sm:inline-flex text-xs text-[hsl(var(--fg-muted))] mono items-center gap-1 px-2 py-1 border border-border rounded hover:bg-[hsl(var(--bg-elev-2))]"
              title="Command palette"
            >
              <CmdIcon className="w-3 h-3" /> {isMac ? "⌘K" : "Ctrl K"}
            </button>

            {/* Mobile menu trigger */}
            <button
              data-testid="mobile-menu-trigger"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden btn-ghost p-1.5"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div data-testid="mobile-nav" className="md:hidden border-t border-border bg-[hsl(var(--bg))] px-3 py-2 flex flex-col gap-1">
            {tabs.map((t) => {
              const active = loc.pathname.startsWith(t.match);
              const Icon = t.icon;
              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  onClick={closeMobile}
                  data-testid={`${t.tid}-m`}
                  className={`px-3 py-2 text-xs font-semibold tracking-wider rounded inline-flex items-center gap-2 transition-colors ${
                    active ? "bg-[hsl(var(--bg-elev-2))] text-[hsl(var(--accent))]" : "text-[hsl(var(--fg-muted))]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} /> {t.label}
                </NavLink>
              );
            })}
          </div>
        )}

        {isSolve && (
          <div className="px-3 sm:px-5 pb-2 flex items-center gap-1 border-t border-border/60 pt-1.5 overflow-x-auto no-scrollbar">
            {solveSubs.map((s) => {
              const active = loc.pathname === s.to;
              return (
                <NavLink
                  key={s.to} to={s.to} data-testid={s.tid}
                  className={`px-3 py-1 text-[11px] font-medium tracking-wide rounded uppercase whitespace-nowrap ${
                    active ? "text-[hsl(var(--fg))] bg-[hsl(var(--bg-elev-2))]" : "text-[hsl(var(--fg-muted))] hover:text-[hsl(var(--fg))]"
                  }`}
                >
                  {s.label}
                </NavLink>
              );
            })}
          </div>
        )}
      </header>

      <main className="flex-1 px-3 sm:px-5 py-4 sm:py-5 max-w-[1400px] w-full mx-auto">
        {cmdHint && (
          <div className="mb-4 card-2-accent px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
            <span className="text-[hsl(var(--fg-muted))]">
              Press <kbd className="px-1.5 py-0.5 bg-[hsl(var(--bg-elev-2))] border border-border rounded text-xs mono">{isMac ? "⌘K" : "Ctrl+K"}</kbd> to search, navigate, or jump to practice
            </span>
            <button onClick={dismissCmdHint} className="btn-ghost p-1 text-[hsl(var(--fg-subtle))] hover:text-[hsl(var(--fg))]" title="Dismiss"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        <Outlet />
      </main>

      <CommandPalette />
    </div>
  );
}
