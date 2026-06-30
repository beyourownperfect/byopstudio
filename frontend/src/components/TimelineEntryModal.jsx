import React, { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import RevisitMenu from "@/components/RevisitMenu";
import SubjectSelect from "@/components/SubjectSelect";
import { Trash2, Check, CalendarPlus, Clock } from "lucide-react";
import { timelineApi } from "@/lib/api";
import { ACTIVITIES, CATEGORIES, DEFAULT_CATEGORY, REVISIT_PRESETS, TID } from "@/lib/constants";
import { todayISO, fmtDate, fmtDuration, isoAdd, relLabel } from "@/lib/dateUtils";

const empty = {
  date: todayISO(), subject: "OS", activity: "Lecture", topic: "", title: "",
  duration_min: 60, questions_solved: 0, notes: "", completion_status: "completed",
  category: DEFAULT_CATEGORY,
};

export default function TimelineEntryModal({ open, onClose, entry, onSaved }) {
  const [form, setForm] = useState(empty);
  const [customDate, setCustomDate] = useState("");

  useEffect(() => {
    if (entry && !entry.is_virtual) setForm({ ...empty, ...entry });
    else setForm(empty);
    setCustomDate("");
  }, [entry, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isEdit = entry && entry.id && !entry.is_virtual;

  const save = async () => {
    const payload = {
      ...form,
      duration_min: Number(form.duration_min) || 0,
      questions_solved: Number(form.questions_solved) || 0,
    };
    if (isEdit) await timelineApi.update(entry.id, payload);
    else await timelineApi.create(payload);
    onSaved?.();
    onClose();
  };

  const scheduleRev = async (days) => {
    if (!isEdit) return alert("Save the entry first to schedule revisions.");
    await timelineApi.scheduleRevision(entry.id, { days });
    onSaved?.();
  };

  const scheduleCustom = async () => {
    if (!isEdit || !customDate) return;
    await timelineApi.scheduleRevision(entry.id, { date: customDate });
    setCustomDate("");
    onSaved?.();
  };

  const completeRev = async (date) => {
    await timelineApi.completeRevision(entry.id, { date });
    onSaved?.();
  };

  const remove = async () => {
    if (!isEdit || !window.confirm("Delete this entry?")) return;
    await timelineApi.remove(entry.id);
    onSaved?.();
    onClose();
  };

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? "Edit Timeline entry" : "New Timeline entry"}
      size="lg"
      footer={
        <>
          {isEdit && <button data-testid={TID.tlEntryDelete} onClick={remove} className="btn btn-danger mr-auto"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
          <button onClick={onClose} className="btn">Cancel</button>
          <button data-testid={TID.tlEntryEdit} onClick={save} className="btn btn-primary">{isEdit ? "Save" : "Create"}</button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className="label-x">Date</label><input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="input mt-1" /></div>
          <div><label className="label-x">Subject</label>
            <SubjectSelect value={form.subject} onChange={(e) => set("subject", e.target.value)} className="input mt-1" />
          </div>
          <div><label className="label-x">Activity</label>
            <select value={form.activity} onChange={(e) => set("activity", e.target.value)} className="input mt-1">
              {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label-x">Category</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="input mt-1">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label-x">Title</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className="input mt-1" placeholder="e.g. Process Synchronization — Lecture 1 Complete" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className="label-x">Topic</label><input value={form.topic} onChange={(e) => set("topic", e.target.value)} className="input mt-1" /></div>
          <div><label className="label-x">Duration (min)</label><input type="number" value={form.duration_min} onChange={(e) => set("duration_min", e.target.value)} className="input mt-1" /></div>
          <div><label className="label-x">Questions solved</label><input type="number" value={form.questions_solved} onChange={(e) => set("questions_solved", e.target.value)} className="input mt-1" /></div>
        </div>
        <div>
          <label className="label-x">Notes</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="input mt-1 min-h-[80px]" />
        </div>
        <div>
          <label className="label-x">Completion status</label>
          <select value={form.completion_status} onChange={(e) => set("completion_status", e.target.value)} className="input mt-1 max-w-xs">
            <option value="planned">Planned</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {isEdit && (
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="label-x flex items-center gap-1.5"><CalendarPlus className="w-3 h-3" /> Schedule revisions <span className="text-[hsl(var(--fg-subtle))] lowercase font-normal">(SRS)</span></div>
              <div className="flex flex-wrap gap-1.5">
                {REVISIT_PRESETS.map((p) => (
                  <button key={p.days} data-testid={TID.tlScheduleRev(p.days)} onClick={() => scheduleRev(p.days)} className="btn text-xs">+{p.days}d</button>
                ))}
                <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="input max-w-[140px] text-xs py-1" />
                <button onClick={scheduleCustom} disabled={!customDate} className="btn btn-primary text-xs">Set</button>
              </div>
            </div>
            {entry?.scheduled_revisions?.length > 0 && (
              <div className="mt-2 space-y-1">
                {entry.scheduled_revisions.map((rd) => {
                  const done = (entry.completed_revisions || []).includes(rd);
                  return (
                    <div key={rd} className="flex items-center justify-between px-2 py-1 rounded border border-border">
                      <span className="text-xs">
                        {fmtDate(rd)} <span className="text-[hsl(var(--fg-muted))]">· {relLabel(rd)}</span>
                      </span>
                      {done ? (
                        <span className="chip chip-success"><Check className="w-3 h-3" /> Done</span>
                      ) : (
                        <button data-testid={TID.tlCompleteRev(rd)} onClick={() => completeRev(rd)} className="btn text-xs"><Check className="w-3 h-3" /> Complete</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isEdit && (
          <div className="border-t border-border pt-3 flex items-center justify-between">
            <div className="label-x">Revisit this entry</div>
            <RevisitMenu itemType="timeline_entry" itemId={entry.id} itemTitle={form.title} itemSubject={form.subject} />
          </div>
        )}
      </div>
    </Modal>
  );
}
