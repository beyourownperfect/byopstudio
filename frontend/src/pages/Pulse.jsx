import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, AlertTriangle, BookOpen, Target, RotateCcw, FileText, Settings as SettingsIcon, ChevronDown, ArrowRight, TrendingUp, TrendingDown, CheckCircle, Circle, BarChart3, ChevronUp } from "lucide-react";
import { pulseApi, settingsApi } from "@/lib/api";
import { SUBJECT_LABELS, TID } from "@/lib/constants";
import { fmtDateLong } from "@/lib/dateUtils";
import { topicLabel } from "@/lib/gateSyllabus";
import HelpButton from "@/components/HelpButton";
import MissionCard from "@/components/MissionCard";
import StudyTimer from "@/components/StudyTimer";
import QueueCard from "@/components/QueueCard";
import { HELP_CONTENT } from "@/lib/helpContent";

const MOMENTUM_COLORS = (n) =>
  n >= 70 ? "text-[hsl(var(--success))]" : n >= 40 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--danger))]";

const MASTERY_COLOR = (n) =>
  n >= 80 ? "bg-[hsl(var(--success))]" : n >= 40 ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--danger))]";

export default function Pulse() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [examDate, setExamDate] = useState("");
  const [dailyQ, setDailyQ] = useState(0);
  const [dailyMin, setDailyMin] = useState(0);
  const [dailyRev, setDailyRev] = useState(0);
  const [weakExpanded, setWeakExpanded] = useState(false);

  const load = async () => setData(await pulseApi.get());
  useEffect(() => { load(); }, []);

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

      {/* ━━━ Today ━━━ */}
      <SectionLabel icon={<Zap className="w-3.5 h-3.5" />} text="Today" />
      <div className="space-y-4">
        <MissionCard />
        <QueueCard />
        <div className="grid md:grid-cols-2 gap-4">
          <MomentumCard momentum={data.momentum} delta={data.momentum_delta} sparkline={data.momentum_sparkline} />
          <div className="card-2-time p-5">
            <div className="label-x mb-1">Today&apos;s progress</div>
            <div className="space-y-2 mt-1">
              <ProgressLine label="Questions" value={data.today_questions} target={data.targets.daily_question_target} pct={data.daily_q_percent} />
              <ProgressLine label="Minutes" value={data.today_minutes} target={data.targets.daily_study_minutes_target} pct={data.daily_m_percent} />
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ Readiness ━━━ */}
      <SectionLabel icon={<Target className="w-3.5 h-3.5" />} text="Readiness" />
      <div className="space-y-4">
        <PreparationSnapshot snapshot={data.preparation_snapshot} />
        <WeakTopicsCard weakTopics={data.weak_topics} expanded={weakExpanded} toggle={() => setWeakExpanded(!weakExpanded)} navigate={navigate} />
        <SubjectCompletionCard subjects={sortedSubjects} />
        <TopicReadinessCard topicReadiness={data.topic_readiness} navigate={navigate} />
      </div>

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

