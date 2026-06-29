import React, { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { settingsApi } from "@/lib/api";

export default function JanCountdown() {
  const [days, setDays] = useState(null);
  const [examLabel, setExamLabel] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await settingsApi.get();
        if (cancelled || !s || !s.exam_date) return;
        const examMs = new Date(s.exam_date + "T00:00:00").getTime();
        const fmt = new Date(s.exam_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        setExamLabel(fmt);
        const update = () => {
          if (cancelled) return;
          const d = Math.max(0, Math.floor((examMs - Date.now()) / 86400000));
          setDays(d);
        };
        update();
        const t = setInterval(update, 60 * 1000);
        return () => clearInterval(t);
      } catch { /* ignore */ }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (days === null) return null;

  return (
    <div
      data-testid="gate-countdown-widget"
      className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded border border-border bg-[hsl(var(--bg-elev))]"
      title={`GATE exam: ${examLabel}`}
    >
      <CalendarClock className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />
      <div className="leading-tight">
        <div className="text-[9px] tracking-[0.18em] uppercase text-[hsl(var(--fg-subtle))]">
          GATE {examLabel}
        </div>
        <div data-testid="gate-countdown-value" className="text-[11px] mono font-semibold">
          {days}<span className="text-[hsl(var(--fg-muted))] text-[10px] ml-1">days</span>
        </div>
      </div>
    </div>
  );
}
