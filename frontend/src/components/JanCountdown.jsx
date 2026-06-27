import React, { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";

function getJan1Target() {
  const now = new Date();
  const y = now.getFullYear();
  // If we're already past Jan 1 of this year, target next Jan 1.
  const thisYearJan1 = new Date(y, 0, 1, 0, 0, 0, 0);
  if (now >= thisYearJan1) return new Date(y + 1, 0, 1, 0, 0, 0, 0);
  return thisYearJan1;
}

function diffParts(targetMs, nowMs) {
  let s = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const days = Math.floor(s / 86400); s -= days * 86400;
  const hours = Math.floor(s / 3600); s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  return { days, hours, minutes };
}

export default function JanCountdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000); // refresh every 30s
    return () => clearInterval(t);
  }, []);
  const target = getJan1Target();
  const { days, hours, minutes } = diffParts(target.getTime(), now.getTime());
  const todayLabel = now.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div
      data-testid="jan-countdown-widget"
      className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded border border-border bg-[hsl(var(--bg-elev-1))]"
      title={`Countdown to ${target.getFullYear()}-01-01`}
    >
      <CalendarClock className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
      <div className="leading-tight">
        <div className="text-[9px] tracking-[0.18em] uppercase text-[hsl(var(--fg-subtle))]">
          Today {todayLabel} · to Jan 1
        </div>
        <div data-testid="jan-countdown-value" className="text-[11px] mono font-semibold">
          {days}d : {String(hours).padStart(2, "0")}h : {String(minutes).padStart(2, "0")}m
        </div>
      </div>
    </div>
  );
}
