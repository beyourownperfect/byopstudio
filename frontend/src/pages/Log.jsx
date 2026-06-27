import React, { useEffect, useState } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import { logsApi } from "@/lib/api";
import { SUBJECTS, ACTIVITIES, TID } from "@/lib/constants";
import { todayISO, fmtDate, fmtDuration, isoAdd } from "@/lib/dateUtils";
import Modal from "@/components/Modal";

const emptyForm = {
  date: todayISO(), activity: "Practice", subject: "OS", topic: "",
  duration_min: 30, questions_attempted: 0, questions_correct: 0, questions_wrong: 0, remarks: "",
};

export default function Log() {
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState("daily"); // daily, weekly, monthly
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const today = new Date();
    let start;
    if (view === "daily") start = todayISO();
    else if (view === "weekly") start = isoAdd(todayISO(), -7);
    else start = isoAdd(todayISO(), -30);
    const res = await logsApi.list({ start });
    setLogs(res.items || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [view]);

  const submit = async () => {
    await logsApi.create({ ...form, duration_min: Number(form.duration_min) });
    setOpen(false);
    setForm(emptyForm);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete log?")) return;
    await logsApi.remove(id);
    load();
  };

  const byDate = logs.reduce((acc, l) => {
    (acc[l.date] = acc[l.date] || []).push(l);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort().reverse();

  const totalMin = logs.reduce((s, l) => s + (l.duration_min || 0), 0);
  const totalQs = logs.reduce((s, l) => s + (l.questions_attempted || 0), 0);
  const totalCorrect = logs.reduce((s, l) => s + (l.questions_correct || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Log</h1>
          <p className="text-xs text-[hsl(var(--fg-muted))]">Auto-logged from practice & timeline. Manual entries take 10 seconds.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="card-1 p-0.5 flex items-center text-xs">
            {["daily", "weekly", "monthly"].map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded ${view === v ? "bg-[hsl(var(--bg-elev-2))] text-[hsl(var(--fg))]" : "text-[hsl(var(--fg-muted))]"}`}>
                {v}
              </button>
            ))}
          </div>
          <button data-testid={TID.logNewBtn} onClick={() => setOpen(true)} className="btn btn-primary"><Plus className="w-3.5 h-3.5" /> Log session</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <SumCard label="Total time" value={fmtDuration(totalMin)} />
        <SumCard label="Questions" value={totalQs} />
        <SumCard label="Accuracy" value={totalQs ? `${Math.round(totalCorrect / totalQs * 100)}%` : "—"} />
      </div>

      {dates.length === 0 ? (
        <div className="card-2 p-12 text-center">
          <p className="font-semibold mb-1">No logs in this period.</p>
          <p className="text-xs text-[hsl(var(--fg-muted))]">Practice or add a Timeline entry — it auto-logs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dates.map((d) => (
            <div key={d} className="card-2 p-3">
              <div className="text-xs label-x mb-2">{fmtDate(d)}</div>
              <div className="space-y-1 overflow-x-auto">
                {byDate[d].map((l) => (
                  <div key={l.id} className="grid grid-cols-[80px_70px_1fr_80px_60px_40px] items-center gap-2 px-2 py-1.5 rounded row-hover text-sm min-w-[560px]">
                    <span className="chip">{l.activity}</span>
                    <span className="chip mono">{l.subject}</span>
                    <span className="text-[hsl(var(--fg-muted))] truncate">{l.topic || l.remarks || "—"}</span>
                    <span className="mono text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDuration(l.duration_min)}</span>
                    <span className="mono text-xs text-[hsl(var(--fg-muted))]">{l.questions_attempted ? `${l.questions_correct}/${l.questions_attempted}` : "—"}</span>
                    <button onClick={() => remove(l.id)} className="btn-ghost p-1 text-[hsl(var(--danger))]"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Log a study session" size="md" data-testid={TID.logForm}
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn">Cancel</button>
            <button data-testid={TID.logFormSave} onClick={submit} className="btn btn-primary">Save log</button>
          </>
        }>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-x">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input mt-1" />
            </div>
            <div>
              <label className="label-x">Duration (min)</label>
              <input data-testid={TID.logFormDuration} type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} className="input mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-x">Activity</label>
              <select data-testid={TID.logFormActivity} value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} className="input mt-1">
                {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label-x">Subject</label>
              <select data-testid={TID.logFormSubject} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input mt-1">
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label-x">Topic</label>
            <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="input mt-1" placeholder="e.g. Trees" />
          </div>
          {form.activity === "Practice" && (
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label-x">Attempted</label><input type="number" value={form.questions_attempted} onChange={(e) => setForm({ ...form, questions_attempted: Number(e.target.value) })} className="input mt-1" /></div>
              <div><label className="label-x">Correct</label><input type="number" value={form.questions_correct} onChange={(e) => setForm({ ...form, questions_correct: Number(e.target.value) })} className="input mt-1" /></div>
              <div><label className="label-x">Wrong</label><input type="number" value={form.questions_wrong} onChange={(e) => setForm({ ...form, questions_wrong: Number(e.target.value) })} className="input mt-1" /></div>
            </div>
          )}
          <div>
            <label className="label-x">Remarks</label>
            <input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="input mt-1" />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SumCard({ label, value }) {
  return (
    <div className="card-2 p-4">
      <div className="label-x">{label}</div>
      <div className="text-2xl font-semibold mono mt-1">{value}</div>
    </div>
  );
}
