import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Maximize2, X, Save } from "lucide-react";
import { logsApi } from "@/lib/api";
import { todayISO } from "@/lib/dateUtils";

const STOPWATCH_COLOR = "hsl(170 70% 45%)";
const STOPWATCH_RUN_COLOR = "hsl(170 85% 55%)";
const COUNTDOWN_COLOR = "hsl(24 95% 58%)";
const COUNTDOWN_RUN_COLOR = "hsl(24 100% 63%)";

const PRESETS = [5, 15, 25, 45, 60];

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function StudyTimer() {
  const [mode, setMode] = useState("stopwatch");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [totalSec, setTotalSec] = useState(1500);
  const [countdownMins, setCountdownMins] = useState(25);
  const [countdownSecs, setCountdownSecs] = useState(0);
  const [focusOpen, setFocusOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const intervalRef = useRef(null);
  const loggedRef = useRef(false);

  const start = useCallback(() => {
    if (running) return;
    if (mode === "countdown") {
      const t = countdownMins * 60 + countdownSecs;
      if (t <= 0) return;
      setTotalSec(t);
      if (elapsed >= t) setElapsed(0);
      loggedRef.current = false;
    }
    setRunning(true);
  }, [running, mode, countdownMins, countdownSecs, elapsed]);

  const pause = useCallback(() => setRunning(false), []);

  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
    if (mode === "countdown") setTotalSec(countdownMins * 60 + countdownSecs);
  }, [mode, countdownMins, countdownSecs]);

  const toggle = useCallback(() => {
    if (running) pause(); else start();
  }, [running, start, pause]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    if (mode === "countdown" && running && elapsed >= totalSec && !loggedRef.current) {
      loggedRef.current = true;
      setRunning(false);
      const minutes = Math.round(totalSec / 60) || 1;
      logsApi.create({
        date: todayISO(),
        activity: "Practice",
        subject: "OS",
        topic: "",
        duration_min: minutes,
        remarks: `Countdown timer: ${countdownMins}m session`,
      }).then(() => {
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 3000);
      }).catch(() => {});
      new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+AgH9/f3+AgH9/f4CAf39/f4CAf39/gIB/f39/gIB/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f3+AgH9/f4CAf39/f4B/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f3+AgH9/f4CAf39/f4CAf39/gIB/f39/gIB/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f4CAf39/f4CAf39/gIB/f39/gICAf3+AgICAf39/gICAf3+AgICAf3+AgICAf3+AgICAf3+AgICAf39/gICAf39/gICAf3+AgH9/f4CAf39/f4CAf39/gIB/f39/gIB/f3+AgH9/f4B/f3+AgICAf3+AgH9/f3+AgICAf3+AgICAf3+AgICAf39/gICAf39/f4B/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4CAf39/f4CAf39/gIB/f39/gICAf3+AgICAf3+AgICAf3+AgICAf3+AgICAf39/gID//w==").play().catch(() => {});
    }
  }, [elapsed, running, mode, totalSec, countdownMins]);

  const switchMode = (m) => {
    setRunning(false);
    setElapsed(0);
    setMode(m);
  };

  const closeFocus = useCallback(() => setFocusOpen(false), []);

  const saveToLog = async () => {
    const minutes = Math.round(
      (mode === "stopwatch" ? elapsed : totalSec) / 60
    ) || 1;
    await logsApi.create({
      date: todayISO(),
      activity: "Practice",
      subject: "OS",
      topic: "",
      duration_min: minutes,
      remarks:
        mode === "stopwatch"
          ? `Stopwatch: ${formatTime(elapsed)}`
          : `Countdown timer: ${countdownMins}m session`,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
    reset();
  };

  useEffect(() => {
    if (!focusOpen) return;
    const onKey = (e) => { if (e.key === "Escape") closeFocus(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [focusOpen, closeFocus]);

  const display = mode === "stopwatch" ? elapsed : totalSec - elapsed;
  const isUrgent = mode === "countdown" && running && display <= 30 && display >= 0;
  const color = mode === "stopwatch"
    ? (running ? STOPWATCH_RUN_COLOR : STOPWATCH_COLOR)
    : (running ? COUNTDOWN_RUN_COLOR : COUNTDOWN_COLOR);

  return (
    <div className="relative">
      {/* ── Inline compact timer bar ── */}
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-[hsl(var(--bg-elev))] px-3 py-1.5">
        {/* Mode tabs */}
        <div className="flex rounded-md bg-[hsl(var(--bg-elev-2))] p-0.5">
          <button
            onClick={() => switchMode("stopwatch")}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-all ${
              mode === "stopwatch" ? "bg-[#2dd4bf]/20 text-[#2dd4bf]" : "text-[hsl(var(--fg-muted))]"
            }`}
          >
            Stopwatch
          </button>
          <button
            onClick={() => switchMode("countdown")}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-all ${
              mode === "countdown" ? "bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))]" : "text-[hsl(var(--fg-muted))]"
            }`}
          >
            Countdown
          </button>
        </div>

        {/* Countdown setup (only when stopped) */}
        {mode === "countdown" && !running && (
          <div className="flex items-center gap-1">
            <input
              type="number" min="1" max="999"
              value={countdownMins}
              onChange={(e) => setCountdownMins(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-10 px-1 py-0.5 text-[11px] text-center bg-[hsl(var(--bg-elev-2))] border border-border rounded outline-none focus:border-[hsl(var(--accent))] mono"
            />
            <span className="text-[10px] text-[hsl(var(--fg-muted))]">m</span>
            <input
              type="number" min="0" max="59"
              value={countdownSecs}
              onChange={(e) => setCountdownSecs(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-10 px-1 py-0.5 text-[11px] text-center bg-[hsl(var(--bg-elev-2))] border border-border rounded outline-none focus:border-[hsl(var(--accent))] mono"
            />
            <span className="text-[10px] text-[hsl(var(--fg-muted))]">s</span>
          </div>
        )}

        {/* Time display */}
        <span
          className={`mono font-bold text-lg tabular-nums tracking-wider transition-colors ${
            isUrgent ? "text-[hsl(var(--danger))] animate-pulse" : ""
          }`}
          style={{ color: !isUrgent ? color : undefined, minWidth: mode === "stopwatch" ? "55px" : "60px", textAlign: "center" }}
        >
          {formatTime(display)}
        </span>

        {/* Controls */}
        <button onClick={toggle} className="btn-ghost p-1" title={running ? "Pause" : "Start"}>
          {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button onClick={reset} className="btn-ghost p-1" title="Reset">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-5 bg-border mx-0.5" />
        <button onClick={saveToLog} className="btn-ghost p-1" title="Save to log" disabled={display <= 0}>
          <Save className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setFocusOpen(true)} className="btn-ghost p-1" title="Focus mode">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Saved toast */}
        {savedToast && (
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-[hsl(var(--success))] whitespace-nowrap animate-modal-in">
            ✓ Saved to log
          </span>
        )}
      </div>

      {/* ── Focus Mode Modal ── */}
      {focusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Dimmed backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeFocus} />

          <div className="relative card-2 p-8 text-center select-none">
            {/* Close button */}
            <button onClick={closeFocus} className="absolute top-3 right-3 btn-ghost p-1 text-[hsl(var(--fg-muted))] hover:text-[hsl(var(--fg))]" title="Close (Esc)">
              <X className="w-4 h-4" />
            </button>

            {/* Mode tabs */}
            <div className="inline-flex gap-1 rounded-lg bg-[hsl(var(--bg-elev-2))] p-1 mb-6">
              <button
                onClick={() => switchMode("stopwatch")}
                className={`px-5 py-2 text-sm font-semibold rounded-md transition-all ${
                  mode === "stopwatch"
                    ? "bg-(--color-stopwatch)/20 text-(--color-stopwatch)"
                    : "text-[hsl(var(--fg-muted))]"
                }`}
                style={{ "--color-stopwatch": STOPWATCH_COLOR }}
              >
                Stopwatch
              </button>
              <button
                onClick={() => switchMode("countdown")}
                className={`px-5 py-2 text-sm font-semibold rounded-md transition-all ${
                  mode === "countdown"
                    ? "bg-(--color-countdown)/20 text-(--color-countdown)"
                    : "text-[hsl(var(--fg-muted))]"
                }`}
                style={{ "--color-countdown": COUNTDOWN_COLOR }}
              >
                Countdown
              </button>
            </div>

            {/* Countdown setup inputs (only when stopped) */}
            {mode === "countdown" && !running && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <input
                  type="number" min="1" max="999"
                  value={countdownMins}
                  onChange={(e) => { setCountdownMins(Math.max(0, parseInt(e.target.value) || 0)); const t = (parseInt(e.target.value) || 0) * 60 + countdownSecs; if (t > 0) setTotalSec(t); }}
                  className="w-20 px-3 py-2 text-lg text-center bg-[hsl(var(--bg-elev-2))] border border-border rounded-lg outline-none focus:border-[hsl(var(--accent))] mono"
                  placeholder="min"
                />
                <span className="text-sm text-[hsl(var(--fg-muted))]">m</span>
                <input
                  type="number" min="0" max="59"
                  value={countdownSecs}
                  onChange={(e) => { setCountdownSecs(Math.min(59, Math.max(0, parseInt(e.target.value) || 0))); const t = countdownMins * 60 + (parseInt(e.target.value) || 0); if (t > 0) setTotalSec(t); }}
                  className="w-20 px-3 py-2 text-lg text-center bg-[hsl(var(--bg-elev-2))] border border-border rounded-lg outline-none focus:border-[hsl(var(--accent))] mono"
                  placeholder="sec"
                />
                <span className="text-sm text-[hsl(var(--fg-muted))]">s</span>
              </div>
            )}

            {/* Large time display */}
            <div
              className={`mono font-bold text-8xl tracking-[0.08em] leading-none transition-colors ${isUrgent ? "text-[hsl(var(--danger))] animate-pulse" : ""}`}
              style={{ color: !isUrgent ? color : undefined }}
            >
              {formatTime(display)}
            </div>

            {/* Preset buttons (countdown only) */}
            {mode === "countdown" && !running && (
              <div className="flex items-center justify-center gap-2 mt-6">
                {PRESETS.map((m) => (
                  <button
                    key={m}
                    onClick={() => { setCountdownMins(m); setCountdownSecs(0); setTotalSec(m * 60); setElapsed(0); }}
                    className="px-3 py-1.5 text-sm rounded-md border border-border bg-[hsl(var(--bg-elev-2))] text-[hsl(var(--fg-muted))] hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--fg))] transition-colors"
                  >
                    {m}m
                  </button>
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={toggle}
                className="w-14 h-14 rounded-full border-2 border-[hsl(var(--accent))] flex items-center justify-center hover:bg-[hsl(var(--accent))]/10 transition-colors"
                title={running ? "Pause" : "Start"}
              >
                {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              <button
                onClick={reset}
                className="w-14 h-14 rounded-full border-2 border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--fg-muted))] hover:border-[hsl(var(--fg-muted))] hover:text-[hsl(var(--fg))] transition-colors"
                title="Reset"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>

            <p className="text-[11px] text-[hsl(var(--fg-subtle))] mt-6">Press Esc or click outside to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
