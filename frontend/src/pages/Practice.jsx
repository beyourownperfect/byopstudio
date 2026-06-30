import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Star, ChevronRight, ChevronLeft, ExternalLink, Check, X as XIcon, Clock, Play, BarChart3 } from "lucide-react";
import { practiceApi, questionsApi } from "@/lib/api";
import { SUBJECTS, TID } from "@/lib/constants";
import { relLabel } from "@/lib/dateUtils";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import RevisitMenu from "@/components/RevisitMenu";
import HelpButton from "@/components/HelpButton";
import SubjectSelect from "@/components/SubjectSelect";
import { HELP_CONTENT } from "@/lib/helpContent";

const MODES = [
  { value: "due", label: "Due revisions" },
  { value: "new", label: "New (never attempted)" },
  { value: "wrong", label: "Wrong" },
  { value: "weak", label: "Weak" },
  { value: "bookmarked", label: "Bookmarked" },
  { value: "all", label: "All" },
];

export default function Practice() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState(sp.get("mode") || "due");
  const [subject, setSubject] = useState(sp.get("subject") || "ALL");
  const [started, setStarted] = useState(false);
  const [q, setQ] = useState(null);
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [confidence, setConfidence] = useState(3);
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [excludeIds, setExcludeIds] = useState([]);
  const startTimeRef = useRef(null);
  // Practice queue — history of seen questions with current index
  // Practice queue — history of seen questions with current index
  const [queue, setQueue] = useState([]);
  const [queueIdx, setQueueIdx] = useState(-1);
  const queueRef = useRef({ queue: [], queueIdx: -1 });

  // Session stats
  const [session, setSession] = useState({ total: 0, correct: 0, timeSec: 0, confidenceTotal: 0, masteryChanges: 0, prevMastery: null });
  const sessionRef = useRef(session);

  // Stopwatch
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!q || feedback) return;
    startTimeRef.current = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [q, feedback]);

  // Keyboard shortcuts for solving
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag) || e.target?.isContentEditable) return;
      if (!started || !q) return;

      if (feedback) {
        if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); goNext(); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); goBack(); }
        return;
      }

      if (["a", "b", "c", "d"].includes(e.key.toLowerCase()) && q.question_type !== "NAT") {
        e.preventDefault();
        toggleOption(e.key.toUpperCase());
      } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        setConfidence(parseInt(e.key));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, q, feedback]); // eslint-disable-line

  const fetchNext = async (m = mode, s = subject, exclude = excludeIds) => {
    setFeedback(null);
    setAnswer("");
    setSelected(new Set());
    setConfidence(3);
    const params = { mode: m, exclude_ids: exclude.join(",") };
    if (s !== "ALL") params.subject = s;
    const next = await practiceApi.next(params);
    if (next) {
      setQueue((q) => {
        const updated = [...q.slice(0, queueRef.current.queueIdx + 1), next];
        queueRef.current = { queue: updated, queueIdx: queueRef.current.queueIdx + 1 };
        return updated;
      });
      setQueueIdx((i) => i + 1);
    }
    setQ(next);
  };

  // If query has ?question=ID, fetch that single one
  useEffect(() => {
    const qid = sp.get("question");
    if (qid) {
      questionsApi.get(qid).then((data) => { setQ(data); setStarted(true); });
    }
  }, [sp]);

  const start = async () => { setStarted(true); await fetchNext(); };

  const submit = async () => {
    if (!q) return;
    let userAnswer = "";
    let correct = false;
    if (q.question_type === "MCQ") {
      userAnswer = [...selected][0] || "";
      correct = userAnswer && userAnswer === (q.correct_answer || "").trim().toUpperCase();
    } else if (q.question_type === "MSQ") {
      userAnswer = [...selected].sort().join(",");
      const exp = (q.correct_answer || "").split(",").map((s) => s.trim().toUpperCase()).sort().join(",");
      correct = userAnswer === exp;
    } else {
      userAnswer = answer.trim();
      correct = userAnswer && Math.abs(parseFloat(userAnswer) - parseFloat(q.correct_answer)) < 0.01;
    }

    setSubmitting(true);
    const elapsedSec = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
    const prevMastery = q.mastery ?? 0;
    const res = await practiceApi.submit({
      question_id: q.id, correct, confidence, user_answer: userAnswer, time_taken_sec: elapsedSec,
    });
    setFeedback({ ...res, correct });
    setSubmitting(false);

    const newMastery = res.mastery ?? 0;
    setSession((s) => ({
      total: s.total + 1,
      correct: s.correct + (correct ? 1 : 0),
      timeSec: s.timeSec + elapsedSec,
      confidenceTotal: s.confidenceTotal + confidence,
      masteryChanges: s.masteryChanges + (newMastery - prevMastery),
      prevMastery: prevMastery,
    }));
  };

  const goNext = async () => {
    const newExclude = [...excludeIds, q.id];
    setExcludeIds(newExclude);
    await fetchNext(mode, subject, newExclude);
  };

  const goBack = () => {
    if (queueIdx <= 0) return;
    const prevQ = queue[queueIdx - 1];
    if (!prevQ) return;
    setFeedback(null);
    setAnswer("");
    setSelected(new Set());
    setConfidence(3);
    setQ(prevQ);
    setQueueIdx((i) => i - 1);
    queueRef.current.queueIdx = queueIdx - 1;
  };

  // Optimistic bookmark
  const toggleBookmark = async () => {
    if (!q) return;
    setQ({ ...q, bookmarked: !q.bookmarked });
    try { await questionsApi.update(q.id, { bookmarked: !q.bookmarked }); }
    catch (err) { console.error("[Practice] Failed to toggle bookmark:", err); setQ((cur) => ({ ...cur, bookmarked: !cur.bookmarked })); }
  };

  if (!started) {
    return (
      <div className="max-w-md mx-auto card-2 p-6 space-y-4 mt-12">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Practice</h1>
          <HelpButton moduleKey="practice" title={HELP_CONTENT.practice.title} sections={HELP_CONTENT.practice.sections} />
        </div>
        <p className="text-xs text-[hsl(var(--fg-muted))]">No planning. Pick a mode. Solve.</p>
        <div>
          <label className="label-x">Mode</label>
          <select data-testid={TID.practiceModeSelect} value={mode} onChange={(e) => setMode(e.target.value)} className="input mt-1">
            {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label-x">Subject</label>
          <SubjectSelect data-testid={TID.practiceSubjectSelect} value={subject} onChange={(e) => setSubject(e.target.value)} className="input mt-1" allOption />
        </div>
        <button data-testid={TID.practiceStartBtn} onClick={start} className="btn btn-primary w-full">
          <Play className="w-3.5 h-3.5" /> Start
        </button>
      </div>
    );
  }

  if (!q) {
    const hasSession = session.total > 0;
    const pct = hasSession ? Math.round((session.correct / session.total) * 100) : 0;
    const avgConf = hasSession ? (session.confidenceTotal / session.total).toFixed(1) : "0";
    const totalMin = Math.round(session.timeSec / 60);
    const masteryDelta = Math.round(session.masteryChanges);
    return (
      <div className="card-2 p-8 text-center max-w-lg mx-auto mt-12 space-y-4">
        {hasSession ? (
          <>
            <BarChart3 className="w-8 h-8 text-[hsl(var(--accent))] mx-auto" />
            <h2 className="text-xl font-semibold">Session complete</h2>
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="card-1 px-3 py-2"><div className="label-x">Questions</div><div className="text-lg mono font-semibold">{session.total}</div></div>
              <div className="card-1 px-3 py-2"><div className="label-x">Correct</div><div className="text-lg mono font-semibold text-[hsl(var(--success))]">{session.correct} ({pct}%)</div></div>
              <div className="card-1 px-3 py-2"><div className="label-x">Time</div><div className="text-lg mono font-semibold">{totalMin} min</div></div>
              <div className="card-1 px-3 py-2"><div className="label-x">Confidence avg</div><div className="text-lg mono font-semibold">{avgConf}/5</div></div>
            </div>
            {masteryDelta !== 0 && (
              <p className="text-xs text-[hsl(var(--fg-muted))]">
                Mastery {masteryDelta > 0 ? "+" : ""}{masteryDelta}% across {session.total} question{session.total !== 1 ? "s" : ""}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => { setStarted(false); setExcludeIds([]); setSession({ total: 0, correct: 0, timeSec: 0, confidenceTotal: 0, masteryChanges: 0, prevMastery: null }); setQueue([]); setQueueIdx(-1); navigate("/solve/practice"); }} className="btn">New session</button>
              <button onClick={() => navigate("/log")} className="btn btn-primary">View log</button>
            </div>
          </>
        ) : (
          <>
            <p className="font-semibold mb-2">Nothing to practice here.</p>
            <p className="text-xs text-[hsl(var(--fg-muted))] mb-4">Try a different mode or filter.</p>
            <button onClick={() => { setStarted(false); setExcludeIds([]); navigate("/solve/practice"); }} className="btn">Change mode</button>
          </>
        )}
      </div>
    );
  }

  const isMSQ = q.question_type === "MSQ";
  const isNAT = q.question_type === "NAT";

  const toggleOption = (letter) => {
    const next = new Set(selected);
    if (isMSQ) {
      next.has(letter) ? next.delete(letter) : next.add(letter);
    } else {
      next.clear();
      next.add(letter);
    }
    setSelected(next);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="card-2 px-5 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="chip chip-accent">{q.subject}</span>
          {q.topic && <span className="chip">{q.topic}</span>}
          <span className="chip">{q.question_type}</span>
          {q.year && <span className="chip">{q.year}</span>}
          <span className="chip">{q.difficulty}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--fg-muted))]">
          <div className="flex items-center gap-1 mr-1">
            <button onClick={goBack} disabled={queueIdx <= 0} className="btn-ghost p-1 disabled:opacity-30" title="Previous"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <span className="mono text-[11px] tabular-nums">{queueIdx + 1} / {queue.length}</span>
            <button onClick={goNext} className="btn-ghost p-1" title="Next"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <Clock className="w-3 h-3" /> <span className="mono">{Math.floor(elapsed / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}</span>
          <HelpButton moduleKey="practice-active" title={HELP_CONTENT.practice.title} sections={HELP_CONTENT.practice.sections} />
          {session.total > 0 && (
            <button onClick={() => setQ(null)} className="btn-ghost p-1 text-[hsl(var(--fg-muted))] hover:text-[hsl(var(--fg))]" title="End session & see summary"><XIcon className="w-3.5 h-3.5" /></button>
          )}
        </div>
      </div>

      <div className="card-2 p-5" data-testid={TID.practiceQuestion}>
        <div className="font-medium leading-relaxed text-[15px]">
          <MarkdownRenderer>{q.statement}</MarkdownRenderer>
        </div>

        {!isNAT ? (
          <div className="mt-5 space-y-2">
            {(q.options || []).map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const isSelected = selected.has(letter);
              const isCorrectLetter = feedback && (q.correct_answer || "").toUpperCase().split(",").map((x) => x.trim()).includes(letter);
              const wrongPick = feedback && isSelected && !isCorrectLetter;
              const cls = feedback
                ? (isCorrectLetter ? "border-[hsl(var(--success))] bg-[hsl(var(--success))]/10" :
                   wrongPick ? "border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/10" : "")
                : (isSelected ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10" : "");
              return (
                <button
                  key={i}
                  data-testid={TID.practiceOption(i)}
                  onClick={() => !feedback && toggleOption(letter)}
                  disabled={!!feedback}
                  className={`w-full text-left px-3 py-2 rounded-md border-2 border-border row-hover transition-colors flex items-start gap-2 ${cls}`}
                >
                  <span className="mono text-xs font-semibold w-5">{letter}.</span>
                  <span className="text-sm flex-1"><MarkdownRenderer>{opt}</MarkdownRenderer></span>
                  {feedback && isCorrectLetter && <Check className="w-4 h-4 text-[hsl(var(--success))]" />}
                  {wrongPick && <XIcon className="w-4 h-4 text-[hsl(var(--danger))]" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-5">
            <label className="label-x">Your answer (numeric)</label>
            <input
              data-testid={TID.practiceNatInput}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={!!feedback}
              className="input mt-1 max-w-xs"
              placeholder="e.g. 31"
            />
          </div>
        )}

        {!feedback && (
          <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="label-x">Confidence</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    data-testid={TID.practiceConfidence(n)}
                    onClick={() => setConfidence(n)}
                    className={`w-7 h-7 rounded border-2 text-xs font-semibold ${confidence === n ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]" : "border-border text-[hsl(var(--fg-muted))]"}`}
                  >{n}</button>
                ))}
              </div>
              <div className="flex items-center gap-2" style={{ paddingLeft: "54px" }}>
                {["Guess", "Unsure", "Fairly", "Confid.", "Certain"].map((label, i) => (
                  <span key={i} className="w-7 text-center text-[8px] text-[hsl(var(--fg-subtle))] leading-tight">{label}</span>
                ))}
              </div>
            </div>
            <button
              data-testid={TID.practiceSubmit}
              onClick={submit}
              disabled={submitting || (!isNAT && selected.size === 0) || (isNAT && !answer)}
              className="btn btn-primary"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        )}
        <p className="text-[10px] text-[hsl(var(--fg-subtle))] mt-3 text-center">
          A–D pick · 1–5 confidence · Space/Enter submit · ←→ navigate
        </p>
      </div>

      {feedback && (
        <div data-testid={TID.practiceFeedback} className={`card-2 p-5 space-y-3 ${feedback.correct ? "border-[hsl(var(--success))]" : "border-[hsl(var(--danger))]"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {feedback.correct
                ? <span className="chip chip-success"><Check className="w-3 h-3" /> Correct</span>
                : <span className="chip chip-danger"><XIcon className="w-3 h-3" /> Wrong</span>}
              <span className="chip">Mastery: {feedback.mastery ?? 0}</span>
              <span className="chip">Next review: {relLabel(feedback.next_review_date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <button data-testid={TID.practiceBookmark} onClick={toggleBookmark} className="btn-ghost p-1.5">
                <Star className={`w-4 h-4 ${q.bookmarked ? "fill-yellow-400 text-yellow-400" : ""}`} />
              </button>
              <div data-testid={TID.practiceRevisit}>
                <RevisitMenu itemType="question" itemId={q.id} itemTitle={q.statement.slice(0, 60)} itemSubject={q.subject} compact />
              </div>
              {feedback.gateoverflow_url && (
                <a href={feedback.gateoverflow_url} target="_blank" rel="noreferrer" className="btn-ghost p-1.5"><ExternalLink className="w-4 h-4" /></a>
              )}
            </div>
          </div>
          <div>
            <span className="label-x">Correct answer</span>
            <div className="mt-1 mono text-sm"><MarkdownRenderer>{String(feedback.correct_answer)}</MarkdownRenderer></div>
          </div>
          {feedback.explanation && (
            <div>
              <span className="label-x">Explanation</span>
              <div className="mt-1 text-sm leading-relaxed"><MarkdownRenderer>{feedback.explanation}</MarkdownRenderer></div>
            </div>
          )}
          <div className="flex justify-end items-center gap-2">
            <button onClick={goBack} disabled={queueIdx <= 0} className="btn text-xs disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /> Prev</button>
            <span className="text-[11px] mono text-[hsl(var(--fg-muted))]">{queueIdx + 1}/{queue.length}</span>
            <button data-testid={TID.practiceNext} onClick={goNext} className="btn btn-primary">
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
