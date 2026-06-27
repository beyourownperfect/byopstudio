import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Target, AlertTriangle, BookOpen, Calendar, ChevronRight, Settings as SettingsIcon } from "lucide-react";
import { pulseApi, settingsApi } from "@/lib/api";
import { SUBJECTS, SUBJECT_LABELS, TID } from "@/lib/constants";
import { fmtDateLong } from "@/lib/dateUtils";

const MOMENTUM_COLORS = (n) => n >= 70 ? "text-[hsl(var(--success))]" : n >= 40 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--danger))]";

export default function Pulse() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [examDate, setExamDate] = useState("");

  const load = async () => setData(await pulseApi.get());
  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    if (examDate) await settingsApi.update({ exam_date: examDate });
    setShowSettings(false);
    load();
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-32" />
        <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24" />)}</div>
      </div>
    );
  }

  const goToMission = (m) => {
    if (m.kind === "due_revisions") navigate("/solve/practice?mode=due");
    else if (m.kind === "due_revisits") navigate("/solve/repository?filter=revisit_today");
    else if (m.kind === "weak_topic") navigate(`/solve/practice?mode=weak&subject=${m.subject || "ALL"}`);
    else if (m.kind === "new_practice") navigate(`/solve/practice?mode=new&subject=${m.subject || "ALL"}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Zap className="w-5 h-5 text-[hsl(var(--accent))]" /> Pulse</h1>
          <p className="text-xs text-[hsl(var(--fg-muted))]">{fmtDateLong(data.today)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="label-x">GATE in</div>
            <div className="font-semibold mono text-lg">{data.days_until_exam}<span className="text-[hsl(var(--fg-muted))] text-xs ml-1">days</span></div>
          </div>
          <button onClick={() => { setExamDate(data.exam_date); setShowSettings(true); }} className="btn-ghost p-2"><SettingsIcon className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Today's Mission */}
      <div className="card-2 p-5" data-testid={TID.pulseMission}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[hsl(var(--accent))]" />
            <h2 className="font-semibold">Today's Mission</h2>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--fg-subtle))]">Top {data.mission.length}</span>
        </div>
        {data.mission.length === 0 ? (
          <p className="text-sm text-[hsl(var(--fg-muted))]">All caught up. Add questions or schedule revisions to keep momentum.</p>
        ) : (
          <div className="space-y-1.5">
            {data.mission.map((m, i) => (
              <button
                key={m.id}
                onClick={() => goToMission(m)}
                className="w-full text-left px-3 py-2.5 rounded border border-border row-hover flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="mono text-xs text-[hsl(var(--fg-subtle))] w-5">{i + 1}.</span>
                  <span className="font-medium text-sm truncate">{m.title}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--fg-muted))]" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Top row: Momentum, Due, Today's progress */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card-2 p-5" data-testid={TID.pulseMomentum}>
          <div className="label-x mb-1">Momentum</div>
          <div className={`text-4xl font-semibold mono ${MOMENTUM_COLORS(data.momentum)}`}>{data.momentum}</div>
          <div className="mt-3 w-full bg-[hsl(var(--bg-elev-2))] h-1.5 rounded overflow-hidden">
            <div className={`h-full ${data.momentum >= 70 ? "bg-[hsl(var(--success))]" : data.momentum >= 40 ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--danger))]"}`} style={{ width: `${data.momentum}%` }} />
          </div>
          <p className="text-[11px] text-[hsl(var(--fg-muted))] mt-2">7-day rolling: activity, diversity, revision</p>
        </div>

        <div className="card-2 p-5" data-testid={TID.pulseDueRev}>
          <div className="label-x mb-1">Due Today</div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate("/solve/practice?mode=due")} className="text-left">
              <div className="text-3xl font-semibold mono">{data.due_revisions}</div>
              <div className="text-[11px] text-[hsl(var(--fg-muted))]">SRS revisions</div>
            </button>
            <button onClick={() => navigate("/solve/repository?filter=revisit_today")} className="text-left">
              <div className="text-3xl font-semibold mono">{data.due_revisits}</div>
              <div className="text-[11px] text-[hsl(var(--fg-muted))]">Revisit items</div>
            </button>
          </div>
        </div>

        <div className="card-2 p-5">
          <div className="label-x mb-1">Today's progress</div>
          <div className="space-y-2 mt-1">
            <ProgressLine label="Questions" value={data.today_questions} target={data.targets.daily_question_target} pct={data.daily_q_percent} />
            <ProgressLine label="Minutes" value={data.today_minutes} target={data.targets.daily_study_minutes_target} pct={data.daily_m_percent} />
          </div>
        </div>
      </div>

      {/* Weakness + Readiness */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-2 p-5" data-testid={TID.pulseWeak}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))]" />
            <h3 className="font-semibold">Weak Topics</h3>
          </div>
          {data.weak_topics.length === 0 ? (
            <p className="text-sm text-[hsl(var(--fg-muted))]">Not enough data yet — solve a few more to surface weak areas.</p>
          ) : (
            <div className="space-y-2">
              {data.weak_topics.map((w, i) => (
                <button key={i} onClick={() => navigate(`/solve/practice?mode=weak&subject=${w.subject}`)}
                  className="w-full text-left px-3 py-2.5 rounded border border-border row-hover">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{w.subject}</span>
                      <span className="text-[hsl(var(--fg-muted))] ml-2">{w.topic}</span>
                    </div>
                    <span className="chip chip-danger">{w.accuracy}%</span>
                  </div>
                  <div className="text-[11px] text-[hsl(var(--fg-muted))] mt-1">Solve 10 {w.subject} questions →</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card-2 p-5" data-testid={TID.pulseReadiness}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-[hsl(var(--accent))]" />
            <h3 className="font-semibold">GATE Readiness</h3>
          </div>
          <ReadinessRow label="PYQ Completion" value={data.pyq_percent} sub={`${data.pyq_done}/${data.pyq_total}`} />
          <ReadinessRow label="Revision Readiness" value={data.revision_readiness} />
          <ReadinessRow label="Mock Readiness" value={data.mock_readiness} />
        </div>
      </div>

      {/* Subject completion */}
      <div className="card-2 p-5" data-testid={TID.pulseSubjectCompletion}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-[hsl(var(--info))]" />
          <h3 className="font-semibold">Subject Completion</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {data.subject_completion.map((s) => (
            <div key={s.subject} className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="w-10 mono text-xs shrink-0">{s.subject}</span>
              <span className="text-xs text-[hsl(var(--fg-muted))] flex-1 truncate min-w-0">{SUBJECT_LABELS[s.subject]}</span>
              <span className="text-xs mono text-[hsl(var(--fg-muted))] w-12 sm:w-14 text-right shrink-0">{s.completed}/{s.total}</span>
              <div className="w-16 sm:w-24 h-1.5 bg-[hsl(var(--bg-elev-2))] rounded overflow-hidden shrink-0">
                <div className="h-full bg-[hsl(var(--accent))]" style={{ width: `${s.percent}%` }} />
              </div>
              <span className="mono text-xs w-9 text-right shrink-0">{s.percent}%</span>
            </div>
          ))}
        </div>
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

function ProgressLine({ label, value, target, pct }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[hsl(var(--fg-muted))]">{label}</span>
        <span className="mono">{value}/{target}</span>
      </div>
      <div className="w-full h-1.5 bg-[hsl(var(--bg-elev-2))] rounded mt-1 overflow-hidden">
        <div className="h-full bg-[hsl(var(--accent))]" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function ReadinessRow({ label, value, sub }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[hsl(var(--fg-muted))]">{label}</span>
        <span className="mono font-semibold">{value}% {sub && <span className="text-[hsl(var(--fg-subtle))] text-xs ml-1">{sub}</span>}</span>
      </div>
      <div className="w-full h-1.5 bg-[hsl(var(--bg-elev-2))] rounded mt-1 overflow-hidden">
        <div className="h-full bg-[hsl(var(--accent))]" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
