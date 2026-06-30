import React, { useEffect, useState, useMemo } from "react";
import { Wand2 } from "lucide-react";
import Modal from "@/components/Modal";
import { SUBJECTS, QUESTION_TYPES, DIFFICULTIES, EXAM_SOURCES, TID } from "@/lib/constants";
import { questionsApi } from "@/lib/api";
import usePasteMarkdown from "@/lib/usePasteMarkdown";
import { topicsForSubject } from "@/lib/gateSyllabus";

const empty = {
  subject: "OS", topic: "", official_topic: "", question_type: "MCQ", statement: "",
  options: ["", "", "", ""], correct_answer: "", explanation: "",
  gateoverflow_url: "", exam_source: "GATE", exam_source_other: "", year: "", difficulty: "Medium", bookmarked: false, notes: "",
};

/* ── OCR section parser ── */

const SECTION_RE = /^#{1,3}\s*(question|options|custom options|correct answer|explanation)\s*$/i;

function guessTypeFromOptions(opts) {
  const lines = opts.filter((o) => o.trim() !== "");
  if (lines.length === 0) return null;
  // Multi-select: comma-separated letters like A,C,D
  if (/^[A-D](,[A-D])+$/.test(lines[0].trim())) return "MSQ";
  // NAT: answer looks like a number (integer or decimal)
  if (/^\d+(\.\d+)?$/.test(lines[0].trim())) return "NAT";
  return "MCQ";
}

function parseOcrSections(raw) {
  const text = raw.replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const sections = {};
  let currentSection = null;
  let currentContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(SECTION_RE);
    if (m) {
      if (currentSection) sections[currentSection] = currentContent.join("\n").trim();
      currentSection = m[1].toLowerCase().replace(/\s+/g, "_");
      currentContent = [];
    } else {
      if (currentSection) currentContent.push(line);
      else currentContent.push(line);
    }
  }
  if (currentSection) sections[currentSection] = currentContent.join("\n").trim();

  return sections;
}

function parseOptionsBlock(raw) {
  if (!raw) return [];
  const lines = raw.trim().split("\n");
  const opts = [];
  let buf = "";
  let inFence = false;
  const fenceLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      if (inFence) {
        inFence = false;
        buf += "\n" + fenceLines.join("\n") + "\n```";
        fenceLines.length = 0;
        continue;
      }
      inFence = true;
      fenceLines.push(line);
      continue;
    }
    if (inFence) { fenceLines.push(line); continue; }

    // Detect option markers: A), A., [A], (A), A:, A   or   (a)  a)  etc.
    const optMatch = trimmed.match(/^[\[(]?([A-D])[\])]?[.)]?\s/);
    if (optMatch) {
      if (buf.trim()) { opts.push(buf.trim()); buf = ""; }
      opts.push(trimmed);
    } else {
      if (buf) buf += "\n" + line;
      else buf = line;
    }
  }
  if (buf.trim()) opts.push(buf.trim());
  return opts;
}

function parseCorrectAnswer(raw) {
  if (!raw) return "";
  const t = raw.trim();
  // Strip markers like "Answer:" or "Correct:"
  const cleaned = t.replace(/^(answer|correct|correct answer)\s*:?\s*/i, "").trim();
  return cleaned;
}

/* ── Toast (lightweight inline, no external dep) ── */

