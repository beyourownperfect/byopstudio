import React, { useEffect, useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { timelineApi, calendarApi, revisitsApi } from "@/lib/api";
import { TID } from "@/lib/constants";
import { todayISO, fmtDate, fmtDateLong, fmtDuration, isoAdd, startOfWeek } from "@/lib/dateUtils";
import TimelineEntryModal from "@/components/TimelineEntryModal";

const VIEWS = ["daily", "weekly", "monthly"];

export default function Timeline() {
  const [view, setView] = useState("monthly");
  const [cursor, setCursor] = useState(new Date()); // current focus date
  const [entries, setEntries] = useState([]);
  const [scheduledRev, setScheduledRev] = useState([]);
  const [calendarDays, setCalendarDays] = useState([]);
  const [revisits, setRevisits] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "daily") return { rangeStart: selectedDate, rangeEnd: selectedDate };
    if (view === "weekly") {
      const sow = startOfWeek(cursor.toISOString().slice(0, 10));
      return { rangeStart: sow, rangeEnd: isoAdd(sow, 6) };
    }
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const end = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    return { rangeStart: start, rangeEnd: end };
  }, [view, cursor, selectedDate]);

  const load = async () => {
    const [t, c, r] = await Promise.all([
      timelineApi.list({ start: rangeStart, end: rangeEnd }),
      calendarApi.range(rangeStart, rangeEnd),
      revisitsApi.list({ start: rangeStart, end: rangeEnd }),
    ]);
    setEntries(t.items || []);
    setScheduledRev(t.scheduled_revisions || []);
    setCalendarDays(c.days || []);
    setRevisits(r.items || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [rangeStart, rangeEnd]);

  const refresh = async () => {
    load();
    if (editing && !editing.is_virtual) {
      const fresh = await timelineApi.get(editing.id).catch(() => null);
      if (fresh) setEditing(fresh);
    }
  };

  const startNew = () => { setEditing({ ...{ date: selectedDate || todayISO() } }); setOpen(true); };
  const openEntry = (e) => { setEditing(e); setOpen(true); };

  const nav = (dir) => {
    const d = new Date(cursor);
    if (view === "daily") d.setDate(d.getDate() + dir);
    else if (view === "weekly") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setCursor(d);
    if (view === "daily") setSelectedDate(d.toISOString().slice(0, 10));
  };

  // Group entries + scheduled revs + revisits by date
  const dayMap = useMemo(() => {
    const m = {};
    for (const e of entries) {
      (m[e.date] = m[e.date] || { entries: [], scheduled: [], revisits: [] }).entries.push(e);
    }
    for (const s of scheduledRev) {
      (m[s.date] = m[s.date] || { entries: [], scheduled: [], revisits: [] }).scheduled.push(s);
    }
    for (const r of revisits) {
      const k = r.revisit_date;
      (m[k] = m[k] || { entries: [], scheduled: [], revisits: [] }).revisits.push(r);
    }
    return m;
  }, [entries, scheduledRev, revisits]);

  const calMap = useMemo(() => Object.fromEntries(calendarDays.map((c) => [c.date, c])), [calendarDays]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><CalIcon className="w-5 h-5 text-[hsl(var(--accent))]" /> Timeline</h1>
          <p className="text-xs text-[hsl(var(--fg-muted))]">Your study calendar & preparation history.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="card-1 p-0.5 flex items-center text-xs">
            <button data-testid={TID.tlViewDaily} onClick={() => setView("daily")} className={`px-3 py-1 rounded ${view === "daily" ? "bg-[hsl(var(--bg-elev-2))]" : "text-[hsl(var(--fg-muted))]"}`}>Daily</button>
            <button data-testid={TID.tlViewWeekly} onClick={() => setView("weekly")} className={`px-3 py-1 rounded ${view === "weekly" ? "bg-[hsl(var(--bg-elev-2))]" : "text-[hsl(var(--fg-muted))]"}`}>Weekly</button>
            <button data-testid={TID.tlViewMonthly} onClick={() => setView("monthly")} className={`px-3 py-1 rounded ${view === "monthly" ? "bg-[hsl(var(--bg-elev-2))]" : "text-[hsl(var(--fg-muted))]"}`}>Monthly</button>
          </div>
          <button data-testid={TID.tlPrev} onClick={() => nav(-1)} className="btn-ghost p-1.5"><ChevronLeft className="w-4 h-4" /></button>
          <button data-testid={TID.tlNext} onClick={() => nav(1)} className="btn-ghost p-1.5"><ChevronRight className="w-4 h-4" /></button>
          <button data-testid={TID.tlNewBtn} onClick={startNew} className="btn btn-primary"><Plus className="w-3.5 h-3.5" /> New entry</button>
        </div>
      </div>

      {view === "monthly" && <MonthlyView cursor={cursor} dayMap={dayMap} calMap={calMap} selectedDate={selectedDate} setSelectedDate={setSelectedDate} openEntry={openEntry} />}
      {view === "weekly" && <WeeklyView rangeStart={rangeStart} dayMap={dayMap} calMap={calMap} openEntry={openEntry} />}
      {view === "daily" && <DailyView date={selectedDate} dayMap={dayMap} calMap={calMap} openEntry={openEntry} />}

      <TimelineEntryModal open={open} onClose={() => setOpen(false)} entry={editing} onSaved={refresh} />
    </div>
  );
}

