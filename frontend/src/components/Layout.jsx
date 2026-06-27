import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Zap, BookOpen, Calendar, Activity, Command as CmdIcon } from "lucide-react";
import { TID } from "@/lib/constants";
import CommandPalette from "@/components/CommandPalette";

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b-2 border-border bg-[hsl(var(--bg))] sticky top-0 z-30">
        <div className="px-5 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[hsl(var(--accent))]/15 border-2 border-[hsl(var(--accent))]/40 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-[hsl(var(--accent))]" strokeWidth={2} />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-[13px]">BYOPGateCS<span className="text-[hsl(var(--fg-subtle))]">.studio</span></div>
              <div className="text-[9px] tracking-[0.18em] uppercase text-[hsl(var(--fg-subtle))]">Study OS · v1.1</div>
            </div>
          </div>

          <nav className="flex items-center gap-0.5">
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

          <button
            data-testid={TID.cmdK}
            onClick={() => {
              const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true });
              document.dispatchEvent(e);
            }}
            className="text-xs text-[hsl(var(--fg-muted))] mono inline-flex items-center gap-1 px-2 py-1 border border-border rounded hover:bg-[hsl(var(--bg-elev-2))]"
            title="Command palette"
          >
            <CmdIcon className="w-3 h-3" /> {isMac ? "⌘K" : "Ctrl K"}
          </button>
        </div>

        {isSolve && (
          <div className="px-5 pb-2 flex items-center gap-1 border-t border-border/60 pt-1.5">
            {solveSubs.map((s) => {
              const active = loc.pathname === s.to;
              return (
                <NavLink
                  key={s.to} to={s.to} data-testid={s.tid}
                  className={`px-3 py-1 text-[11px] font-medium tracking-wide rounded uppercase ${
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

      <main className="flex-1 px-5 py-5 max-w-[1400px] w-full mx-auto">
        <Outlet />
      </main>

      <CommandPalette />
    </div>
  );
}
