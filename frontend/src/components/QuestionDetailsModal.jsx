import React, { useEffect, useState } from "react";
import { Star, ExternalLink, Edit3, Play, Check, X as XIcon, Clock, Target } from "lucide-react";
import Modal from "@/components/Modal";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import RevisitMenu from "@/components/RevisitMenu";
import { questionsApi } from "@/lib/api";
import { fmtDate, fmtDateLong, relLabel } from "@/lib/dateUtils";

/**
 * Read-only details modal for a Repository question.
 * Renders LaTeX statement + options, attempts history, mastery, revision status,
 * and a GateOverflow link. Has an "Edit" button to switch to the edit form.
 */
export default function QuestionDetailsModal({ open, onClose, questionId, onEdit, onPractice, onBookmarkChanged }) {
  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !questionId) return;
    setLoading(true);
    questionsApi.get(questionId)
      .then((data) => setQ(data))
      .finally(() => setLoading(false));
  }, [open, questionId]);

  const toggleBookmark = async () => {
    if (!q) return;
    const next = !q.bookmarked;
    setQ({ ...q, bookmarked: next });
    try {
      await questionsApi.update(q.id, { bookmarked: next });
      onBookmarkChanged?.();
    } catch (err) {
      console.error("[QuestionDetails] Failed to toggle bookmark:", err);
      setQ((cur) => ({ ...cur, bookmarked: !next }));
    }
  };

  const correctLetters = (q?.correct_answer || "").toUpperCase().split(",").map((x) => x.trim()).filter(Boolean);
  const srs = q?.srs || {};
  const mastery = q?.mastery ?? 0;
  const masteryColor = mastery >= 80 ? "chip-success" : mastery >= 40 ? "chip-warning" : "chip-danger";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={q ? `${q.subject} · ${q.question_type}${q.exam_source ? ` · ${q.exam_source}` : ""}${q.year ? ` ${q.year}` : ""}` : "Question details"}
      size="lg"
      footer={
        <>
          {q?.gateoverflow_url && (
            <a
              data-testid="qdetails-go-link"
              href={q.gateoverflow_url}
              target="_blank"
              rel="noreferrer"
              className="btn mr-auto"
              title="Open on GateOverflow"
            >
              <ExternalLink className="w-3.5 h-3.5" /> GateOverflow
            </a>
          )}
          <button onClick={onClose} className="btn">Close</button>
          {q && (
            <>
              <button data-testid="qdetails-edit" onClick={() => onEdit?.(q)} className="btn">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button data-testid="qdetails-practice" onClick={() => onPractice?.(q)} className="btn btn-primary">
                <Play className="w-3.5 h-3.5" /> Practice
              </button>
            </>
          )}
        </>
      }
    >
      {loading || !q ? (
        <div className="space-y-3">
          <div className="skeleton h-6" />
          <div className="skeleton h-24" />
          <div className="skeleton h-12" />
        </div>
      ) : (
        <div className="space-y-4" data-testid="qdetails-body">
          {/* Header chips + bookmark */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="chip chip-accent">{q.subject}</span>
              {q.topic && <span className="chip">{q.topic}</span>}
              <span className="chip">{q.question_type}</span>
              {q.exam_source && <span className="chip">{q.exam_source}{q.year ? ` ${q.year}` : ""}</span>}
              <span className="chip">{q.difficulty}</span>
              <span className={`chip ${masteryColor}`} title="Mastery (0–100)">
                <Target className="w-3 h-3" /> {mastery}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggleBookmark} className="btn-ghost p-1.5" title="Toggle bookmark" data-testid="qdetails-bookmark">
                <Star className={`w-4 h-4 ${q.bookmarked ? "fill-yellow-400 text-yellow-400" : "text-[hsl(var(--fg-muted))]"}`} />
              </button>
              <RevisitMenu itemType="question" itemId={q.id} itemTitle={q.statement.slice(0, 60)} itemSubject={q.subject} compact />
            </div>
          </div>

          {/* Statement */}
          <div>
            <div className="label-x mb-1.5">Statement</div>
            <div className="text-[15px] leading-relaxed">
              <MarkdownRenderer>{q.statement}</MarkdownRenderer>
            </div>
          </div>

          {/* Options or numeric answer */}
          {q.question_type !== "NAT" ? (
            <div>
              <div className="label-x mb-1.5">Options</div>
              <div className="space-y-1.5">
                {(q.options || []).map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isCorrect = correctLetters.includes(letter);
                  return (
                    <div
                      key={i}
                      className={`px-3 py-2 rounded-md border-2 flex items-start gap-2 ${
                        isCorrect ? "border-[hsl(var(--success))] bg-[hsl(var(--success))]/10" : "border-border"
                      }`}
                    >
                      <span className="mono text-xs font-semibold w-5">{letter}.</span>
                      <span className="text-sm flex-1"><MarkdownRenderer>{opt}</MarkdownRenderer></span>
                      {isCorrect && <Check className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="label-x mb-1.5">Correct answer</div>
              <div className="px-3 py-2 rounded-md border-2 border-[hsl(var(--success))] bg-[hsl(var(--success))]/10 mono text-sm inline-block">
                <MarkdownRenderer>{String(q.correct_answer)}</MarkdownRenderer>
              </div>
            </div>
          )}

          {/* Explanation */}
          {q.explanation && (
            <div>
              <div className="label-x mb-1.5">Explanation</div>
              <div className="text-sm leading-relaxed text-[hsl(var(--fg-muted))]">
                <MarkdownRenderer>{q.explanation}</MarkdownRenderer>
              </div>
            </div>
          )}

          {/* Mastery progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="label-x">Mastery</span>
              <span className="mono">{mastery}/100</span>
            </div>
            <div className="w-full h-1.5 bg-[hsl(var(--bg-elev-2))] rounded overflow-hidden">
              <div
                className={`h-full ${mastery >= 80 ? "bg-[hsl(var(--success))]" : mastery >= 40 ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--danger))]"}`}
                style={{ width: `${mastery}%` }}
              />
            </div>
          </div>

          {/* Revision status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Attempts" value={srs.total_attempts ?? 0} />
            <Stat label="Correct" value={srs.correct_attempts ?? 0} />
            <Stat label="Streak" value={srs.consecutive_correct ?? 0} />
            <Stat label="Next review" value={srs.next_review_date ? relLabel(srs.next_review_date) : "—"} />
          </div>

          {/* Attempt history */}
          <div>
            <div className="label-x mb-1.5">Attempts history</div>
            {(!q.attempts || q.attempts.length === 0) ? (
              <p className="text-[12px] text-[hsl(var(--fg-muted))]">No attempts yet — solve it from Practice to start tracking.</p>
            ) : (
              <div className="border border-border rounded divide-y divide-border max-h-48 overflow-y-auto">
                {q.attempts.map((a) => (
                  <div key={a.id} className="px-3 py-1.5 flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      {a.correct ? (
                        <Check className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
                      ) : (
                        <XIcon className="w-3.5 h-3.5 text-[hsl(var(--danger))]" />
                      )}
                      <span className="mono text-[hsl(var(--fg-muted))]">{a.user_answer || "—"}</span>
                      <span className="text-[hsl(var(--fg-subtle))]">·</span>
                      <span className="text-[hsl(var(--fg-muted))]">conf {a.confidence}/5</span>
                      {a.time_taken_sec > 0 && (
                        <>
                          <span className="text-[hsl(var(--fg-subtle))]">·</span>
                          <span className="inline-flex items-center gap-1 text-[hsl(var(--fg-muted))]">
                            <Clock className="w-3 h-3" /> {a.time_taken_sec}s
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-[hsl(var(--fg-subtle))]">{fmtDate(a.created_at?.slice(0, 10))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {q.notes && (
            <div>
              <div className="label-x mb-1">Notes</div>
              <p className="text-sm text-[hsl(var(--fg-muted))]">{q.notes}</p>
            </div>
          )}

          {srs.last_reviewed && (
            <p className="text-[11px] text-[hsl(var(--fg-subtle))]">
              Last reviewed: {fmtDateLong(srs.last_reviewed)}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-2 border border-border rounded">
      <div className="text-base font-semibold mono">{value}</div>
      <div className="label-x">{label}</div>
    </div>
  );
}
