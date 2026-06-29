import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Clock, Play, Pause, Square, ChevronDown, BookOpen, CheckCircle, ListChecks, Edit3, X as XIcon } from "lucide-react";
import { logsApi, lecturesApi, subjectCompletionApi } from "@/lib/api";
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
  const [view, setView] = useState("daily");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expandedDates, setExpandedDates] = useState({});

  const sw = useStopwatch();
  const [swSubject, setSwSubject] = useState("OS");
  const [swActivity, setSwActivity] = useState("Reading");
  const [swTopic, setSwTopic] = useState("");
  const [swJournal, setSwJournal] = useState("");

  const [lectures, setLectures] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [lectureExpanded, setLectureExpanded] = useState(false);
  const [completionExpanded, setCompletionExpanded] = useState(false);
  const [lectureFormOpen, setLectureFormOpen] = useState(false);
  const [lectureEdit, setLectureEdit] = useState(null);
  const [lectureViewSubject, setLectureViewSubject] = useState("ALL");
  const [completionSubject, setCompletionSubject] = useState("ALL");
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const emptyLecture = { subject: "OS", topic: "", lecture_name: "", lecture_number: "", duration_min: 0, completion_percent: 0, notes_done: false, revision_done: false };
  const [lectureForm, setLectureForm] = useState(emptyLecture);

  const load = async () => {
    let start;
    if (view === "daily") start = todayISO();
    else if (view === "weekly") start = isoAdd(todayISO(), -7);
    else start = isoAdd(todayISO(), -30);
    const res = await logsApi.list({ start });
    setLogs(res.items || []);
  };

  const loadLectures = async () => {
    const res = await lecturesApi.list();
    setLectures(res.items || []);
  };

  const loadCompletions = async (subj) => {
    const res = await subjectCompletionApi.list(subj ? { subject: subj } : {});
    setCompletions(res.items || []);
  };

  useEffect(() => { load(); }, [view]); // eslint-disable-line
  useEffect(() => {
    if (lectureExpanded && lectures.length === 0) loadLectures();
  }, [lectureExpanded]); // eslint-disable-line
  useEffect(() => {
    if (completionExpanded && completions.length === 0) loadCompletions();
  }, [completionExpanded]); // eslint-disable-line

  const openLectureForm = (l) => {
    if (l) { setLectureEdit(l); setLectureForm({ ...l }); }
    else { setLectureEdit(null); setLectureForm(emptyLecture); }
    setLectureFormOpen(true);
  };

  const setLec = (k, v) => setLectureForm((f) => ({ ...f, [k]: v }));

  const saveLecture = async () => {
    const payload = { ...lectureForm, completion_percent: Number(lectureForm.completion_percent), duration_min: Number(lectureForm.duration_min) };
    if (lectureEdit) await lecturesApi.update(lectureEdit.id, payload);
    else await lecturesApi.create(payload);
    setLectureFormOpen(false);
    setLectureEdit(null);
    loadLectures();
  };

  const deleteLecture = async (id) => {
    if (!window.confirm("Delete this lecture?")) return;
    await lecturesApi.remove(id);
    loadLectures();
  };

  const toggleLectureField = async (l, field) => {
    await lecturesApi.update(l.id, { [field]: !l[field] });
    loadLectures();
  };

  const toggleCompletion = async (item, key) => {
    const payload = { subject: item.subject, topic: item.topic, [key]: !item[key] };
    await subjectCompletionApi.upsert(payload);
    loadCompletions(completionSubject !== "ALL" ? completionSubject : null);
  };

  const saveNoteExplain = async (item, val) => {
    await subjectCompletionApi.upsert({ subject: item.subject, topic: item.topic, can_explain_without_notes: val });
    loadCompletions(completionSubject !== "ALL" ? completionSubject : null);
  };

  const toggleSubjectExpand = (subj) => {
    setExpandedSubjects((prev) => ({ ...prev, [subj]: !prev[subj] }));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag) || e.target?.isContentEditable) return;
      if (e.key === "n" || e.key === "N") { setOpen(true); }
      else if (e.key === " " || e.code === "Space") { e.preventDefault(); sw.running ? sw.pause() : sw.start(); }
      else if (e.key === "r" || e.key === "R") { sw.reset(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sw]);

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
    if (sw.minutes < 1) { alert("Stopwatch needs at least 1 minute to save."); return; }
    await logsApi.create({
      date: todayISO(), activity: swActivity, subject: swSubject, topic: swTopic,
      duration_min: sw.minutes, remarks: swJournal || "(stopwatch session)",
    });
    sw.reset();
    setSwTopic("");
    setSwJournal("");
    load();
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
    <div className="space-y-4">
      {/* Header */}
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
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded transition-colors ${view === v ? "bg-[hsl(var(--bg-elev-2))] text-[hsl(var(--fg))]" : "text-[hsl(var(--fg-muted))]"}`}>
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
                <button data-testid="stopwatch-start" onClick={sw.start} className="btn btn-primary"><Play className="w-3.5 h-3.5" /> {sw.elapsedMs > 0 ? "Resume" : "Start"}</button>
              ) : (
                <button data-testid="stopwatch-pause" onClick={sw.pause} className="btn"><Pause className="w-3.5 h-3.5" /> Pause</button>
              )}
              <button data-testid="stopwatch-reset" onClick={sw.reset} className="btn" disabled={sw.elapsedMs === 0 && !sw.running}><Square className="w-3.5 h-3.5" /> Reset</button>
              <button data-testid="stopwatch-save" onClick={saveStopwatch} className="btn" disabled={sw.minutes < 1}>Save to log</button>
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
              <textarea data-testid="log-journal" value={swJournal} onChange={(e) => setSwJournal(e.target.value)} rows={2} className="input mt-1 min-h-[60px]" placeholder="Short reflection — one or two lines." />
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

      {/* ===== Lecture Progress (collapsible, tabular) ===== */}
      <div className="card-2 overflow-hidden">
        <button type="button" onClick={() => setLectureExpanded(!lectureExpanded)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[hsl(var(--bg-elev))]/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[hsl(var(--accent))]" />
            <span className="font-semibold text-sm">Lecture Progress</span>
            <HelpButton moduleKey="lectures" title="Lecture Progress" sections={(HELP_CONTENT.lectures || {}).sections || [{ title: "Track lectures", body: "Log each lecture with subject, topic, name, number, duration, completion %, notes done, and revision done." }]} />
          </div>
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--fg-muted))]">
            <span>{lectures.length} lectures</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${lectureExpanded ? "rotate-180" : ""}`} />
          </div>
        </button>
        {lectureExpanded && (
          <div className="border-t-2 border-border">
            <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
              <select value={lectureViewSubject} onChange={(e) => setLectureViewSubject(e.target.value)} className="input max-w-[140px] text-xs">
                <option value="ALL">All subjects</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => openLectureForm(null)} className="btn btn-primary text-xs"><Plus className="w-3 h-3" /> New lecture</button>
            </div>

            {lectures.length === 0 ? (
              <p className="text-xs text-[hsl(var(--fg-muted))] py-6 text-center">No lectures logged yet.</p>
            ) : (
              <LectureTable
                lectures={lectures.filter((l) => lectureViewSubject === "ALL" || l.subject === lectureViewSubject)}
                expandedSubjects={expandedSubjects}
                onToggleSubject={toggleSubjectExpand}
                onEdit={openLectureForm}
                onDelete={deleteLecture}
                onToggleField={toggleLectureField}
              />
            )}
          </div>
        )}
      </div>

      {/* ===== Subject Completion (collapsible, tabular) ===== */}
      <div className="card-2 overflow-hidden">
        <button type="button" onClick={() => setCompletionExpanded(!completionExpanded)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[hsl(var(--bg-elev))]/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" />
            <span className="font-semibold text-sm">Subject Completion</span>
            <HelpButton moduleKey="subject-completion" title="Subject Completion" sections={(HELP_CONTENT["subject-completion"] || {}).sections || [{ title: "Checklist", body: "Configurable checklist for each subject. Toggle milestones as you progress." }]} />
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
                    {byDate[d].map((l) => (
                      <div key={l.id}
                        className="flex items-center gap-2 sm:gap-3 py-1.5 px-2 rounded row-hover text-sm min-w-[560px]"
                      >
                        <span className="chip shrink-0 text-[11px]">{l.activity}</span>
                        <span className="chip mono shrink-0 text-[11px]">{l.subject}</span>
                        <span className="text-[12px] text-[hsl(var(--fg-muted))] truncate flex-1 min-w-0" title={l.remarks}>{l.topic || l.remarks || "—"}</span>
                        <span className="mono text-[11px] flex items-center gap-1 shrink-0 w-[70px]"><Clock className="w-3 h-3 text-[hsl(var(--fg-subtle))]" />{fmtDuration(l.duration_min)}</span>
                        <span className="mono text-[11px] text-[hsl(var(--fg-muted))] shrink-0 w-[40px] text-right">{l.questions_attempted ? `${l.questions_correct}/${l.questions_attempted}` : "—"}</span>
                        <button type="button" onClick={() => remove(l.id)} className="btn-ghost p-1 text-[hsl(var(--danger))] shrink-0"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
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

      {/* ==== Lecture form modal ==== */}
      <Modal open={lectureFormOpen} onClose={() => setLectureFormOpen(false)} title={lectureEdit ? "Edit lecture" : "New lecture"} size="md"
        footer={
          <>
            <button onClick={() => setLectureFormOpen(false)} className="btn">Cancel</button>
            <button onClick={saveLecture} className="btn btn-primary">Save</button>
          </>
        }>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-x">Subject</label><select value={lectureForm.subject} onChange={(e) => setLec("subject", e.target.value)} className="input mt-1">{SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="label-x">Topic</label><input value={lectureForm.topic} onChange={(e) => setLec("topic", e.target.value)} className="input mt-1" placeholder="e.g. Trees" /></div>
          </div>
          <div><label className="label-x">Lecture name</label><input value={lectureForm.lecture_name} onChange={(e) => setLec("lecture_name", e.target.value)} className="input mt-1" placeholder="e.g. Binary Search Trees" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-x">Number (e.g. 12/42)</label><input value={lectureForm.lecture_number} onChange={(e) => setLec("lecture_number", e.target.value)} className="input mt-1" placeholder="12/42" /></div>
            <div><label className="label-x">Duration (min)</label><input type="number" value={lectureForm.duration_min} onChange={(e) => setLec("duration_min", e.target.value)} className="input mt-1" /></div>
          </div>
          <div><label className="label-x">Completion %</label><input type="number" min="0" max="100" value={lectureForm.completion_percent} onChange={(e) => setLec("completion_percent", e.target.value)} className="input mt-1" /></div>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={lectureForm.notes_done} onChange={(e) => setLec("notes_done", e.target.checked)} className="accent-[hsl(var(--accent))]" />Notes done</label>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={lectureForm.revision_done} onChange={(e) => setLec("revision_done", e.target.checked)} className="accent-[hsl(var(--accent))]" />Revision done</label>
          </div>
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

/* ── Lecture Table (tabular, grouped by Subject → Topic, collapsible) ── */

const LECTURE_COLUMNS = [
  { key: "lecture_name", label: "Name", flex: "2" },
  { key: "lecture_number", label: "#", flex: "0.6" },
  { key: "completion_percent", label: "Progress", flex: "1.2" },
  { key: "notes_done", label: "N", flex: "0.4" },
  { key: "revision_done", label: "R", flex: "0.4" },
  { key: "duration_min", label: "Duration", flex: "0.8" },
  { key: "actions", label: "", flex: "0.3" },
];

function LectureTable({ lectures, expandedSubjects, onToggleSubject, onEdit, onDelete, onToggleField }) {
  const grouped = {};
  for (const l of lectures) {
    const subj = l.subject || "?";
    if (!grouped[subj]) grouped[subj] = [];
    grouped[subj].push(l);
  }
  const subjectsSorted = Object.keys(grouped).sort();

  return (
    <div className="overflow-x-auto">
      {subjectsSorted.map((subj) => {
        const lecs = grouped[subj];
        const isExpanded = expandedSubjects[subj] !== false;
        const total = lecs.length;
        const done = lecs.filter((l) => l.completion_percent >= 100).length;
        const pct = total ? Math.round(done / total * 100) : 0;
        return (
          <div key={subj} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => onToggleSubject(subj)}
              className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-[hsl(var(--bg-elev))]/60 transition-colors"
            >
              <ChevronDown className={`h-3.5 w-3.5 text-[hsl(var(--fg-muted))] transition-transform duration-150 shrink-0 ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
              <span className="chip chip-accent text-[11px]">{subj}</span>
              <span className="text-[11px] text-[hsl(var(--fg-muted))]">{total} lecture{total !== 1 ? "s" : ""}</span>
              <div className="flex-1 max-w-[120px] h-1.5 bg-[hsl(var(--bg-elev-2))] rounded-full overflow-hidden">
                <div className="h-full bg-[hsl(var(--accent))] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] mono text-[hsl(var(--fg-muted))]">{pct}%</span>
            </button>
            {isExpanded && lecs.map((l) => (
              <div key={l.id}
                className="flex items-center gap-2 sm:gap-3 px-4 py-1.5 hover:bg-[hsl(var(--bg-elev))]/60 transition-colors text-[12px] group"
              >
                <span className="w-5 shrink-0" />
                <span className="text-[11px] text-[hsl(var(--fg-muted))] truncate max-w-[100px] hidden sm:inline">{l.topic || "General"}</span>
                <button onClick={() => onEdit(l)}
                  className="text-left truncate flex-[2] min-w-0 hover:text-[hsl(var(--accent))] transition-colors"
                >
                  {l.lecture_name || "Unnamed"}
                </button>
                <span className="text-[10px] text-[hsl(var(--fg-subtle))] flex-[0.6] text-right mono">{l.lecture_number || "—"}</span>
                <div className="flex-[1.2] flex items-center gap-1.5">
                  <div className="flex-1 h-1 bg-[hsl(var(--bg-elev-2))] rounded-full overflow-hidden max-w-[50px]">
                    <div className={`h-full rounded-full transition-all duration-300 ${l.completion_percent >= 100 ? "bg-[hsl(var(--success))]" : "bg-[hsl(var(--warning))]"}`} style={{ width: `${Math.min(100, l.completion_percent)}%` }} />
                  </div>
                  <span className="text-[10px] mono text-[hsl(var(--fg-muted))] w-6 text-right">{l.completion_percent}%</span>
                </div>
                <button onClick={() => onToggleField(l, "notes_done")}
                  className={`flex-[0.4] text-[10px] w-7 h-5 rounded border transition-colors flex items-center justify-center ${l.notes_done ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "border-border text-[hsl(var(--fg-subtle))] hover:border-[hsl(var(--accent))]"}`}
                  title="Notes"
                >{l.notes_done ? "✓" : "—"}</button>
                <button onClick={() => onToggleField(l, "revision_done")}
                  className={`flex-[0.4] text-[10px] w-7 h-5 rounded border transition-colors flex items-center justify-center ${l.revision_done ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "border-border text-[hsl(var(--fg-subtle))] hover:border-[hsl(var(--accent))]"}`}
                  title="Revision"
                >{l.revision_done ? "✓" : "—"}</button>
                <span className="text-[10px] mono text-[hsl(var(--fg-muted))] flex-[0.8] text-right">{l.duration_min ? fmtDuration(l.duration_min) : "—"}</span>
                <div className="flex-[0.3] flex justify-end">
                  <button onClick={() => onDelete(l.id)} className="btn-ghost p-0.5 text-[hsl(var(--danger))] opacity-0 group-hover:opacity-100 transition-opacity" title="Delete"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
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
