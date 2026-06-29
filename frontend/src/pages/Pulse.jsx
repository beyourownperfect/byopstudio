import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, AlertTriangle, BookOpen, Target, RotateCcw, FileText, Settings as SettingsIcon, ChevronDown, ArrowRight, TrendingUp, TrendingDown, CheckCircle, Circle } from "lucide-react";
import { pulseApi, settingsApi } from "@/lib/api";
import { SUBJECT_LABELS, TID } from "@/lib/constants";
import { fmtDateLong } from "@/lib/dateUtils";
import HelpButton from "@/components/HelpButton";
import MissionCard from "@/components/MissionCard";
import LectureTable from "@/components/LectureTable";
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
  const [weakExpanded, setWeakExpanded] = useState(false);

  const load = async () => setData(await pulseApi.get());
  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    if (examDate) await settingsApi.update({ exam_date: examDate });
    setShowSettings(false);
    load();
  };

  const sortedSubjects = useMemo(() => {
    if (!data) return [];
    return [...data.subject_completion].sort((a, b) => a.percent - b.percent);
  }, [data]);

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-32" />
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2"><Zap className="w-5 h-5 text-[hsl(var(--accent))]" /> Pulse</h1>
            <p className="text-xs text-[hsl(var(--fg-muted))]">{fmtDateLong(data.today)}</p>
          </div>
          <HelpButton moduleKey="pulse" title={HELP_CONTENT.pulse.title} sections={HELP_CONTENT.pulse.sections} />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="label-x">GATE in</div>
            <div className="font-semibold mono text-lg">{data.days_until_exam}<span className="text-[hsl(var(--fg-muted))] text-xs ml-1">days</span></div>
            <StudyStatus hasStudy={data.has_study_today} />
          </div>
          <button onClick={() => { setExamDate(data.exam_date); setShowSettings(true); }} className="btn-ghost p-2 hover:bg-[hsl(var(--bg-elev-2))] transition-colors"><SettingsIcon className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Today's Mission */}
      <MissionCard />

      {/* Preparation Snapshot */}
      <PreparationSnapshot snapshot={data.preparation_snapshot} />

      {/* Row: Momentum, Due Today, Today's Progress */}
      <div className="grid md:grid-cols-3 gap-4">
        <MomentumCard momentum={data.momentum} delta={data.momentum_delta} sparkline={data.momentum_sparkline} />
        <DueTodayCard dueRevisions={data.due_revisions} dueRevisits={data.due_revisits} navigate={navigate} />
        <div className="card-2 p-5">
          <div className="label-x mb-1">Today&apos;s progress</div>
          <div className="space-y-2 mt-1">
            <ProgressLine label="Questions" value={data.today_questions} target={data.targets.daily_question_target} pct={data.daily_q_percent} />
            <ProgressLine label="Minutes" value={data.today_minutes} target={data.targets.daily_study_minutes_target} pct={data.daily_m_percent} />
          </div>
        </div>
      </div>

      {/* Weak Topics */}
      <WeakTopicsCard weakTopics={data.weak_topics} expanded={weakExpanded} toggle={() => setWeakExpanded(!weakExpanded)} navigate={navigate} />

      {/* Subject Completion */}
      <SubjectCompletionCard subjects={sortedSubjects} />

      {/* Lecture Progress */}
      <LectureTable />

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

/* ── Sub-components ── */

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
    <div className="card-2 p-5" data-testid={TID.pulseReadiness}>
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

function DueTodayCard({ dueRevisions, dueRevisits, navigate }) {
  return (
    <div className="card-2 p-5 bg-[hsl(var(--accent))]/[0.04] border-[hsl(var(--accent))]/20" data-testid={TID.pulseDueRev}>
      <div className="label-x mb-1">Due Today</div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/solve/practice?mode=due")}
          className="group text-left p-2 -m-2 rounded hover:bg-[hsl(var(--accent))]/[0.08] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span className="text-3xl font-semibold mono">{dueRevisions}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[hsl(var(--accent))] opacity-0 group-hover:opacity-100 transition-opacity translate-x-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-[11px] text-[hsl(var(--fg-muted))] mt-0.5">SRS revisions</div>
        </button>
        <button
          onClick={() => navigate("/solve/repository?filter=revisit_today")}
          className="group text-left p-2 -m-2 rounded hover:bg-[hsl(var(--accent))]/[0.08] transition-colors"
        >
          <div className="flex items-center gap-1">
            <span className="text-3xl font-semibold mono">{dueRevisits}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[hsl(var(--accent))] opacity-0 group-hover:opacity-100 transition-opacity translate-x-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-[11px] text-[hsl(var(--fg-muted))] mt-0.5">Revisit items</div>
        </button>
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
                  onClick={() => navigate(`/solve/practice?mode=weak&subject=${w.subject}`)}
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