function TopicReadinessCard({ topicReadiness, navigate }) {
  const [expandedSubjects, setExpandedSubjects] = useState({});

  if (!topicReadiness || topicReadiness.length === 0) return null;

  const toggleSubject = (subj) => setExpandedSubjects((e) => ({ ...e, [subj]: !e[subj] }));

  const totalEmpty = topicReadiness.reduce((sum, s) => sum + s.topics.filter((t) => !t.has_questions && !t.has_lectures).length, 0);

  return (
    <div className="card-2 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4">
        <BarChart3 className="w-4 h-4 text-[hsl(var(--info))]" />
        <h3 className="font-semibold text-sm">Topic Readiness</h3>
        {totalEmpty > 0 && <span className="chip chip-warning text-[10px]">{totalEmpty} untouched</span>}
      </div>
      <div className="border-t border-border px-5 pb-4 space-y-1">
        {topicReadiness.map(({ subject, topics }) => {
          const isExpanded = expandedSubjects[subject] ?? false;
          const done = topics.filter((t) => t.has_questions || t.has_lectures).length;
          const mastered = topics.filter((t) => t.percent >= 80).length;

          return (
            <div key={subject}>
              <button
                onClick={() => toggleSubject(subject)}
                className="w-full flex items-center gap-2 py-2 text-left hover:bg-[hsl(var(--bg-elev))]/40 rounded px-2 transition-colors"
              >
                <ChevronDown className={`w-3 h-3 text-[hsl(var(--fg-subtle))] transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                <span className="text-xs font-semibold w-8">{subject}</span>
                <span className="text-[11px] text-[hsl(var(--fg-muted))] flex-1 truncate">{SUBJECT_LABELS[subject]}</span>
                <span className="text-[10px] mono text-[hsl(var(--fg-subtle))]">{done}/{topics.length} · {mastered} mastered</span>
              </button>
              {isExpanded && (
                <div className="ml-10 space-y-0.5 pb-1">
                  {topics.map((t) => {
                    const isEmpty = !t.has_questions && !t.has_lectures;
                    const barColor = t.percent >= 80 ? "bg-[hsl(var(--success))]" : t.percent >= 40 ? "bg-[hsl(var(--warning))]" : isEmpty ? "bg-[hsl(var(--bg-elev-2))]" : "bg-[hsl(var(--danger))]";
                    return (
                      <button
                        key={t.key}
                        onClick={() => navigate(`/solve/practice?subject=${subject}&topic=${t.key}`)}
                        className="w-full flex items-center gap-2 py-1 px-2 rounded hover:bg-[hsl(var(--bg-elev))]/40 transition-colors group"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${isEmpty ? "bg-[hsl(var(--fg-subtle))]/30" : t.has_questions ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--info))]"}`} />
                        <span className={`text-[11px] flex-1 truncate ${isEmpty ? "text-[hsl(var(--fg-subtle))]/50" : "text-[hsl(var(--fg-muted))]"}`}>{t.label}</span>
                        {!isEmpty && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] mono text-[hsl(var(--fg-subtle))]">{t.questions}Q · {t.pyqs}PYQ</span>
                            <div className="w-10 h-1 bg-[hsl(var(--bg-elev-2))] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${t.percent}%` }} />
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
    </div>
  );
}

/* ── Sub-components ── */

function SectionLabel({ icon, text }) {
  return (
    <div className="flex items-center gap-3 py-1 select-none">
      <span className="text-[hsl(var(--accent))] flex items-center">{icon}</span>
      <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[hsl(var(--fg-muted))]">{text}</span>
      <span className="flex-1 border-t border-border ml-1" />
    </div>
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

function PreparationSnapshot({ snapshot }) {
  if (!snapshot) return null;
  const metrics = [
    { key: "subject_coverage", label: "Subject Coverage", value: snapshot.subject_coverage, icon: BookOpen, help: "% of questions with 1 correct solve + 2 SRS revisions" },
    { key: "question_mastery", label: "Question Mastery", value: snapshot.question_mastery, icon: Target, help: "Average mastery across all attempted questions" },
    { key: "revision_completion", label: "Revision Completion", value: snapshot.revision_completion, icon: RotateCcw, help: "Revision sessions completed in last 7 days" },
    { key: "mock_readiness", label: "Mock Readiness", value: snapshot.mock_tests_exist ? snapshot.mock_readiness : 0, icon: FileText, help: "Log a Mock Test session to unlock", muted: !snapshot.mock_tests_exist },
  ];
  return (
    <div className="card-2-accent p-5" data-testid={TID.pulseReadiness}>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-[hsl(var(--accent))]" />
        <h3 className="font-semibold text-sm">Preparation Snapshot</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.key} className={m.muted ? "opacity-50" : ""} title={m.help}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[hsl(var(--fg-muted))] flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-[hsl(var(--fg-subtle))]" />{m.label}
                </span>
                <span className="mono font-semibold text-sm">{m.value}%</span>
              </div>
              <div className="w-full h-1.5 bg-[hsl(var(--bg-elev-2))] rounded overflow-hidden">
                <div className={`h-full transition-all duration-300 ${m.muted ? "bg-[hsl(var(--bg-elev-2))]" : "bg-[hsl(var(--accent))]"}`} style={{ width: `${m.value}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MomentumCard({ momentum, delta, sparkline }) {
  const maxSpark = Math.max(1, ...(sparkline || []));
  return (
    <div className="card-2 p-5" data-testid={TID.pulseMomentum}>
      <div className="label-x mb-1">Momentum</div>
      <div className="flex items-end gap-2">
        <div className={`text-4xl font-semibold mono ${MOMENTUM_COLORS(momentum)}`}>{momentum}</div>
        {delta !== 0 && (
          <div className={`flex items-center gap-0.5 text-xs font-medium pb-1 ${delta > 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--danger))]"}`}>
            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span className="mono">{delta > 0 ? "+" : ""}{delta}</span>
          </div>
        )}
      </div>
      {sparkline && sparkline.length > 0 && (
        <div className="flex items-end gap-[3px] h-7 mt-2">
          {sparkline.map((mins, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-[hsl(var(--accent))]/60 hover:bg-[hsl(var(--accent))] transition-colors"
              style={{ height: `${Math.max(4, (mins / maxSpark) * 100)}%` }}
              title={`${mins} min`}
            />
          ))}
        </div>
      )}
      <p className="text-[10px] text-[hsl(var(--fg-subtle))] mt-1.5">7-day consistency score</p>
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

function SubjectCompletionCard({ subjects }) {
  return (
    <div className="card-2 p-5" data-testid={TID.pulseSubjectCompletion}>
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-[hsl(var(--info))]" />
        <h3 className="font-semibold text-sm">Subject Completion</h3>
        <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--fg-subtle))] ml-1">sorted by completion</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        {subjects.map((s) => (
          <div key={s.subject} className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="w-8 shrink-0 mono text-[11px]">{s.subject}</span>
            <span className="text-[11px] text-[hsl(var(--fg-muted))] flex-1 truncate min-w-0">{SUBJECT_LABELS[s.subject]}</span>
            <span className="text-[11px] mono text-[hsl(var(--fg-muted))] w-12 text-right shrink-0">{s.completed}/{s.total}</span>
            <div className="w-16 sm:w-20 h-1.5 bg-[hsl(var(--bg-elev-2))] rounded overflow-hidden shrink-0">
              <div className={`h-full transition-all duration-300 ${MASTERY_COLOR(s.mastery_avg)}`} style={{ width: `${s.percent}%` }} />
            </div>
            <span className="mono text-[11px] w-8 text-right shrink-0">{s.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressLine({ label, value, target, pct }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[hsl(var(--fg-muted))]">{label}</span>
        <span className="mono">{value}/{target}</span>
      </div>
      <div className="w-full h-1.5 bg-[hsl(var(--bg-elev-2))] rounded mt-1 overflow-hidden">
        <div className="h-full bg-[hsl(var(--accent))] transition-all duration-300" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
