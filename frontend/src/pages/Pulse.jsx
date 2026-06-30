import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, AlertTriangle, BookOpen, Target, RotateCcw, FileText, Settings as SettingsIcon, ArrowRight, CheckCircle, HelpCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pulseApi, settingsApi } from "@/lib/api";
import { SUBJECT_LABELS, TID } from "@/lib/constants";
import { fmtDateLong } from "@/lib/dateUtils";
import { subjectColor } from "@/lib/gateSyllabus";
import HelpButton from "@/components/HelpButton";
import MissionCard from "@/components/MissionCard";
import StudyTimer from "@/components/StudyTimer";
import QueueCard from "@/components/QueueCard";
import { HELP_CONTENT } from "@/lib/helpContent";

export default function Pulse() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [examDate, setExamDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["pulse"],
    queryFn: pulseApi.get,
  });

  const { data: topicReadiness } = useQuery({
    queryKey: ["pulse-topicReadiness"],
    queryFn: pulseApi.topicReadiness,
    enabled: !!data,
  });

  const saveSettings = async () => {
    if (examDate) await settingsApi.update({ exam_date: examDate });
    setShowSettings(false);
    queryClient.invalidateQueries({ queryKey: ["pulse"] });
  };

  const sortedSubjects = useMemo(() => {
    if (!data) return [];
    return [...data.subject_completion].sort((a, b) => a.percent - b.percent);
  }, [data]);

  if (isLoading) {
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
    <div className="space-y-4">
      {/* ━━━ Header — compact ━━━ */}
      <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[hsl(var(--accent))]" /> Pulse
          </h1>
          <span className="text-[11px] text-[hsl(var(--fg-muted))]">{fmtDateLong(data.today)}</span>
          <HelpButton moduleKey="pulse" title={HELP_CONTENT.pulse.title} sections={HELP_CONTENT.pulse.sections} />
        </div>
        <div className="flex items-center gap-1.5">
          <StudyStatus hasStudy={data.has_study_today} />
          <button onClick={() => { setExamDate(data.exam_date); setShowSettings(true); }} className="btn-ghost p-1.5 hover:bg-[hsl(var(--bg-elev-2))] transition-colors shrink-0"><SettingsIcon className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <StudyTimer />

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

      {/* ━━━ Execution Zone ━━━ */}
      <div className="grid md:grid-cols-2 gap-3 rounded-lg border-l-2 border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/[0.02]">
        <MissionCard />
        <QueueCard />
      </div>

      <DailySnapshot
        todayQ={data.today_questions}
        todayMin={data.today_minutes}
        sparkline={data.momentum_sparkline}
        delta={data.momentum_delta}
        dueRevisions={data.due_revisions}
        dueRevisits={data.due_revisits}
      />

      {/* ━━━ Analytics ━━━ */}
      <SubjectReadiness
        subjects={sortedSubjects}
        snapshot={data.preparation_snapshot}
        topicReadiness={topicReadiness}
        overallCompleted={data.overall_completed}
        overallTotal={data.overall_total}
        navigate={navigate}
        weakTopics={data.weak_topics}
      />

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

function SubjectReadiness({ subjects, snapshot, topicReadiness, overallCompleted, overallTotal, navigate, weakTopics }) {
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const toggleSubject = (subj) => setExpandedSubjects((e) => ({ ...e, [subj]: !e[subj] }));

  const metrics = snapshot ? [
    { key: "subject_coverage", label: "Coverage", value: Math.round((overallCompleted / Math.max(1, overallTotal)) * 100), icon: BookOpen, help: "% of questions with 1 correct solve + 2 successful SRS revisions" },
    { key: "question_mastery", label: "Mastery", value: snapshot.question_mastery, icon: Target, help: "Average mastery score across all attempted questions (blend of SRS interval progression and accuracy)" },
    { key: "revision_completion", label: "Revision", value: snapshot.revision_completion, icon: RotateCcw, help: "Revision sessions completed in the last 7 days (10% per session, capped at 100%)" },
    { key: "mock_readiness", label: "Mock", value: snapshot.mock_tests_exist ? snapshot.mock_readiness : 0, icon: FileText, muted: !snapshot.mock_tests_exist, help: "Based on average subject completion (60%) + Mock Test activity (40%). Log a Mock Test to unlock" },
  ] : [];

  const totalEmpty = topicReadiness ? topicReadiness.reduce((sum, s) => sum + s.topics.filter((t) => !t.has_questions && !t.has_lectures).length, 0) : 0;
  const hasWeakTopics = weakTopics && weakTopics.length > 0;

  return (
    <div className="card-2 overflow-hidden">
      {/* Readiness bars row */}
      {metrics.length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <div className="grid grid-cols-4 gap-3">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.key} className={m.muted ? "opacity-40" : ""}>
                  <div className="flex items-center gap-1 mb-1">
                    <Icon className="w-3 h-3 text-[hsl(var(--fg-subtle))] shrink-0" />
                    <span className="text-[10px] text-[hsl(var(--fg-muted))]">{m.label}</span>
                    <span className="relative group cursor-help shrink-0">
                      <HelpCircle className="w-3 h-3 text-[hsl(var(--fg-subtle))]/50 group-hover:text-[hsl(var(--accent))] transition-colors" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-44 text-[10px] bg-[hsl(var(--bg-elev-2))] border border-border rounded px-2 py-1 text-[hsl(var(--fg-muted))] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center leading-relaxed">
                        {m.help}
                      </span>
                    </span>
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

      {hasWeakTopics && (
        <div className="border-t border-border px-5 py-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--warning))] font-medium">
            <AlertTriangle className="w-3 h-3" /> Weak topics
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {weakTopics.map((w, i) => (
              <button
                key={i}
                onClick={() => navigate(`/solve/practice?mode=weak&subject=${w.subject}${w.official_topic ? `&topic=${w.official_topic}` : ""}`)}
                className="text-left px-2.5 py-1.5 rounded border border-border hover:bg-[hsl(var(--bg-elev))] transition-colors text-[11px]"
              >
                <span className="font-medium">{w.subject}</span> <span className="text-[hsl(var(--fg-muted))]">{w.topic}</span>
                <span className="ml-2 chip chip-danger text-[10px]">{w.accuracy}%</span>
              </button>
            ))}
          </div>
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
  if (!hasStudy) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--success))]">
      <CheckCircle className="w-2.5 h-2.5" /> Active
    </span>
  );
}

