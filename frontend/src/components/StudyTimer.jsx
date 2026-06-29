import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, ExternalLink, Timer, StopCircle } from "lucide-react";

const STOPWATCH_COLOR = "hsl(170 70% 45%)";
const STOPWATCH_RUN_COLOR = "hsl(170 85% 55%)";
const COUNTDOWN_COLOR = "hsl(24 95% 58%)";
const COUNTDOWN_RUN_COLOR = "hsl(24 100% 63%)";

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildPopoutHtml(mode, colorRunning) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Study Timer</title><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Inter',system-ui,sans-serif;background:#0d0d0d;color:#f5f5f5;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;user-select:none;-webkit-user-select:none;}
.container{text-align:center;padding:20px;}
.mode-tabs{display:inline-flex;gap:4px;background:#1a1a1a;border-radius:8px;padding:4px;margin-bottom:16px;}
.mode-tab{border:none;background:transparent;color:#999;padding:6px 14px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;transition:all .15s;}
.mode-tab.active.stopwatch{background:rgba(45,212,191,.15);color:#2dd4bf;}
.mode-tab.active.countdown{background:rgba(249,115,22,.15);color:#f97316;}
.time{font-size:64px;font-weight:700;font-family:'JetBrains Mono',monospace;margin:12px 0;letter-spacing:4px;transition:color .3s;}
.time.stopwatch{color:#2dd4bf;}
.time.stopwatch.running{color:#34d399;}
.time.countdown{color:#f97316;}
.time.countdown.running{color:#fb923c;}
.time.countdown.urgent{color:#ef4444;animation:pulse .8s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.controls{display:flex;gap:8px;justify-content:center;margin-top:8px;}
.ctrl-btn{border:none;background:#1a1a1a;color:#ccc;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;transition:all .15s;}
.ctrl-btn:hover{background:#2a2a2a;color:#fff;}
.countdown-input{display:flex;gap:4px;justify-content:center;align-items:center;margin-bottom:8px;}
.countdown-input input{width:50px;padding:4px 6px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:#f5f5f5;font-size:13px;text-align:center;outline:none;font-family:'JetBrains Mono',monospace;}
.countdown-input input:focus{border-color:#f97316;}
.countdown-input span{color:#666;font-size:13px;}
.preset-btns{display:flex;gap:4px;justify-content:center;margin-top:6px;}
.preset-btn{border:none;background:#1a1a1a;color:#999;padding:3px 10px;border-radius:4px;font-size:11px;cursor:pointer;transition:all .15s;}
.preset-btn:hover{background:#2a2a2a;color:#ddd;}
</style></head><body>
<div class="container">
  <div class="mode-tabs">
    <button class="mode-tab stopwatch" id="btnSw">Stopwatch</button>
    <button class="mode-tab countdown" id="btnCd">Countdown</button>
  </div>
  <div id="cdInput" class="countdown-input" style="display:none">
    <input id="cdMins" type="number" min="1" max="999" value="25" placeholder="min">
    <span>m</span>
    <input id="cdSecs" type="number" min="0" max="59" value="0" placeholder="sec">
    <span>s</span>
  </div>
  <div class="time stopwatch" id="display">00:00</div>
  <div id="presets" class="preset-btns" style="display:none">
    <button class="preset-btn" data-m="5">5m</button>
    <button class="preset-btn" data-m="15">15m</button>
    <button class="preset-btn" data-m="25">25m</button>
    <button class="preset-btn" data-m="45">45m</button>
    <button class="preset-btn" data-m="60">60m</button>
  </div>
  <div class="controls">
    <button class="ctrl-btn" id="btnPlay"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>
    <button class="ctrl-btn" id="btnReset"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
  </div>
</div>
<script>
var mode='stopwatch',running=false,totalSec=0,elapsed=0,timer=null;
var dis=document.getElementById('display'),cdInput=document.getElementById('cdInput'),
presets=document.getElementById('presets'),btnSw=document.getElementById('btnSw'),
btnCd=document.getElementById('btnCd'),btnPlay=document.getElementById('btnPlay'),
btnReset=document.getElementById('btnReset'),
cdMins=document.getElementById('cdMins'),cdSecs=document.getElementById('cdSecs');
function pad(n){return String(n).padStart(2,'0');}
function fmt(t){var h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;
return h>0?h+':'+pad(m)+':'+pad(s):pad(m)+':'+pad(s);}
function upd(){if(mode==='stopwatch'){dis.textContent=fmt(elapsed);
dis.className='time stopwatch'+(running?' running':'');
}else{var rem=totalSec-elapsed;if(rem<=0){stop();rem=0;}
dis.textContent=fmt(rem);
dis.className='time countdown'+(running?' running':'')+(rem<=30&&running?' urgent':'');}}
function tick(){elapsed++;upd();}
function start(){if(running)return;if(mode==='countdown'&&elapsed>=totalSec){elapsed=0;}
running=true;timer=setInterval(tick,1000);upd();btnPlay.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';}
function stop(){running=false;clearInterval(timer);timer=null;upd();
btnPlay.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>';}
function reset(){stop();elapsed=0;upd();}
function setMode(m){mode=m;stop();elapsed=0;
btnSw.className='mode-tab stopwatch'+(m==='stopwatch'?' active':'');
btnCd.className='mode-tab countdown'+(m==='countdown'?' active':'');
cdInput.style.display=m==='countdown'?'flex':'none';
presets.style.display=m==='countdown'?'flex':'none';
upd();}
function setCountdown(){totalSec=parseInt(cdMins.value||0)*60+parseInt(cdSecs.value||0);if(totalSec<=0)totalSec=1500;elapsed=0;upd();}
btnSw.onclick=function(){setMode('stopwatch');};
btnCd.onclick=function(){setMode('countdown');setCountdown();};
btnPlay.onclick=function(){if(running)stop();else{if(mode==='countdown'&&elapsed===0)setCountdown();start();}};
btnReset.onclick=function(){reset();if(mode==='countdown')setCountdown();};
cdMins.onchange=setCountdown;cdSecs.onchange=setCountdown;
presets.querySelectorAll('.preset-btn').forEach(function(b){b.onclick=function(){cdMins.value=this.dataset.m;cdSecs.value=0;setCountdown();};});
upd();
</script></body></html>`;
}

export default function StudyTimer() {
  const [mode, setMode] = useState("stopwatch");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [totalSec, setTotalSec] = useState(1500); // default 25 min
  const [countdownMins, setCountdownMins] = useState(25);
  const [countdownSecs, setCountdownSecs] = useState(0);
  const intervalRef = useRef(null);
  const popoutRef = useRef(null);

  const start = useCallback(() => {
    if (running) return;
    if (mode === "countdown") {
      const t = countdownMins * 60 + countdownSecs;
      if (t <= 0) return;
      setTotalSec(t);
      if (elapsed >= t) setElapsed(0);
    }
    setRunning(true);
  }, [running, mode, countdownMins, countdownSecs, elapsed]);

  const pause = useCallback(() => {
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
  }, []);

  const toggle = useCallback(() => {
    if (running) pause();
    else start();
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
    if (mode === "countdown" && running && elapsed >= totalSec) {
      setRunning(false);
      new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+AgH9/f3+AgH9/f4CAf39/f4CAf39/gIB/f39/gIB/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f3+AgH9/f4CAf39/f4B/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f3+AgH9/f4CAf39/f4CAf39/gIB/f39/gIB/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f4CAf39/f4CAf39/gIB/f39/gICAf3+AgICAf39/gICAf3+AgICAf3+AgICAf3+AgICAf3+AgICAf39/gICAf39/gICAf3+AgH9/f4CAf39/f4CAf39/gIB/f39/gIB/f3+AgH9/f4B/f3+AgICAf3+AgH9/f3+AgICAf3+AgICAf3+AgICAf39/gICAf39/f4B/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4CAf39/f4CAf39/gIB/f39/gICAf3+AgICAf3+AgICAf3+AgICAf3+AgICAf39/gID//w==").play().catch(() => {});
    }
  }, [elapsed, running, mode, totalSec]);

  const display = mode === "stopwatch" ? elapsed : totalSec - elapsed;
  const isUrgent = mode === "countdown" && running && display <= 30 && display >= 0;

  const switchMode = (m) => {
    setRunning(false);
    setElapsed(0);
    setMode(m);
  };

  const openPopout = () => {
    if (popoutRef.current && !popoutRef.current.closed) {
      popoutRef.current.focus();
      return;
    }
    const runColor = mode === "countdown" ? COUNTDOWN_RUN_COLOR : STOPWATCH_RUN_COLOR;
    const w = 300, h = 320;
    const left = window.screenX + window.innerWidth - w - 40;
    const top = window.screenY + 80;
    const win = window.open("", "study-timer", `width=${w},height=${h},left=${left},top=${top},noopener`);
    if (!win) return;
    win.document.write(buildPopoutHtml(mode, runColor));
    win.document.close();
    popoutRef.current = win;
  };

  const color = mode === "stopwatch"
    ? (running ? STOPWATCH_RUN_COLOR : STOPWATCH_COLOR)
    : (running ? COUNTDOWN_RUN_COLOR : COUNTDOWN_COLOR);

  return (
    <div>
      {/* Inline compact timer */}
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
              type="number"
              min="1"
              max="999"
              value={countdownMins}
              onChange={(e) => setCountdownMins(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-10 px-1 py-0.5 text-[11px] text-center bg-[hsl(var(--bg-elev-2))] border border-border rounded outline-none focus:border-[hsl(var(--accent))] mono"
            />
            <span className="text-[10px] text-[hsl(var(--fg-muted))]">m</span>
            <input
              type="number"
              min="0"
              max="59"
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

        {/* Divider + popout */}
        <span className="w-px h-5 bg-border mx-0.5" />
        <button onClick={openPopout} className="btn-ghost p-1" title="Pop out">
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
