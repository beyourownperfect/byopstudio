import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Clock, ChevronDown, CheckCircle, X as XIcon } from "lucide-react";
import { logsApi, subjectCompletionApi } from "@/lib/api";
import { SUBJECTS, ACTIVITIES, TID } from "@/lib/constants";
import { todayISO, fmtDate, fmtDuration, isoAdd } from "@/lib/dateUtils";
import Modal from "@/components/Modal";
import HelpButton from "@/components/HelpButton";
import LectureTable from "@/components/LectureTable";
import { HELP_CONTENT } from "@/lib/helpContent";

const emptyForm = {
  date: todayISO(), activity: "Practice", subject: "OS", topic: "",
  duration_min: 30, questions_attempted: 0, questions_correct: 0, questions_wrong: 0, remarks: "",
};

function parseTimerState() {
  try {
    const raw = sessionStorage.getItem("byop.timer");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getTimerStatusText(state) {
  if (!state || !state.running) return null;
  const mode = state.mode === "countdown" ? "Countdown" : "Stopwatch";
  const mins = state.mode === "countdown"
    ? Math.round((state.totalSec - state.elapsed) / 60)
    : Math.round(state.elapsed / 60);
  return `${mode} running${mins > 0 ? ` · ${mins}m elapsed` : ""}`;
}

export default function Log() {
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState("daily");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expandedDates, setExpandedDates] = useState({});

  const [timerState, setTimerState] = useState(() => parseTimerState());

  const [completions, setCompletions] = useState([]);
  const [completionExpanded, setCompletionExpanded] = useState(false);
  const [completionSubject, setCompletionSubject] = useState("ALL");

  // Inline edit state for daily log rows
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingLogField, setEditingLogField] = useState(null);
  const [editingLogVal, setEditingLogVal] = useState("");
  const editInputRef = useRef(null);

  const load = async () => {
    let start;
    if (view === "daily") start = todayISO();
    else if (view === "weekly") start = isoAdd(todayISO(), -7);
    else start = isoAdd(todayISO(), -30);
    const res = await logsApi.list({ start });
    setLogs(res.items || []);
  };

  const loadCompletions = async (subj) => {
    const res = await subjectCompletionApi.list(subj ? { subject: subj } : {});
    setCompletions(res.items || []);
  };

  useEffect(() => { load(); }, [view]); // eslint-disable-line
  useEffect(() => {
    const poll = setInterval(() => setTimerState(parseTimerState()), 1000);
    return () => clearInterval(poll);
  }, []);
  useEffect(() => {
    if (completionExpanded && completions.length === 0) loadCompletions();
  }, [completionExpanded]); // eslint-disable-line

  const toggleCompletion = async (item, key) => {
    const payload = { subject: item.subject, topic: item.topic, [key]: !item[key] };
    await subjectCompletionApi.upsert(payload);
    loadCompletions(completionSubject !== "ALL" ? completionSubject : null);
  };

  const saveNoteExplain = async (item, val) => {
    await subjectCompletionApi.upsert({ subject: item.subject, topic: item.topic, can_explain_without_notes: val });
    loadCompletions(completionSubject !== "ALL" ? completionSubject : null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag) || e.target?.isContentEditable) return;
      if (e.key === "n" || e.key === "N") { setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  // Inline edit for daily log rows
  const startLogEdit = (log, field) => {
    setEditingLogId(log.id);
    setEditingLogField(field);
    if (field === "duration_min") {
      setEditingLogVal(String(log.duration_min || ""));
    } else if (field === "questions") {
      setEditingLogVal(log.questions_attempted ? `${log.questions_correct || 0}/${log.questions_attempted}` : "");
    } else {
      setEditingLogVal(String(log[field] ?? ""));
    }
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const commitLogEdit = async (log) => {
    if (!editingLogId) return;
    const field = editingLogField;
    let value = editingLogVal.trim();
    if (value === String(log[field] ?? "")) { setEditingLogId(null); return; }

    const payload = {};
    if (field === "duration_min") {
      payload.duration_min = parseInt(value, 10) || 0;
    } else if (field === "questions") {
      // Parse "correct/total" format
      const parts = value.split("/").map((s) => parseInt(s.trim(), 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] >= parts[0]) {
        payload.questions_correct = parts[0];
        payload.questions_attempted = parts[1];
      } else {
        payload.questions_attempted = parseInt(value, 10) || 0;
        payload.questions_correct = 0;
      }
    } else {
      payload[field] = value;
    }
    setEditingLogId(null);
    setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, ...payload } : l)));
    try { await logsApi.update(log.id, payload); } catch { load(); }
  };

  const handleLogEditKey = (e, log) => {
    if (e.key === "Enter") { e.preventDefault(); commitLogEdit(log); }
    if (e.key === "Escape") setEditingLogId(null);
  };

  const byDate = logs.reduce((acc, l) => { (acc[l.date] = acc[l.date] || []).push(l); return acc; }, {});
  const dates = Object.keys(byDate).sort().reverse();
  const datesKey = dates.join("|");

  useEffect(() => {
    const dateList = datesKey ? datesKey.split("|") : [];
    setExpandedDates((prev) => {
      const next = { ...prev };
      dateList.forEach((date, index) => { if (!(date in next)) next[date] = index === 0; });
      return next;
    });
  }, [datesKey]);

  const toggleDate = (date) => setExpandedDates((prev) => ({ ...prev, [date]: !prev[date] }));

  const totalMin = logs.reduce((s, l) => s + (l.duration_min || 0), 0);
  const totalQs = logs.reduce((s, l) => s + (l.questions_attempted || 0), 0);
  const totalCorrect = logs.reduce((s, l) => s + (l.questions_correct || 0), 0);
  const activeSubjects = new Set(logs.map((l) => l.subject).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-2 px-5 py-4 flex items-end justify-between flex-wrap gap-3">
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
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded transition-colors ${view === v ? "bg-[hsl(var(--bg-elev-2))] text-[hsl(var(--fg))]" : "text-[hsl(var(--fg-muted))]"}`}>
                {v}
              </button>
            ))}
          </div>
          <button data-testid={TID.logNewBtn} onClick={() => setOpen(true)} className="btn btn-primary"><Plus className="w-3.5 h-3.5" /> Log session</button>
        </div>
      </div>

      {/* Live timer status — bridged from PULSE */}
      <div className="card-2 p-3 flex items-center justify-between flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Clock className="w-4 h-4 text-[hsl(var(--accent))] shrink-0" />
          <span className="text-[hsl(var(--fg-muted))] truncate">
            {getTimerStatusText(timerState) || "Study timer lives on"}
          </span>
        </div>
        <Link to="/pulse" className="text-[hsl(var(--accent))] font-medium hover:underline whitespace-nowrap text-xs">
          Pulse &rarr;
        </Link>
      </div>

      {/* Session summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" data-testid="log-summary">
        <SumCard label="Total time" value={fmtDuration(totalMin)} />
        <SumCard label="Sessions" value={logs.length} />
        <SumCard label="Questions" value={totalQs} />
        <SumCard label="Accuracy" value={totalQs ? `${Math.round(totalCorrect / totalQs * 100)}%` : "—"} />
      </div>

      {/* ===== Lecture Progress ===== */}
      <LectureTable />

      {/* ===== Subject Completion (collapsible, tabular) ===== */}
      <div className="card-2 overflow-hidden">
        <button type="button" onClick={() => setCompletionExpanded(!completionExpanded)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[hsl(var(--bg-elev))]/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" />
            <span className="font-semibold text-sm">Subject Completion</span>
            <HelpButton moduleKey="subject-completion" title="Subject Completion" sections={HELP_CONTENT["subject-completion"].sections} />
          </div>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 text-[hsl(var(--fg-muted))] ${completionExpanded ? "rotate-180" : ""}`} />
        </button>
        {completionExpanded && (
          <div className="border-t-2 border-border">
            <div className="px-4 py-2.5">
              <select value={completionSubject} onChange={(e) => { setCompletionSubject(e.target.value); loadCompletions(e.target.value !== "ALL" ? e.target.value : null); }} className="input max-w-[160px] text-xs">
                <option value="ALL">All subjects</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <CompletionTable
              completions={completions}
              subjectFilter={completionSubject}
              onToggle={toggleCompletion}
              onExplain={saveNoteExplain}
              subjOptions={SUBJECTS}
              onCreateCompletion={async (subj) => {
                await subjectCompletionApi.upsert({ subject: subj, topic: "" });
                loadCompletions(completionSubject !== "ALL" ? completionSubject : null);
              }}
            />
          </div>
        )}
      </div>

      {/* ===== Daily Study Logs ===== */}
      {dates.length === 0 ? (
        <div className="card-2 p-12 text-center">
          <p className="font-semibold mb-1">No logs in this period.</p>
          <p className="text-xs text-[hsl(var(--fg-muted))]">Practice or add a Timeline entry — it auto-logs.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dates.map((d) => {
            const isExpanded = expandedDates[d] ?? true;
            return (
              <div key={d} className="card-2">
                <button type="button" onClick={() => toggleDate(d)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 rounded-lg text-left hover:bg-[hsl(var(--bg-elev))]/60 transition-colors"
                  aria-expanded={isExpanded}
                >
                  <div className="text-xs label-x">{fmtDate(d)}</div>
                  <div className="flex items-center gap-2 text-[11px] text-[hsl(var(--fg-muted))]">
                    <span>{byDate[d].length} entries</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-border px-3 py-2 overflow-x-auto">
                    {byDate[d].map((l) => {
                      const isEditing = editingLogId === l.id;
                      return (
                      <div key={l.id}
                        className="flex items-center gap-2 sm:gap-3 py-1.5 px-2 rounded row-hover text-sm min-w-[580px]"
                      >
                        <span className="chip shrink-0 text-[11px]">{l.activity}</span>
                        <span className="chip mono shrink-0 text-[11px]">{l.subject}</span>
                        {isEditing && editingLogField === "remarks" ? (
                          <input ref={editInputRef} autoFocus value={editingLogVal} onChange={(e) => setEditingLogVal(e.target.value)} onBlur={() => commitLogEdit(l)} onKeyDown={(e) => handleLogEditKey(e, l)} className="input h-6 text-[11px] flex-1 min-w-0" />
                        ) : (
                          <span onClick={() => startLogEdit(l, "remarks")} className="text-[12px] text-[hsl(var(--fg-muted))] truncate flex-1 min-w-0 cursor-pointer hover:text-[hsl(var(--accent))] transition-colors" title={l.remarks || "Click to edit remarks"}>{l.remarks || l.topic || "—"}</span>
                        )}
                        {isEditing && editingLogField === "duration_min" ? (
                          <input ref={editInputRef} autoFocus value={editingLogVal} onChange={(e) => setEditingLogVal(e.target.value)} onBlur={() => commitLogEdit(l)} onKeyDown={(e) => handleLogEditKey(e, l)} className="input h-6 text-[11px] w-16 mono text-center" />
                        ) : (
                          <span onClick={() => startLogEdit(l, "duration_min")} className="mono text-[11px] flex items-center gap-1 shrink-0 w-[70px] cursor-pointer hover:text-[hsl(var(--accent))] transition-colors" title="Click to edit duration"><Clock className="w-3 h-3 text-[hsl(var(--fg-subtle))]" />{fmtDuration(l.duration_min)}</span>
                        )}
                        {isEditing && editingLogField === "questions" ? (
                          <span className="mono text-[11px] shrink-0 w-[60px] text-right flex items-center gap-1">
                            <input ref={editInputRef} autoFocus value={editingLogVal} onChange={(e) => setEditingLogVal(e.target.value)} onBlur={() => commitLogEdit(l)} onKeyDown={(e) => handleLogEditKey(e, l)} className="input h-6 text-[11px] w-16 mono text-center" placeholder="12/30" />
                          </span>
                        ) : (
                          <span onClick={() => startLogEdit(l, "questions")} className="mono text-[11px] text-[hsl(var(--fg-muted))] shrink-0 w-[60px] text-right cursor-pointer hover:text-[hsl(var(--accent))] transition-colors" title="Click to edit (format: correct/total)">
                            {l.questions_attempted ? `${l.questions_correct || 0}/${l.questions_attempted}` : "—"}
                          </span>
                        )}
                        <button type="button" onClick={() => remove(l.id)} className="btn-ghost p-1 text-[hsl(var(--danger))] shrink-0"><Trash2 className="w-3 h-3" /></button>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-[hsl(var(--fg-subtle))] uppercase tracking-[0.18em] text-center">
        {activeSubjects} active subjects in this period
      </p>

      {/* ==== Log session modal ==== */}
      <Modal open={open} onClose={() => setOpen(false)} title="Log a study session" size="md" data-testid={TID.logForm}
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn">Cancel</button>
            <button data-testid={TID.logFormSave} onClick={submit} className="btn btn-primary">Save log</button>
          </>
        }>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-x">Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input mt-1" /></div>
            <div><label className="label-x">Duration (min)</label><input data-testid={TID.logFormDuration} type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} className="input mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-x">Activity</label><select data-testid={TID.logFormActivity} value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} className="input mt-1">{ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
            <div><label className="label-x">Subject</label><select data-testid={TID.logFormSubject} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input mt-1">{SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div><label className="label-x">Topic</label><input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="input mt-1" placeholder="e.g. Trees" /></div>
          {form.activity === "Practice" && (
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label-x">Attempted</label><input type="number" value={form.questions_attempted} onChange={(e) => setForm({ ...form, questions_attempted: Number(e.target.value) })} className="input mt-1" /></div>
              <div><label className="label-x">Correct</label><input type="number" value={form.questions_correct} onChange={(e) => setForm({ ...form, questions_correct: Number(e.target.value) })} className="input mt-1" /></div>
              <div><label className="label-x">Wrong</label><input type="number" value={form.questions_wrong} onChange={(e) => setForm({ ...form, questions_wrong: Number(e.target.value) })} className="input mt-1" /></div>
            </div>
          )}
          <div><label className="label-x">Remarks / Journal</label><textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="input mt-1 min-h-[60px]" placeholder="One or two lines — what was hard, what clicked, what to revisit." /></div>
        </div>
      </Modal>
    </div>
  );
}

/* ── Sub-components ── */

function SumCard({ label, value }) {
  return (
    <div className="card-2 p-4">
      <div className="label-x">{label}</div>
      <div className="text-2xl font-semibold mono mt-1">{value}</div>
    </div>
  );
}

/* ── Subject Completion Table (tabular checklist) ── */

const COMPLETION_MILESTONES = [
  { key: "lectures_completed", label: "Lectures", core: true },
  { key: "notes_created", label: "Notes", core: true },
  { key: "flashcards_created", label: "Flashcards", core: true },
  { key: "pyqs_completed", label: "PYQs", core: true },
  { key: "revision_completed", label: "Revision", core: true },
  { key: "subject_test_completed", label: "Sub-Test", core: true },
  { key: "dpp_completed", label: "DPP", core: false },
  { key: "weekly_quiz_completed", label: "Quiz", core: false },
];

function CompletionTable({ completions, subjectFilter, onToggle, onExplain, subjOptions, onCreateCompletion }) {
  const existingSubjects = new Set(completions.map((c) => c.subject));

  if (completions.length === 0) {
    return (
      <div className="space-y-3 px-4 py-4">
        <p className="text-xs text-[hsl(var(--fg-muted))]">No completion checklists yet. Create one for a subject to start tracking.</p>
        <div className="flex flex-wrap gap-2">
          {subjOptions.map((s) => (
            <button key={s} onClick={() => onCreateCompletion(s)} className="btn text-xs"><Plus className="w-3 h-3" /> {s}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-1.5 text-[10px] uppercase tracking-wider text-[hsl(var(--fg-subtle))] border-b border-border min-w-[900px]">
        <span className="w-10 shrink-0">Subj</span>
        {COMPLETION_MILESTONES.map((m) => (
          <span key={m.key} className="w-[60px] text-center shrink-0">{m.label}</span>
        ))}
        <span className="w-[70px] text-center shrink-0">Explain</span>
        <span className="w-14 text-right shrink-0">Core</span>
        <div className="flex-1 min-w-[60px] ml-2" />
      </div>

      {completions.map((item) => {
        const calc = item._calc || {};
        const corePct = calc.core_percent || 0;
        const barColor = corePct >= 80 ? "bg-[hsl(var(--success))]" : corePct >= 40 ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--danger))]";
        return (
          <div key={item.id} className="flex items-center gap-2 px-4 py-1.5 hover:bg-[hsl(var(--bg-elev))]/60 transition-colors text-[12px] border-b border-border/60 last:border-b-0 min-w-[900px]">
            <span className="chip chip-accent text-[11px] w-10 shrink-0">{item.subject}</span>
            {COMPLETION_MILESTONES.map((m) => (
              <button
                key={m.key}
                onClick={() => onToggle(item, m.key)}
                className={`w-[60px] h-6 shrink-0 rounded border transition-colors flex items-center justify-center text-[11px] ${item[m.key]
                  ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                  : "border-border text-[hsl(var(--fg-subtle))] hover:border-[hsl(var(--accent))]/30 hover:text-[hsl(var(--fg-muted))]"
                }`}
                title={m.label}
              >
                {item[m.key] ? "✓" : m.core ? "—" : "·"}
              </button>
            ))}
            <button
              onClick={() => onExplain(item, !item.can_explain_without_notes)}
              className={`w-[70px] h-6 shrink-0 rounded border transition-colors flex items-center justify-center text-[11px] ${item.can_explain_without_notes
                ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] font-medium"
                : "border-border text-[hsl(var(--fg-subtle))] hover:border-[hsl(var(--accent))]/30 hover:text-[hsl(var(--fg-muted))]"
              }`}
              title="Can explain without notes"
            >
              {item.can_explain_without_notes ? "Yes" : "—"}
            </button>
            <span className="w-14 text-right mono text-[11px] text-[hsl(var(--fg-muted))] shrink-0">{corePct}%</span>
            <div className="flex-1 h-1.5 bg-[hsl(var(--bg-elev-2))] rounded-full overflow-hidden ml-2 min-w-[60px]">
              <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${corePct}%` }} />
            </div>
          </div>
        );
      })}

      {subjectFilter === "ALL" && subjOptions.filter((s) => !existingSubjects.has(s)).length > 0 && (
        <div className="px-4 py-3 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-[hsl(var(--fg-subtle))] mr-1">Add:</span>
          {subjOptions.filter((s) => !existingSubjects.has(s)).map((s) => (
            <button key={s} onClick={() => onCreateCompletion(s)} className="text-[11px] px-2 py-0.5 rounded border border-border hover:border-[hsl(var(--accent))] transition-colors text-[hsl(var(--fg-muted))] hover:text-[hsl(var(--fg))]">{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