function DailySnapshot({ todayQ, todayMin, sparkline, delta, dueRevisions, dueRevisits }) {
  const maxSpark = Math.max(1, ...(sparkline || [1]));
  const totalHrs = parseFloat((todayMin / 60).toFixed(1));
  const dayNames = ["Su","M","Tu","W","Th","F","Sa"];
  const dt = new Date();

  const weekdayLabels = sparkline ? sparkline.map((_, i) => {
    const d = new Date(dt);
    d.setDate(d.getDate() - (sparkline.length - 1 - i));
    return dayNames[d.getDay()];
  }) : [];

  const effortLabel = totalHrs === 0 ? "0h today" : totalHrs < 1 ? `${todayMin}m today` : `${totalHrs}h today`;
  const statusLine = dueRevisions > 0 || dueRevisits > 0
    ? `${dueRevisions > 0 ? `${dueRevisions} revisions due` : ""}${dueRevisions > 0 && dueRevisits > 0 ? ", " : ""}${dueRevisits > 0 ? `${dueRevisits} revisits due` : ""}`
    : "";

  return (
    <div className="card-2 p-4" data-testid={TID.pulseMomentum}>
      <div className="flex items-center gap-4">
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="text-2xl font-bold mono">{totalHrs}h</span>
          <span className="text-[11px] text-[hsl(var(--fg-muted))]">{effortLabel}</span>
        </div>

        {sparkline && sparkline.length > 0 && (
          <div className="flex-1 flex items-end gap-[2px] h-8 min-w-0">
            {sparkline.map((mins, i) => {
              const isToday = i === sparkline.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                  <div
                    className={`w-full rounded-sm transition-all ${isToday ? "bg-[hsl(var(--accent))] shadow-[0_0_4px_hsl(var(--accent)/0.3)]" : "bg-[hsl(var(--accent))]/25"}`}
                    style={{ height: `${Math.max(2, (mins / maxSpark) * 100)}%` }}
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

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center">
            <div className="mono text-sm font-semibold">{todayQ}</div>
            <div className="text-[9px] text-[hsl(var(--fg-subtle))]">Q</div>
          </div>
          <div className="text-center">
            <div className="mono text-sm font-semibold">{todayMin}</div>
            <div className="text-[9px] text-[hsl(var(--fg-subtle))]">min</div>
          </div>
        </div>
      </div>
      {statusLine && (
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px]">
          <span className="text-[hsl(var(--fg-muted))]">{statusLine}</span>
          {delta > 5 && <span className="text-[hsl(var(--success))] ml-auto">↑ {delta} pts</span>}
          {delta < -5 && <span className="text-[hsl(var(--danger))] ml-auto">↓ {Math.abs(delta)} pts</span>}
        </div>
      )}
      {!statusLine && (delta > 5 || delta < -5) && (
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px]">
          {delta > 5 && <span className="text-[hsl(var(--success))]">↑ {delta} pts</span>}
          {delta < -5 && <span className="text-[hsl(var(--danger))]">↓ {Math.abs(delta)} pts</span>}
        </div>
      )}
    </div>
  );
}


