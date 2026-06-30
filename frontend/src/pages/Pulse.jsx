import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, AlertTriangle, BookOpen, Target, RotateCcw, FileText, Settings as SettingsIcon, ChevronDown, ArrowRight, CheckCircle, Circle, BarChart3 } from "lucide-react";
import { pulseApi, settingsApi } from "@/lib/api";
import { SUBJECT_LABELS, TID } from "@/lib/constants";
import { fmtDateLong } from "@/lib/dateUtils";
import { topicLabel, subjectColor } from "@/lib/gateSyllabus";
import HelpButton from "@/components/HelpButton";
import MissionCard from "@/components/MissionCard";
import StudyTimer from "@/components/StudyTimer";
import QueueCard from "@/components/QueueCard";
import { HELP_CONTENT } from "@/lib/helpContent";

const MASTERY_COLOR = (n) =>
  n >= 80 ? "bg-[hsl(var(--success))]" : n >= 40 ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--danger))]";

export default function Pulse() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [topicReadiness, setTopicReadiness] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [examDate, setExamDate] = useState("");
  const [dailyQ, setDailyQ] = useState(0);
  const [dailyMin, setDailyMin] = useState(0);
  const [dailyRev, setDailyRev] = useState(0);
  const [weakExpanded, setWeakExpanded] = useState(false);

  const load = async () => setData(await pulseApi.get());
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (data) {
      pulseApi.topicReadiness().then(setTopicReadiness).catch(() => setTopicReadiness([]));
    }
  }, [data]);

  const saveSettings = async () => {
    const payload = {};
    if (examDate) payload.exam_date = examDate;
    if (dailyQ) payload.daily_question_target = dailyQ;
    if (dailyMin) payload.daily_study_minutes_target = dailyMin;
    if (dailyRev) payload.daily_revision_target = dailyRev;
    if (Object.keys(payload).length > 0) await settingsApi.update(payload);
    setShowSettings(false);
    load();
  };

  const sortedSubjects = useMemo(() => {
    if (!data) return [];
    return [...data.subject_completion].sort((a, b) => a.percent - b.percent);
  }, [data]);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="card-2 p-5"><div className="skeleton h-10" /></div>
        <div className="space-y-4">
          <div className="skeleton h-32" />
          <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24" />)}</div>
        </div>
      </div>
    );
  }

  const isOnboarding = !data.has_study_today && data.overall_total === 0;

  return (
    <div className="space-y-6">
      {/* ━━━ Header ━━━ */}
      <div className="card-2 px-4 sm:px-5 py-3 sm:py-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2"><Zap className="w-5 h-5 text-[hsl(var(--accent))]" /> Pulse</h1>
              <p className="text-xs text-[hsl(var(--fg-muted))]">{fmtDateLong(data.today)}</p>
            </div>
            <HelpButton moduleKey="pulse" title={HELP_CONTENT.pulse.title} sections={HELP_CONTENT.pulse.sections} />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right min-w-0">
              <div className="label-x truncate">GATE in</div>
              <div className="font-semibold mono text-base sm:text-lg">{data.days_until_exam}<span className="text-[hsl(var(--fg-muted))] text-xs ml-1">days</span></div>
              <StudyStatus hasStudy={data.has_study_today} />
            </div>
            <button onClick={() => { setExamDate(data.exam_date); setDailyQ(data.targets.daily_question_target); setDailyMin(data.targets.daily_study_minutes_target); setDailyRev(data.targets.daily_revision_target); setShowSettings(true); }} className="btn-ghost p-2 hover:bg-[hsl(var(--bg-elev-2))] transition-colors shrink-0"><SettingsIcon className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex justify-center sm:justify-start">
          <StudyTimer />
        </div>
      </div>

      {isOnboarding && (
        <div className="card-2-accent p-6 space-y-4" data-testid="pulse-onboarding">
          <h2 className="text-lg font-semibold">Welcome to your GATE CS Study OS</h2>
          <p className="text-sm text-[hsl(var(--fg-muted))]">Everything starts empty — let's get you set up in 30 seconds.</p>
          <div className="space-y-2">
            <button onClick={() => { setExamDate(data.exam_date || "2027-02-07"); setShowSettings(true); }} className="btn w-full text-left flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] flex items-center justify-center text-xs font-semibold">1</span>
              <span>Set your GATE exam date <span className="text-[hsl(var(--fg-subtle))]">— drives the countdown</span></span>
            </button>
            <button onClick={() => navigate("/solve/repository")} className="btn w-full text-left flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] flex items-center justify-center text-xs font-semibold">2</span>
              <span>Add questions <span className="text-[hsl(var(--fg-subtle))]">— load sample, import CSV, or create manually</span></span>
            </button>
            <button onClick={() => navigate("/solve/practice")} className="btn w-full text-left flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] flex items-center justify-center text-xs font-semibold">3</span>
              <span>Start solving <span className="text-[hsl(var(--fg-subtle))]">— SRS-backed practice with spaced repetition</span></span>
            </button>
          </div>
          <p className="text-[10px] text-[hsl(var(--fg-subtle))]">This card disappears once you have questions or activity. Press <kbd className="px-1 py-px bg-[hsl(var(--bg-elev-2))] rounded text-[10px]">⌘K</kbd> to search anything.</p>
        </div>
      )}

      <DailySnapshot
        todayQ={data.today_questions}
        todayMin={data.today_minutes}
        qTarget={data.targets.daily_question_target}
        minTarget={data.targets.daily_study_minutes_target}
        sparkline={data.momentum_sparkline}
        delta={data.momentum_delta}
        dueRevisions={data.due_revisions}
        dueRevisits={data.due_revisits}
        qPct={data.daily_q_percent}
        minPct={data.daily_m_percent}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <MissionCard initialItems={data.user_missions} />
        <QueueCard />
      </div>

      <SubjectReadiness
        subjects={sortedSubjects}
        snapshot={data.preparation_snapshot}
        topicReadiness={topicReadiness}
        overallCompleted={data.overall_completed}
        overallTotal={data.overall_total}
        navigate={navigate}
      />

      <WeakTopicsCard weakTopics={data.weak_topics} expanded={weakExpanded} toggle={() => setWeakExpanded(!weakExpanded)} navigate={navigate} />

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowSettings(false)} />
          <div className="relative card-2 max-w-md w-full p-5 space-y-3">
            <h3 className="font-semibold">Settings</h3>
            <div>
              <label className="label-x">GATE Exam Date</label>
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="input mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label-x">Daily Q target</label>
                <input type="number" min="0" value={dailyQ} onChange={(e) => setDailyQ(parseInt(e.target.value) || 0)} className="input mt-1" />
              </div>
              <div>
                <label className="label-x">Daily min target</label>
                <input type="number" min="0" value={dailyMin} onChange={(e) => setDailyMin(parseInt(e.target.value) || 0)} className="input mt-1" />
              </div>
              <div>
                <label className="label-x">Daily rev target</label>
                <input type="number" min="0" value={dailyRev} onChange={(e) => setDailyRev(parseInt(e.target.value) || 0)} className="input mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowSettings(false)} className="btn">Cancel</button>
              <button onClick={saveSettings} className="btn btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubjectReadiness({ subjects, snapshot, topicReadiness, overallCompleted, overallTotal, navigate }) {
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const toggleSubject = (subj) => setExpandedSubjects((e) => ({ ...e, [subj]: !e[subj] }));

  const metrics = snapshot ? [
    { key: "subject_coverage", label: "Coverage", value: Math.round((overallCompleted / Math.max(1, overallTotal)) * 100), icon: BookOpen },
    { key: "question_mastery", label: "Mastery", value: snapshot.question_mastery, icon: Target },
    { key: "revision_completion", label: "Revision", value: snapshot.revision_completion, icon: RotateCcw },
    { key: "mock_readiness", label: "Mock", value: snapshot.mock_tests_exist ? snapshot.mock_readiness : 0, icon: FileText, muted: !snapshot.mock_tests_exist },
  ] : [];

  const totalEmpty = topicReadiness ? topicReadiness.reduce((sum, s) => sum + s.topics.filter((t) => !t.has_questions && !t.has_lectures).length, 0) : 0;

  return (
    <div className="card-2 overflow-hidden">
      {/* Readiness bars row */}
      {metrics.length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <div className="grid grid-cols-4 gap-3">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.key} className={m.muted ? "opacity-40" : ""} title={m.label}>
                  <div className="flex items-center gap-1 mb-1">
                    <Icon className="w-3 h-3 text-[hsl(var(--fg-subtle))] shrink-0" />
                    <span className="text-[10px] text-[hsl(var(--fg-muted))]">{m.label}</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="mono font-semibold text-sm">{m.value}%</span>
                    <div className="flex-1 h-1 bg-[hsl(var(--bg-elev-2))] rounded-full overflow-hidden mb-0.5">
                      <div className="h-full bg-[hsl(var(--accent))] rounded-full transition-all" style={{ width: `${m.value}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject rows */}
      <div className="px-5 py-3 space-y-0.5">
        {subjects.map((s) => {
          const isExpanded = expandedSubjects[s.subject] ?? false;
          const topicData = topicReadiness?.find((t) => t.subject === s.subject);
          return (
            <div key={s.subject}>
              <button
                onClick={() => topicData && toggleSubject(s.subject)}
                className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-[hsl(var(--bg-elev))]/40 rounded px-1.5 transition-colors"
              >
                <span className={`text-[11px] font-semibold w-7 ${subjectColor(s.subject).text}`}>{s.subject}</span>
                <span className="text-[11px] text-[hsl(var(--fg-muted))] flex-1 truncate">{SUBJECT_LABELS[s.subject]}</span>
                <span className="text-[10px] mono text-[hsl(var(--fg-muted))] w-10 text-right shrink-0">{s.completed}/{s.total}</span>
                <div className="w-14 h-1 bg-[hsl(var(--bg-elev-2))] rounded-full overflow-hidden shrink-0">
                  <div className={`h-full rounded-full transition-all ${subjectColor(s.subject).bar}`} style={{ width: `${s.percent}%` }} />
                </div>
                {topicData && (
                  <ChevronRight className={`w-3 h-3 text-[hsl(var(--fg-subtle))] transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                )}
              </button>
              {isExpanded && topicData && (
                <div className="ml-10 space-y-0.5 pb-1">
                  {topicData.topics.map((t) => {
                    const isEmpty = !t.has_questions && !t.has_lectures;
                    const barColor = t.percent >= 80 ? "bg-[hsl(var(--success))]" : t.percent >= 40 ? "bg-[hsl(var(--warning))]" : isEmpty ? "bg-[hsl(var(--bg-elev-2))]" : "bg-[hsl(var(--danger))]";
                    return (
                      <button
                        key={t.key}
                        onClick={() => navigate(`/solve/practice?subject=${s.subject}&topic=${t.key}`)}
                        className="w-full flex items-center gap-2 py-1 px-2 rounded hover:bg-[hsl(var(--bg-elev))]/40 transition-colors group"
                      >
                        <div className={`w-1 h-1 rounded-full ${isEmpty ? "bg-[hsl(var(--fg-subtle))]/30" : "bg-[hsl(var(--accent))]"}`} />
                        <span className={`text-[11px] flex-1 truncate ${isEmpty ? "text-[hsl(var(--fg-subtle))]/50" : "text-[hsl(var(--fg-muted))]"}`}>{t.label}</span>
                        {!isEmpty && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] mono text-[hsl(var(--fg-subtle))]">{t.questions}Q · {t.pyqs}PYQ</span>
                            <div className="w-8 h-0.5 bg-[hsl(var(--bg-elev-2))] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${t.percent}%` }} />
                            </div>
                          </div>
                        )}
                        {isEmpty && <span className="text-[9px] text-[hsl(var(--fg-subtle))]/40 italic">untouched</span>}
                        <ArrowRight className="w-2.5 h-2.5 text-[hsl(var(--accent))] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalEmpty > 0 && (
        <div className="border-t border-border px-5 py-2 text-[10px] text-[hsl(var(--fg-subtle))]">
          {totalEmpty} untouched topics across all subjects
        </div>
      )}
    </div>
  );
}

function ChevronRight({ className }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StudyStatus({ hasStudy }) {
  return (
    <div className="flex items-center justify-end gap-1 mt-0.5">
      {hasStudy ? (
        <>
          <CheckCircle className="w-3 h-3 text-[hsl(var(--success))]" />
          <span className="text-[10px] text-[hsl(var(--success))]">Active today</span>
        </>
      ) : (
        <>
          <Circle className="w-3 h-3 text-[hsl(var(--fg-subtle))]" />
          <span className="text-[10px] text-[hsl(var(--fg-subtle))]">No activity logged today</span>
        </>
      )}
    </div>
  );
}

function DailySnapshot({ todayQ, todayMin, qTarget, minTarget, sparkline, delta, dueRevisions, dueRevisits, qPct, minPct }) {
  const maxSpark = Math.max(1, ...(sparkline || [1]));
  const totalHrs = parseFloat((todayMin / 60).toFixed(1));
  const dayNames = ["Su","M","Tu","W","Th","F","Sa"];
  const dt = new Date();
  const todayIdx = dt.getDay();

  const weekdayLabels = sparkline ? sparkline.map((_, i) => {
    const d = new Date(dt);
    d.setDate(d.getDate() - (sparkline.length - 1 - i));
    return dayNames[d.getDay()];
  }) : [];

  const effortLabel = totalHrs === 0
    ? "0h today"
    : totalHrs < 1
      ? `${todayMin}m today`
      : `${totalHrs}h today`;

  const trend = delta > 5 ? "↑ Gaining momentum"
    : delta < -5 ? "↓ Slowing this week"
    : delta !== 0 ? "Steady pace"
    : "First day — keep going";

  const attention = dueRevisions > 0 || dueRevisits > 0
    ? `${dueRevisions > 0 ? `${dueRevisions} revisions` : ""}${dueRevisions > 0 && dueRevisits > 0 ? ", " : ""}${dueRevisits > 0 ? `${dueRevisits} revisits` : ""} due`
    : "Nothing overdue";

  const goalStatus = qPct >= 100 && minPct >= 100
    ? "Both targets met"
    : qPct >= 100 ? "Questions met · minutes pending"
    : minPct >= 100 ? "Minutes met · questions pending"
    : `${qPct}% Q · ${minPct}% min of daily target`;

  return (
    <div className="card-2 p-5" data-testid={TID.pulseMomentum}>
      {/* Row 1: effort + trend */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold mono">{totalHrs}h</span>
          <span className="text-sm text-[hsl(var(--fg-muted))]">{effortLabel}</span>
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full ${delta > 5 ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : delta < -5 ? "bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))]" : "bg-[hsl(var(--bg-elev-2))] text-[hsl(var(--fg-muted))]"}`}>
          {trend}
        </span>
      </div>

      {/* Row 2: sparkline with today highlighted */}
      {sparkline && sparkline.length > 0 && (
        <div className="flex items-end gap-[2px] h-12 mb-3">
          {sparkline.map((mins, i) => {
            const isToday = i === sparkline.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={`w-full rounded-sm transition-all ${isToday ? "bg-[hsl(var(--accent))] shadow-[0_0_6px_hsl(var(--accent)/0.4)]" : "bg-[hsl(var(--accent))]/30 hover:bg-[hsl(var(--accent))]/60"}`}
                  style={{ height: `${Math.max(3, (mins / maxSpark) * 100)}%` }}
                  title={`${weekdayLabels[i] || ""}: ${mins}m`}
                />
                <span className={`text-[7px] ${isToday ? "text-[hsl(var(--accent))] font-semibold" : "text-[hsl(var(--fg-subtle))]"}`}>
                  {weekdayLabels[i]}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Row 3: quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="text-center">
          <div className="text-sm font-semibold mono">{todayQ}<span className="text-[10px] text-[hsl(var(--fg-muted))] font-normal">/{qTarget}</span></div>
          <div className="text-[10px] text-[hsl(var(--fg-subtle))]">Questions</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold mono">{todayMin}<span className="text-[10px] text-[hsl(var(--fg-muted))] font-normal">/{minTarget}</span></div>
          <div className="text-[10px] text-[hsl(var(--fg-subtle))]">Minutes</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold mono">{dueRevisions + dueRevisits}</div>
          <div className="text-[10px] text-[hsl(var(--fg-subtle))]">Due</div>
        </div>
      </div>

      {/* Row 4: insight */}
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="text-[hsl(var(--fg-muted))]">{attention}</span>
        <span className="text-[hsl(var(--fg-subtle))]">·</span>
        <span className="text-[hsl(var(--fg-muted))]">{goalStatus}</span>
      </div>
    </div>
  );
}

function WeakTopicsCard({ weakTopics, expanded, toggle, navigate }) {
  const top = weakTopics?.[0];
  return (
    <div className="card-2 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-2 px-5 py-4 text-left hover:bg-[hsl(var(--bg-elev))]/60 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))] shrink-0" />
          <h3 className="font-semibold text-sm">Weak Topics</h3>
          {top && (
            <span className="text-[11px] text-[hsl(var(--fg-muted))] truncate hidden sm:inline">
              &mdash; {top.subject} {top.topic}: {top.accuracy}%
            </span>
          )}
          {weakTopics.length > 0 && (
            <span className="chip chip-danger text-[10px] shrink-0">{weakTopics.length}</span>
          )}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-[hsl(var(--fg-muted))] transition-transform duration-150 shrink-0 ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="border-t border-border px-5 pb-4 pt-1">
          {weakTopics.length === 0 ? (
            <p className="text-sm text-[hsl(var(--fg-muted))] py-3">Not enough data yet — solve a few more to surface weak areas.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {weakTopics.map((w, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/solve/practice?mode=weak&subject=${w.subject}${w.official_topic ? `&topic=${w.official_topic}` : ""}`)}
                  className="w-full text-left px-3 py-2.5 rounded border border-border hover:bg-[hsl(var(--bg-elev))] transition-colors group"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{w.subject}</span>
                      <span className="text-[hsl(var(--fg-muted))]">{w.topic}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="chip chip-danger">{w.accuracy}%</span>
                      <ArrowRight className="w-3 h-3 text-[hsl(var(--accent))] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

