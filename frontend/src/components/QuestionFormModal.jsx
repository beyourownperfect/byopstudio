import React, { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { SUBJECTS, QUESTION_TYPES, DIFFICULTIES, TID } from "@/lib/constants";
import { questionsApi } from "@/lib/api";
import usePasteMarkdown from "@/lib/usePasteMarkdown";

const empty = {
  subject: "OS", topic: "", question_type: "MCQ", statement: "",
  options: ["", "", "", ""], correct_answer: "", explanation: "",
  gateoverflow_url: "", year: "", difficulty: "Medium", bookmarked: false, notes: "",
};

export default function QuestionFormModal({ open, onClose, editing, onSaved }) {
  const [form, setForm] = useState(empty);
  const { onPaste } = usePasteMarkdown();

  useEffect(() => {
    if (editing) {
      setForm({
        ...empty, ...editing,
        options: editing.options?.length ? editing.options : ["", "", "", ""],
        year: editing.year ?? "",
      });
    } else {
      setForm(empty);
    }
  }, [editing, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setOption = (i, v) => setForm((f) => {
    const opts = [...f.options];
    opts[i] = v;
    return { ...f, options: opts };
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
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
            <select data-testid={TID.qFormDifficulty} value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)} className="input mt-1">
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-x">Topic</label>
            <input data-testid={TID.qFormTopic} value={form.topic} onChange={(e) => set("topic", e.target.value)} className="input mt-1" placeholder="e.g. Process Synchronization" />
          </div>
          <div>
            <label className="label-x">Year (PYQ)</label>
            <input data-testid={TID.qFormYear} type="number" value={form.year} onChange={(e) => set("year", e.target.value)} className="input mt-1" placeholder="2024" />
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
    </Modal>
  );
}