// ============ MONTHLY ============
function MonthlyView({ cursor, dayMap, calMap, selectedDate, setSelectedDate, openEntry }) {
  const y = cursor.getFullYear(), m = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const first = new Date(y, m, 1);
  const startDay = first.getDay();
  const totalDays = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const dayActivities = (sel) => dayMap[sel] || { entries: [], scheduled: [], revisits: [] };
  const selected = dayActivities(selectedDate);
  const selectedCal = calMap[selectedDate];

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-4">
      <div className="card-2 p-4">
        <div className="text-center text-lg font-semibold mb-3">{monthLabel}</div>
        <div className="grid grid-cols-7 gap-1.5 mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="text-center text-[10px] uppercase tracking-wider text-[hsl(var(--fg-subtle))] py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const ds = d.toISOString().slice(0, 10);
            const data = dayMap[ds];
            const c = calMap[ds];
            const isToday = ds === todayISO();
            const isSelected = ds === selectedDate;
            const totalActivities = (data?.entries?.length || 0) + (data?.scheduled?.length || 0) + (data?.revisits?.length || 0);
            const intensity = c ? Math.min(1, (c.study_minutes / 240) * 0.8 + 0.2) : 0;
            return (
              <button
                key={i}
                data-testid={TID.tlCell(ds)}
                onClick={() => setSelectedDate(ds)}
                className={`aspect-square rounded border-2 p-1.5 text-left flex flex-col justify-between transition-all ${
                  isSelected ? "border-[hsl(var(--accent))]" : isToday ? "border-[hsl(var(--accent))]/40" : "border-border"
                } hover:border-[hsl(var(--accent))]/60`}
                style={c && c.study_minutes > 0 ? { backgroundColor: `hsl(var(--accent) / ${intensity * 0.25})` } : {}}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${isToday ? "font-bold text-[hsl(var(--accent))]" : "text-[hsl(var(--fg-muted))]"}`}>{d.getDate()}</span>
                  {totalActivities > 0 && <span className="text-[9px] mono text-[hsl(var(--fg-muted))]">{totalActivities}</span>}
                </div>
                <div className="space-y-0.5">
                  {c && c.study_minutes > 0 && <div className="text-[9px] mono text-[hsl(var(--fg))]">{fmtDuration(c.study_minutes)}</div>}
                  {data?.scheduled?.length > 0 && <div className="w-full h-0.5 bg-[hsl(var(--warning))] rounded" />}
                  {data?.revisits?.length > 0 && <div className="w-full h-0.5 bg-[hsl(var(--info))] rounded" />}
                  {data?.entries?.length > 0 && <div className="w-full h-0.5 bg-[hsl(var(--success))] rounded" />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-4 text-[10px] text-[hsl(var(--fg-muted))]">
          <Legend color="success" label="Study session" />
          <Legend color="warning" label="Scheduled revision" />
          <Legend color="info" label="Revisit item" />
        </div>
      </div>

      <DayDetail date={selectedDate} data={selected} cal={selectedCal} openEntry={openEntry} />
    </div>
  );
}

function Legend({ color, label }) {
  return <span className="inline-flex items-center gap-1"><span className={`w-2 h-2 rounded-full bg-[hsl(var(--${color}))]`} /> {label}</span>;
}

// ============ WEEKLY ============
function WeeklyView({ rangeStart, dayMap, calMap, openEntry }) {
  const days = [...Array(7)].map((_, i) => isoAdd(rangeStart, i));
  return (
    <div className="grid grid-cols-7 gap-3">
      {days.map((d) => {
        const data = dayMap[d];
        const c = calMap[d];
        const isToday = d === todayISO();
        return (
          <div key={d} className={`card-2 p-3 min-h-[280px] flex flex-col ${isToday ? "border-[hsl(var(--accent))]" : ""}`}>
            <div className="label-x">{new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" })}</div>
            <div className="text-2xl font-semibold mt-0.5">{new Date(d + "T00:00:00").getDate()}</div>
            {c && c.study_minutes > 0 && <div className="text-[10px] mono text-[hsl(var(--fg-muted))]">{fmtDuration(c.study_minutes)}</div>}
            <div className="mt-3 space-y-1.5 flex-1 overflow-auto">
              {data?.entries?.map((e) => (
                <button data-testid={TID.tlEntry(e.id)} key={e.id} onClick={() => openEntry(e)} className="w-full text-left p-1.5 rounded border border-border row-hover">
                  <div className="text-[10px] mono text-[hsl(var(--fg-subtle))]">{e.subject} · {e.activity}</div>
                  <div className="text-xs truncate font-medium">{e.title}</div>
                </button>
              ))}
              {data?.scheduled?.map((s) => (
                <button key={s.id} onClick={() => openEntry({ id: s.parent_id })} className="w-full text-left p-1.5 rounded border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5">
                  <div className="text-[10px] mono text-[hsl(var(--warning))]">REVISION</div>
                  <div className="text-xs truncate">{s.title}</div>
                </button>
              ))}
              {data?.revisits?.map((r) => (
                <div key={r.id} className="p-1.5 rounded border border-[hsl(var(--info))]/40 bg-[hsl(var(--info))]/5">
                  <div className="text-[10px] mono text-[hsl(var(--info))]">REVISIT · {r.item_type}</div>
                  <div className="text-xs truncate">{r.item_title}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ DAILY ============
function DailyView({ date, dayMap, calMap, openEntry }) {
  const data = dayMap[date] || { entries: [], scheduled: [], revisits: [] };
  const cal = calMap[date];
  return <DayDetail date={date} data={data} cal={cal} openEntry={openEntry} fullWidth />;
}

function DayDetail({ date, data, cal, openEntry, fullWidth }) {
  return (
    <div className={`card-2 p-4 ${fullWidth ? "" : ""}`}>
      <div className="border-b-2 border-border pb-3 mb-3">
        <div className="label-x">Selected day</div>
        <h2 className="text-lg font-semibold">{fmtDateLong(date)}</h2>
      </div>

      {cal && (
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <Stat label="Hours" value={cal.study_hours} />
          <Stat label="Questions" value={cal.questions_solved} />
          <Stat label="Revisions" value={cal.revisions_completed} />
        </div>
      )}

      <Section title="Study sessions" count={data.entries.length}>
        {data.entries.length === 0 ? <Empty msg="Nothing logged for this day." /> : data.entries.map((e) => (
          <button data-testid={TID.tlEntry(e.id)} key={e.id} onClick={() => openEntry(e)} className="w-full text-left p-2 rounded border border-border row-hover">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="chip">{e.subject}</span>
                <span className="chip">{e.activity}</span>
                {e.duration_min > 0 && <span className="text-[11px] text-[hsl(var(--fg-muted))]">{fmtDuration(e.duration_min)}</span>}
              </div>
              {e.scheduled_revisions?.length > 0 && <span className="chip chip-warning">{e.scheduled_revisions.length} rev</span>}
            </div>
            <div className="mt-1 text-sm font-medium">{e.title}</div>
            {e.topic && <div className="text-[11px] text-[hsl(var(--fg-muted))] mt-0.5">{e.topic}</div>}
          </button>
        ))}
      </Section>

      {data.scheduled.length > 0 && (
        <Section title="Scheduled revisions due" count={data.scheduled.length}>
          {data.scheduled.map((s) => (
            <button key={s.id} onClick={() => openEntry({ id: s.parent_id })} className="w-full text-left p-2 rounded border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5">
              <div className="flex items-center gap-2"><span className="chip chip-warning">{s.subject}</span><span className="text-[11px] text-[hsl(var(--fg-muted))] mono">REVISION</span></div>
              <div className="text-sm font-medium mt-1">{s.title}</div>
            </button>
          ))}
        </Section>
      )}

      {data.revisits.length > 0 && (
        <Section title="Revisit items" count={data.revisits.length}>
          {data.revisits.map((r) => (
            <div key={r.id} className="p-2 rounded border border-[hsl(var(--info))]/40 bg-[hsl(var(--info))]/5">
              <div className="flex items-center gap-2"><span className="chip chip-accent">{r.item_subject || r.item_type}</span><span className="text-[11px] text-[hsl(var(--fg-muted))] mono uppercase">{r.item_type.replace("_", " ")}</span></div>
              <div className="text-sm font-medium mt-1">{r.item_title || "Untitled"}</div>
              {r.completed && <span className="chip chip-success mt-1 inline-flex">Done</span>}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <div className="mb-4">
      <div className="label-x mb-2 flex items-center justify-between"><span>{title}</span><span className="mono">{count}</span></div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-2 border border-border rounded">
      <div className="text-2xl font-semibold mono">{value || 0}</div>
      <div className="label-x">{label}</div>
    </div>
  );
}

function Empty({ msg }) {
  return <div className="text-[11px] text-[hsl(var(--fg-muted))] py-2">{msg}</div>;
}
