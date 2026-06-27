import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Clock, Play, Pause, Square } from "lucide-react";
import { logsApi } from "@/lib/api";
import { SUBJECTS, ACTIVITIES, TID } from "@/lib/constants";
import { todayISO, fmtDate, fmtDuration, isoAdd } from "@/lib/dateUtils";
import Modal from "@/components/Modal";
import HelpButton from "@/components/HelpButton";
import { HELP_CONTENT } from "@/lib/helpContent";

const emptyForm = {
  date: todayISO(), activity: "Practice", subject: "OS", topic: "",
  duration_min: 30, questions_attempted: 0, questions_correct: 0, questions_wrong: 0, remarks: "",
};

// ============== Stopwatch hook ==============
function useStopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 250);
    return () => clearInterval(tickRef.current);
  }, [running]);

  const start = () => {
    startedAtRef.current = Date.now() - elapsedMs;
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => { setRunning(false); setElapsedMs(0); startedAtRef.current = null; };
  const minutes = Math.floor(elapsedMs / 60000);

  return { running, elapsedMs, minutes, start, pause, reset };
}

function fmtTimer(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Log() {
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState("daily"); // daily, weekly, monthly
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Stopwatch state shared with the modal
  const sw = useStopwatch();
  const [swSubject, setSwSubject] = useState("OS");
  const [swActivity, setSwActivity] = useState("Reading");
  const [swTopic, setSwTopic] = useState("");
  const [swJournal, setSwJournal] = useState("");

  const load = async () => {
    let start;
    if (view === "daily") start = todayISO();
    else if (view === "weekly") start = isoAdd(todayISO(), -7);
    else start = isoAdd(todayISO(), -30);
    const res = await logsApi.list({ start });
    setLogs(res.items || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [view]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag) || e.target?.isContentEditable) return;
      if (e.key === "n" || e.key === "N") { setOpen(true); }
      else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        sw.running ? sw.pause() : sw.start();
      } else if (e.key === "r" || e.key === "R") {
        sw.reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [sw.running]);

  const submit = async () => {
    await logsApi.create({ ...form, duration_min: Number(form.duration_min) });
    setOpen(false);
    setForm(emptyForm);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete log?")) return;
    await logsApi.remove(id);
    load();
  };

  const saveStopwatch = async () => {
    if (sw.minutes < 1) {
      alert("Stopwatch needs at least 1 minute to save.");
      return;
    }
    await logsApi.create({
      date: todayISO(),
      activity: swActivity,
      subject: swSubject,
      topic: swTopic,
      duration_min: sw.minutes,
      remarks: swJournal || "(stopwatch session)",
    });
    sw.reset();
    setSwTopic("");
    setSwJournal("");
    load();
  };

  const byDate = logs.reduce((acc, l) => {
    (acc[l.date] = acc[l.date] || []).push(l);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort().reverse();

  const totalMin = logs.reduce((s, l) => s + (l.duration_min || 0), 0);
  const totalQs = logs.reduce((s, l) => s + (l.questions_attempted || 0), 0);
  const totalCorrect = logs.reduce((s, l) => s + (l.questions_correct || 0), 0);
  const activeSubjects = new Set(logs.map((l) => l.subject).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl font-semibold">Log</h1>
            <p className="text-xs text-[hsl(var(--fg-muted))]">Auto-logged from practice & timeline. Manual entries take 10 seconds.</p>
          </div>
          <HelpButton moduleKey="log" title={HELP_CONTENT.log.title} sections={HELP_CONTENT.log.sections} />
        </div>
        <div className="flex items-center gap-2">
          <div className="card-1 p-0.5 flex items-center text-xs">
            {["daily", "weekly", "monthly"].map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded ${view === v ? "bg-[hsl(var(--bg-elev-2))] text-[hsl(var(--fg))]" : "text-[hsl(var(--fg-muted))]"}`}>
                {v}
              </button>
            ))}
          </div>
          <button data-testid={TID.logNewBtn} onClick={() => setOpen(true)} className="btn btn-primary"><Plus className="w-3.5 h-3.5" /> Log session</button>
        </div>
      </div>

      {/* Stopwatch + journal */}
      <div className="card-2 p-4 sm:p-5" data-testid="log-stopwatch">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="label-x">Live session stopwatch</div>
          <div className="text-[10px] text-[hsl(var(--fg-subtle))] uppercase tracking-[0.18em] hidden sm:block">
            Space = start/pause · R = reset · N = new log
          </div>
        </div>
        <div className="grid lg:grid-cols-[auto_1fr] gap-4 lg:gap-6 items-start">
          <div className="flex flex-col items-center lg:items-start">
            <div data-testid="stopwatch-display" className="mono font-semibold tabular-nums text-5xl sm:text-6xl tracking-tight text-[hsl(var(--accent))]">
              {fmtTimer(sw.elapsedMs)}
            </div>
            <div className="text-[11px] text-[hsl(var(--fg-muted))] mt-1">
              {sw.minutes} min logged · {sw.running ? "Running" : sw.elapsedMs > 0 ? "Paused" : "Idle"}
            </div>
            <div className="mt-3 flex items-center gap-2">
              {!sw.running ? (
                <button data-testid="stopwatch-start" onClick={sw.start} className="btn btn-primary">
                  <Play className="w-3.5 h-3.5" /> {sw.elapsedMs > 0 ? "Resume" : "Start"}
                </button>
              ) : (
                <button data-testid="stopwatch-pause" onClick={sw.pause} className="btn">
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
              )}
              <button data-testid="stopwatch-reset" onClick={sw.reset} className="btn" disabled={sw.elapsedMs === 0 && !sw.running}>
                <Square className="w-3.5 h-3.5" /> Reset
              </button>
              <button data-testid="stopwatch-save" onClick={saveStopwatch} className="btn" disabled={sw.minutes < 1}>
                Save to log
              </button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label-x">Subject</label>
              <select value={swSubject} onChange={(e) => setSwSubject(e.target.value)} className="input mt-1">
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label-x">Activity</label>
              <select value={swActivity} onChange={(e) => setSwActivity(e.target.value)} className="input mt-1">
                {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label-x">Topic</label>
              <input value={swTopic} onChange={(e) => setSwTopic(e.target.value)} className="input mt-1" placeholder="e.g. Trees, Caches…" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-x">Journal note <span className="lowercase text-[hsl(var(--fg-subtle))]">(what was hard / what clicked / what to revisit)</span></label>
              <textarea
                data-testid="log-journal"
                value={swJournal}
                onChange={(e) => setSwJournal(e.target.value)}
                rows={2}
                className="input mt-1 min-h-[60px]"
                placeholder="Short reflection — one or two lines."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Session summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" data-testid="log-summary">
        <SumCard label="Total time" value={fmtDuration(totalMin)} />
        <SumCard label="Sessions" value={logs.length} />
        <SumCard label="Questions" value={totalQs} />
        <SumCard label="Accuracy" value={totalQs ? `${Math.round(totalCorrect / totalQs * 100)}%` : "—"} />
      </div>

      {dates.length === 0 ? (
        <div className="card-2 p-12 text-center">
          <p className="font-semibold mb-1">No logs in this period.</p>
          <p className="text-xs text-[hsl(var(--fg-muted))]">Practice or add a Timeline entry — it auto-logs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dates.map((d) => (
            <div key={d} className="card-2 p-3">
              <div className="text-xs label-x mb-2">{fmtDate(d)}</div>
              <div className="space-y-1 overflow-x-auto">
                {byDate[d].map((l) => (
                  <div key={l.id} className="grid grid-cols-[80px_70px_1fr_80px_60px_40px] items-center gap-2 px-2 py-1.5 rounded row-hover text-sm min-w-[560px]">
                    <span className="chip">{l.activity}</span>
                    <span className="chip mono">{l.subject}</span>
                    <span className="text-[hsl(var(--fg-muted))] truncate" title={l.remarks}>{l.topic || l.remarks || "—"}</span>
                    <span className="mono text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDuration(l.duration_min)}</span>
                    <span className="mono text-xs text-[hsl(var(--fg-muted))]">{l.questions_attempted ? `${l.questions_correct}/${l.questions_attempted}` : "—"}</span>
                    <button onClick={() => remove(l.id)} className="btn-ghost p-1 text-[hsl(var(--danger))]"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-[hsl(var(--fg-subtle))] uppercase tracking-[0.18em] text-center">
        {activeSubjects} active subjects in this period
      </p>

      <Modal open={open} onClose={() => setOpen(false)} title="Log a study session" size="md" data-testid={TID.logForm}
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn">Cancel</button>
            <button data-testid={TID.logFormSave} onClick={submit} className="btn btn-primary">Save log</button>
          </>
        }>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-x">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input mt-1" />
            </div>
            <div>
              <label className="label-x">Duration (min)</label>
              <input data-testid={TID.logFormDuration} type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} className="input mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-x">Activity</label>
              <select data-testid={TID.logFormActivity} value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} className="input mt-1">
                {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label-x">Subject</label>
              <select data-testid={TID.logFormSubject} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input mt-1">
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label-x">Topic</label>
            <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="input mt-1" placeholder="e.g. Trees" />
          </div>
          {form.activity === "Practice" && (
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label-x">Attempted</label><input type="number" value={form.questions_attempted} onChange={(e) => setForm({ ...form, questions_attempted: Number(e.target.value) })} className="input mt-1" /></div>
              <div><label className="label-x">Correct</label><input type="number" value={form.questions_correct} onChange={(e) => setForm({ ...form, questions_correct: Number(e.target.value) })} className="input mt-1" /></div>
              <div><label className="label-x">Wrong</label><input type="number" value={form.questions_wrong} onChange={(e) => setForm({ ...form, questions_wrong: Number(e.target.value) })} className="input mt-1" /></div>
            </div>
          )}
          <div>
            <label className="label-x">Remarks / Journal</label>
            <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="input mt-1 min-h-[60px]" placeholder="One or two lines — what was hard, what clicked, what to revisit." />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SumCard({ label, value }) {
  return (
    <div className="card-2 p-4">
      <div className="label-x">{label}</div>
      <div className="text-2xl font-semibold mono mt-1">{value}</div>
    </div>
  );
}