function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, kind = "success") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, show };
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded border-2 text-sm font-medium shadow-lg transition-all animate-modal-in ${
      toast.kind === "error" ? "bg-[hsl(var(--danger))]/10 border-[hsl(var(--danger))] text-[hsl(var(--danger))]" : "bg-[hsl(var(--success))]/10 border-[hsl(var(--success))] text-[hsl(var(--success))]"
    }`}>
      {toast.msg}
    </div>
  );
}

/* ── Component ── */

export default function QuestionFormModal({ open, onClose, editing, onSaved }) {
  const [form, setForm] = useState(empty);
  const [ocrText, setOcrText] = useState("");
  const { onPaste } = usePasteMarkdown();
  const { toast, show } = useToast();

  useEffect(() => {
    if (editing) {
      setForm({
        ...empty, ...editing,
        options: editing.options?.length ? editing.options : ["", "", "", ""],
        year: editing.year ?? "",
        exam_source_other: editing.exam_source_other || (editing.exam_source && !EXAM_SOURCES.includes(editing.exam_source) ? editing.exam_source : ""),
        exam_source: editing.exam_source && EXAM_SOURCES.includes(editing.exam_source) ? editing.exam_source : "Other",
        difficulty: editing.difficulty || "Medium",
      });
    } else {
      setForm(empty);
    }
  }, [editing, open]);

  const hasAttempts = editing?.srs?.total_attempts > 0;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setOption = (i, v) => setForm((f) => {
    const opts = [...f.options];
    opts[i] = v;
    return { ...f, options: opts };
  });

  const autoFill = () => {
    const raw = ocrText.trim();
    if (!raw) { show("Paste OCR output first", "error"); return; }
    const sections = parseOcrSections(raw);
    const updated = { ...form };
    let filled = 0;

    if (sections.question) {
      updated.statement = sections.question;
      filled++;
    }
    if (sections.options) {
      const opts = parseOptionsBlock(sections.options);
      if (opts.length > 0) {
        updated.options = opts;
        const guessed = guessTypeFromOptions(opts);
        if (guessed) updated.question_type = guessed;
        filled++;
      }
    }
    if (sections.correct_answer) {
      updated.correct_answer = parseCorrectAnswer(sections.correct_answer);
      filled++;
    }
    if (sections.explanation) {
      updated.explanation = sections.explanation;
      filled++;
    }

    setForm(updated);
    if (filled > 0) show(`Filled ${filled} field${filled !== 1 ? "s" : ""}`, "success");
    else show("No recognized sections found. Expected ## Question, ## Options, ## Correct Answer, ## Explanation", "error");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      exam_source: form.exam_source === "Other" ? (form.exam_source_other || "Other") : form.exam_source,
      year: form.year ? parseInt(form.year) : null,
      options: form.question_type === "NAT" ? [] : form.options.filter((o) => o.trim()),
    };
    if (editing) await questionsApi.update(editing.id, payload);
    else await questionsApi.create(payload);
    onSaved?.();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit question" : "New question"}
      size="lg"
      footer={
        <>
          <button data-testid={TID.qFormCancel} onClick={onClose} className="btn">Cancel</button>
          <button data-testid={TID.qFormSave} onClick={onSubmit} className="btn btn-primary">Save</button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* OCR Auto Fill */}
        <div className="card-1 p-3 space-y-2">
          <label className="label-x">Paste OCR output</label>
          <textarea
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            className="input min-h-[80px] text-xs mono"
            placeholder={`## Question\nWhat is the time complexity of binary search?\n\n## Options\nA) O(1)\nB) O(log n)\nC) O(n)\nD) O(n log n)\n\n## Correct Answer\nB\n\n## Explanation\nBinary search halves the search space each iteration.`}
          />
          <button type="button" onClick={autoFill} className="btn text-xs flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5" /> Auto Fill
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-x">Subject</label>
            <select data-testid={TID.qFormSubject} value={form.subject} onChange={(e) => set("subject", e.target.value)} className="input mt-1">
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label-x">Type</label>
            <select data-testid={TID.qFormType} value={form.question_type} onChange={(e) => set("question_type", e.target.value)} className="input mt-1">
              {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label-x">Difficulty</label>
            <select
              data-testid={TID.qFormDifficulty}
              value={form.difficulty}
              onChange={(e) => set("difficulty", e.target.value)}
              className="input mt-1"
              disabled={editing && !hasAttempts}
              title={!hasAttempts && editing ? "Difficulty unlocks after first attempt" : ""}
            >
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {!hasAttempts && editing && <p className="text-[10px] text-[hsl(var(--fg-muted))] mt-0.5">unlocks after first attempt</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-x">Exam / Source</label>
            <select value={form.exam_source} onChange={(e) => set("exam_source", e.target.value)} className="input mt-1">
              {EXAM_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {form.exam_source === "Other" && (
              <input
                value={form.exam_source_other}
                onChange={(e) => set("exam_source_other", e.target.value)}
                className="input mt-1.5"
                placeholder="Specify source"
              />
            )}
          </div>
          <div>
            <label className="label-x">Year (optional)</label>
            <input data-testid={TID.qFormYear} type="number" value={form.year} onChange={(e) => set("year", e.target.value)} className="input mt-1" placeholder="2024" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-x">Topic</label>
            <input data-testid={TID.qFormTopic} value={form.topic} onChange={(e) => set("topic", e.target.value)} className="input mt-1" placeholder="Free-text or pick syllabus below" />
          </div>
          <div>
            <label className="label-x">Syllabus Topic</label>
            <select
              value={form.official_topic}
              onChange={(e) => set("official_topic", e.target.value)}
              className="input mt-1"
            >
              <option value="">— None / Other —</option>
              {topicsForSubject(form.subject).map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label-x">Statement <span className="lowercase text-[hsl(var(--fg-subtle))]">(Markdown + LaTeX; paste HTML → Markdown)</span></label>
          <textarea data-testid={TID.qFormStatement} value={form.statement} onChange={(e) => set("statement", e.target.value)} onPaste={onPaste} className="input mt-1 min-h-[100px]" required />
        </div>

        {form.question_type !== "NAT" ? (
          <div>
            <label className="label-x">Options</label>
            <div data-testid={TID.qFormOptions} className="space-y-2 mt-1">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="mono text-xs text-[hsl(var(--fg-subtle))] w-6">{String.fromCharCode(65 + i)}.</span>
                  <input value={opt} onChange={(e) => setOption(i, e.target.value)} onPaste={onPaste} className="input" placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
            <label className="label-x mt-3 block">Correct answer
              <span className="lowercase text-[hsl(var(--fg-subtle))]"> ({form.question_type === "MCQ" ? "single letter A-D" : "comma-separated letters, e.g. A,C"})</span>
            </label>
            <input data-testid={TID.qFormAnswer} value={form.correct_answer} onChange={(e) => set("correct_answer", e.target.value.toUpperCase())} className="input mt-1" placeholder={form.question_type === "MCQ" ? "A" : "A,C"} />
          </div>
        ) : (
          <div>
            <label className="label-x">Numerical answer</label>
            <input data-testid={TID.qFormAnswer} value={form.correct_answer} onChange={(e) => set("correct_answer", e.target.value)} className="input mt-1" placeholder="e.g. 31 or 3.14" />
          </div>
        )}

        <div>
          <label className="label-x">Explanation</label>
          <textarea data-testid={TID.qFormExplanation} value={form.explanation} onChange={(e) => set("explanation", e.target.value)} onPaste={onPaste} className="input mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-x">GateOverflow link</label>
            <input data-testid={TID.qFormGOLink} value={form.gateoverflow_url} onChange={(e) => set("gateoverflow_url", e.target.value)} className="input mt-1" placeholder="https://gateoverflow.in/..." />
          </div>
          <div>
            <label className="label-x">Notes</label>
            <input data-testid={TID.qFormNotes} value={form.notes} onChange={(e) => set("notes", e.target.value)} onPaste={onPaste} className="input mt-1" placeholder="Personal notes" />
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input data-testid={TID.qFormBookmark} type="checkbox" checked={form.bookmarked} onChange={(e) => set("bookmarked", e.target.checked)} />
          Bookmarked
        </label>
      </form>
      <Toast toast={toast} />
    </Modal>
  );
}
