import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Clock, ChevronDown, CheckCircle, X as XIcon, FileText, Upload, Eye, FileQuestion } from "lucide-react";
import { logsApi, subjectCompletionApi, resourceUrl } from "@/lib/api";
import { SUBJECTS, SUBJECT_LABELS, ACTIVITIES, CATEGORIES, DEFAULT_CATEGORY, TID } from "@/lib/constants";
import { topicsForSubject, matchTopic, subjectColor } from "@/lib/gateSyllabus";
import { todayISO, fmtDate, fmtDuration, isoAdd } from "@/lib/dateUtils";
import Modal from "@/components/Modal";
import HelpButton from "@/components/HelpButton";
import LectureTable from "@/components/LectureTable";
import SubjectSelect from "@/components/SubjectSelect";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { HELP_CONTENT } from "@/lib/helpContent";

const emptyForm = {
  date: todayISO(), activity: "Practice", subject: "OS", topic: "", official_topic: "",
  duration_min: 30, questions_attempted: 0, questions_correct: 0, questions_wrong: 0, remarks: "",
  category: DEFAULT_CATEGORY,
};

function parseTimerState() {
  try {
    const raw = sessionStorage.getItem("byop.timer");
    return raw ? JSON.parse(raw) : null;
  } catch (err) { console.error("[Log] Failed to parse timer state:", err); return null; }
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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerIsPdf, setViewerIsPdf] = useState(false);
  const [viewerContent, setViewerContent] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("GATE CSE");

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
    const params = { start };
    if (categoryFilter !== "All") params.category = categoryFilter;
    const res = await logsApi.list(params);
    setLogs(res.items || []);
  };

  const loadCompletions = async (subj) => {
    const res = await subjectCompletionApi.list(subj ? { subject: subj } : {});
    setCompletions(res.items || []);
  };

  useEffect(() => { load(); }, [view, categoryFilter]); // eslint-disable-line
  useEffect(() => {
    const poll = setInterval(() => setTimerState(parseTimerState()), 1000);
    return () => clearInterval(poll);
  }, []);
  useEffect(() => {
    if (completionExpanded && completions.length === 0) loadCompletions();
  }, [completionExpanded]); // eslint-disable-line

  const handleUploadResource = async (scId, fileType, file) => {
    await subjectCompletionApi.uploadResource(scId, fileType, file);
    loadCompletions(completionSubject !== "ALL" ? completionSubject : null);
  };

  const handleRemoveResource = async (scId, fileType) => {
    await subjectCompletionApi.removeResource(scId, fileType);
    loadCompletions(completionSubject !== "ALL" ? completionSubject : null);
  };

  const handleViewResource = async (item, fileType) => {
    const fileKey = `${fileType}_file`;
    const filenameKey = `${fileType}_filename`;
    const filename = item[filenameKey] || item[fileKey] || "";
    const url = resourceUrl(item[fileKey]);
    const isPdf = filename.toLowerCase().endsWith(".pdf");
    setViewerTitle(`${fileType === "short_notes" ? "Short Notes" : "Traversal Questionnaire"} — ${item.subject}`);
    setViewerUrl(url);
    setViewerIsPdf(isPdf);
    if (!isPdf) {
      try {
        const res = await fetch(url);
        const text = await res.text();
        setViewerContent(text);
      } catch (err) {
        console.error("[Log] Failed to fetch resource content:", err);
        setViewerContent("");
      }
    } else {
      setViewerContent("");
    }
    setViewerOpen(true);
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
    const isGate = form.category === "GATE CSE";
    const payload = {
      ...form,
      duration_min: Number(form.duration_min),
      activity: isGate ? form.activity : "Reading",
      subject: isGate ? form.subject : "",
      topic: isGate ? form.topic : "",
      official_topic: isGate ? (form.official_topic || matchTopic(form.subject, form.topic) || "") : "",
      questions_attempted: isGate ? form.questions_attempted : 0,
      questions_correct: isGate ? form.questions_correct : 0,
      questions_wrong: isGate ? form.questions_wrong : 0,
    };
    try { localStorage.setItem("byop.studyCategory", form.category); } catch {}
    await logsApi.create(payload);
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
    try { await logsApi.update(log.id, payload); } catch (err) { console.error("[Log] Failed to update log:", err); load(); }
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

  const categoryBreakdown = logs.reduce((acc, l) => {
    const cat = l.category || "GATE CSE";
    acc[cat] = (acc[cat] || 0) + (l.duration_min || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-2 px-4 sm:px-5 py-3 sm:py-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-xl font-semibold">Log</h1>
              <p className="text-xs text-[hsl(var(--fg-muted))] hidden sm:block">Auto-logged from practice & timeline. Manual entries take 10 seconds.</p>
            </div>
            <HelpButton moduleKey="log" title={HELP_CONTENT.log.title} sections={HELP_CONTENT.log.sections} />
          </div>
          <button data-testid={TID.logNewBtn} onClick={() => {
            const c = localStorage.getItem("byop.studyCategory") || DEFAULT_CATEGORY;
            setForm({ ...emptyForm, category: c });
            setOpen(true);
          }} className="btn btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> Log session</button>
        </div>
        <div className="card-1 p-0.5 flex items-center gap-3 text-xs self-start">
          {["daily", "weekly", "monthly"].map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded transition-colors ${view === v ? "bg-[hsl(var(--bg-elev-2))] text-[hsl(var(--fg))]" : "text-[hsl(var(--fg-muted))]"}`}>
              {v}
            </button>
          ))}
          <span className="w-px h-4 bg-border" />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-transparent text-[11px] outline-none">
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
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

      {Object.keys(categoryBreakdown).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-[hsl(var(--fg-subtle))]">
          <span className="uppercase tracking-wider">By category:</span>
          {CATEGORIES.map((cat) => {
            const mins = categoryBreakdown[cat] || 0;
            if (!mins) return null;
            return (
              <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[hsl(var(--bg-elev-2))]">
                <span className="truncate max-w-[100px]">{cat}</span>
                <span className="mono text-[hsl(var(--fg-muted))]">{fmtDuration(mins)}</span>
              </span>
            );
          })}
        </div>
      )}

      {!categoryFilter || categoryFilter === "All" || categoryFilter === "GATE CSE" ? (
        <>
          <LectureTable />
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
              <select value={completionSubject} onChange={(e) => { setCompletionSubject(e.target.value); loadCompletions(e.target.value !== "ALL" ? e.target.value : null); }} className="input max-w-[200px] text-xs">
                <option value="ALL">All subjects</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s} — {SUBJECT_LABELS[s]}</option>)}
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
              onUploadResource={handleUploadResource}
              onRemoveResource={handleRemoveResource}
              onViewResource={handleViewResource}
            />
          </div>
        )}
      </div>
        </>
      ) : null}

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
                  <div className="border-t border-border px-2 sm:px-3 py-2 overflow-x-auto">
                    {byDate[d].map((l) => {
                      const isEditing = editingLogId === l.id;
                      return (
                      <div key={l.id}
                        className="flex items-center gap-1.5 sm:gap-3 py-1.5 px-1 sm:px-2 rounded row-hover text-xs sm:text-sm min-w-[480px] sm:min-w-[580px]"
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

      {/* ==== Resource viewer modal ==== */}
      {viewerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setViewerOpen(false)} />
          <div className="relative card-2 w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b-2 border-border shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {viewerIsPdf ? <FileText className="w-4 h-4 text-[hsl(var(--danger))] shrink-0" /> : <FileQuestion className="w-4 h-4 text-[hsl(var(--info))] shrink-0" />}
                <h3 className="font-semibold text-sm truncate">{viewerTitle}</h3>
              </div>
              <button onClick={() => setViewerOpen(false)} className="btn-ghost p-1.5 text-[hsl(var(--fg-muted))] hover:text-[hsl(var(--fg))]" title="Close (Esc)">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {viewerIsPdf ? (
                <iframe src={viewerUrl} className="w-full h-[70vh] rounded border border-border" title="PDF viewer" />
              ) : (
                <div className="markdown-body max-w-none">
                  {viewerContent ? <MarkdownRenderer>{viewerContent}</MarkdownRenderer> : <p className="text-[hsl(var(--fg-muted))] text-sm">Loading…</p>}
                </div>
              )}
            </div>
            <div className="border-t border-border px-5 py-2.5 flex items-center justify-end gap-2 shrink-0">
              <a href={viewerUrl} target="_blank" rel="noreferrer" className="btn text-xs">
                <Eye className="w-3 h-3" /> Open raw
              </a>
              <button onClick={() => setViewerOpen(false)} className="btn btn-primary text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

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
          {form.category === "GATE CSE" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label-x">Activity</label><select data-testid={TID.logFormActivity} value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} className="input mt-1">{ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
                <div><label className="label-x">Subject</label><SubjectSelect data-testid={TID.logFormSubject} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label-x">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input mt-1">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label-x">Topic</label><input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="input mt-1" placeholder="e.g. Trees" /></div>
              </div>
              {topicsForSubject(form.subject).length > 0 && (
                <div>
                  <label className="label-x">Syllabus Topic</label>
                  <select value={form.official_topic} onChange={(e) => setForm({ ...form, official_topic: e.target.value })} className="input mt-1">
                    <option value="">— None / Other —</option>
                    {topicsForSubject(form.subject).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
              )}
              {form.activity === "Practice" && (
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="label-x">Attempted</label><input type="number" value={form.questions_attempted} onChange={(e) => setForm({ ...form, questions_attempted: Number(e.target.value) })} className="input mt-1" /></div>
                  <div><label className="label-x">Correct</label><input type="number" value={form.questions_correct} onChange={(e) => setForm({ ...form, questions_correct: Number(e.target.value) })} className="input mt-1" /></div>
                  <div><label className="label-x">Wrong</label><input type="number" value={form.questions_wrong} onChange={(e) => setForm({ ...form, questions_wrong: Number(e.target.value) })} className="input mt-1" /></div>
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="label-x">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input mt-1">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
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

function CompletionTable({ completions, subjectFilter, onToggle, onExplain, subjOptions, onCreateCompletion, onUploadResource, onRemoveResource, onViewResource }) {
  const existingSubjects = new Set(completions.map((c) => c.subject));

  if (completions.length === 0) {
    return (
      <div className="space-y-3 px-4 py-4">
        <p className="text-xs text-[hsl(var(--fg-muted))]">No completion checklists yet. Create one for a subject to start tracking.</p>
        <div className="flex flex-wrap gap-2">
          {subjOptions.map((s) => (
            <button key={s} onClick={() => onCreateCompletion(s)} className="btn text-xs" title={SUBJECT_LABELS[s]}><Plus className="w-3 h-3" /> {s}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-1.5 text-[10px] uppercase tracking-wider text-[hsl(var(--fg-subtle))] border-b border-border min-w-[1050px]">
        <span className="w-10 shrink-0">Subj</span>
        {COMPLETION_MILESTONES.map((m) => (
          <span key={m.key} className="w-[60px] text-center shrink-0">{m.label}</span>
        ))}
        <span className="w-[70px] text-center shrink-0">Explain</span>
        <span className="w-14 text-right shrink-0">Core</span>
        <span className="w-[110px] shrink-0 text-center">Notes</span>
        <span className="w-[110px] shrink-0 text-center">Traversal</span>
      </div>

      {completions.map((item) => {
        const calc = item._calc || {};
        const corePct = calc.core_percent || 0;
        const barColor = corePct >= 80 ? "bg-[hsl(var(--success))]" : corePct >= 40 ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--danger))]";
        return (
          <div key={item.id} className="flex items-center gap-2 px-4 py-1.5 hover:bg-[hsl(var(--bg-elev))]/60 transition-colors text-[12px] border-b border-border/60 last:border-b-0 min-w-[1050px]">
            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded border text-[11px] font-semibold ${subjectColor(item.subject).bg} ${subjectColor(item.subject).text} ${subjectColor(item.subject).border}`}>{item.subject}</span>
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

            {/* Short Notes */}
            <InlineResource
              scId={item.id}
              fileType="short_notes"
              filename={item.short_notes_filename || item.short_notes_file || ""}
              hasFile={!!item.short_notes_file}
              item={item}
              onUpload={onUploadResource}
              onRemove={onRemoveResource}
              onView={(it) => onViewResource(it, "short_notes")}
            />

            {/* Traversal Questionnaire */}
            <InlineResource
              scId={item.id}
              fileType="traversal"
              filename={item.traversal_filename || item.traversal_file || ""}
              hasFile={!!item.traversal_file}
              item={item}
              onUpload={onUploadResource}
              onRemove={onRemoveResource}
              onView={(it) => onViewResource(it, "traversal")}
            />
          </div>
        );
      })}

      {subjectFilter === "ALL" && subjOptions.filter((s) => !existingSubjects.has(s)).length > 0 && (
        <div className="px-4 py-3 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-[hsl(var(--fg-subtle))] mr-1">Add:</span>
          {subjOptions.filter((s) => !existingSubjects.has(s)).map((s) => (
            <button key={s} onClick={() => onCreateCompletion(s)} className="text-[11px] px-2 py-0.5 rounded border border-border hover:border-[hsl(var(--accent))] transition-colors text-[hsl(var(--fg-muted))] hover:text-[hsl(var(--fg))]" title={SUBJECT_LABELS[s]}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineResource({ scId, fileType, filename, hasFile, item, onUpload, onRemove, onView }) {
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(scId, fileType, file);
    e.target.value = "";
  };

  if (hasFile) {
    return (
      <div className="w-[110px] shrink-0 flex items-center gap-0.5 min-w-0">
        <button onClick={() => onView(item)} className="flex-1 min-w-0 text-left group" title={filename}>
          <span className="text-[10px] text-[hsl(var(--accent))] group-hover:underline truncate block">{filename}</span>
        </button>
        <label className="btn-ghost p-0.5 cursor-pointer text-[hsl(var(--fg-subtle))] hover:text-[hsl(var(--accent))]" title="Replace">
          <Upload className="w-2.5 h-2.5" />
          <input type="file" accept=".md,.pdf" onChange={handleFileChange} className="hidden" />
        </label>
        <button onClick={() => onRemove(scId, fileType)} className="btn-ghost p-0.5 text-[hsl(var(--danger))]/50 hover:text-[hsl(var(--danger))]" title="Remove">
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  return (
    <label className="w-[110px] shrink-0 flex items-center gap-1 cursor-pointer text-[10px] text-[hsl(var(--fg-subtle))] hover:text-[hsl(var(--accent))] transition-colors" title={`Attach ${fileType === "short_notes" ? "Short Notes" : "Traversal Q&A"}`}>
      <Upload className="w-2.5 h-2.5 shrink-0" />
      <span className="truncate">{fileType === "short_notes" ? "Notes" : "Q&A"}</span>
      <input type="file" accept=".md,.pdf" onChange={handleFileChange} className="hidden" />
    </label>
  );
}
