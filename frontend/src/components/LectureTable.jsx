import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Plus, Trash2, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, BookOpen, X } from "lucide-react";
import { lecturesApi } from "@/lib/api";
import { SUBJECTS } from "@/lib/constants";

const SORT_KEYS = {
  subject: (a, b) => (a.subject || "").localeCompare(b.subject || ""),
  topic: (a, b) => (a.topic || "").localeCompare(b.topic || ""),
  lecture_number: (a, b) => (a.lecture_number || "").localeCompare(b.lecture_number || ""),
};

const GRID_COLS = "grid-cols-[100px_1fr_70px_1fr_70px_70px_90px_54px_54px_40px]";

function sortItems(items, sortBy) {
  if (!sortBy) return items;
  const { key, dir } = sortBy;
  const mult = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => (SORT_KEYS[key]?.(a, b) ?? 0) * mult);
}

export default function LectureTable() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState("ALL");
  const [filterTopic, setFilterTopic] = useState("");
  const [sortBy, setSortBy] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [addOpen, setAddOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");

  const load = useCallback(async () => {
    const params = {};
    if (filterSubject !== "ALL") params.subject = filterSubject;
    const res = await lecturesApi.list(params);
    setItems(res.items || []);
    setLoading(false);
  }, [filterSubject]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const filtered = useMemo(() => {
    if (!filterTopic.trim()) return items;
    const q = filterTopic.toLowerCase();
    return items.filter((l) => (l.topic || "").toLowerCase().includes(q));
  }, [items, filterTopic]);

  const sorted = useMemo(() => sortItems(filtered, sortBy), [filtered, sortBy]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const l of sorted) {
      const s = l.subject || "Other";
      if (!groups[s]) groups[s] = [];
      groups[s].push(l);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [sorted]);

  const saveRef = useRef(null);
  saveRef.current = { save: async (id, update) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...update } : it)));
    try {
      const updated = await lecturesApi.update(id, update);
      if (updated && updated.completion_percent !== undefined) {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, completion_percent: updated.completion_percent } : it)));
      }
    } catch {
      load();
    }
  }, load };

  const save = useCallback((id, update) => saveRef.current.save(id, update), []);

  const startEdit = (id, field, current) => {
    setEditingCell({ id, field });
    setEditValue(current ?? "");
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    let value = editValue;
    if (field === "duration_min" || field === "total_duration_min") {
      value = Math.max(0, parseInt(value) || 0);
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
    }
    save(id, { [field]: value });
    setEditingCell(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") setEditingCell(null);
  };

  const toggleCheck = (id, field, current) => {
    save(id, { [field]: !current });
  };

  const handleDelete = async (id) => {
    await lecturesApi.remove(id);
    load();
  };

  const openAdd = () => {
    setNewSubject("");
    setAddOpen(true);
  };

  const addLecture = async () => {
    if (!newSubject) return;
    await lecturesApi.create({ subject: newSubject, topic: "", lecture_name: "", lecture_number: "", duration_min: 0, total_duration_min: 0, completion_percent: 0, notes_done: false, revision_done: false });
    setAddOpen(false);
    load();
  };

  const toggleSort = (key) => {
    setSortBy((prev) => {
      if (prev?.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "asc" };
    });
  };

  const sortIcon = (key) => {
    if (sortBy?.key !== key) return <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />;
    return sortBy.dir === "asc" ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />;
  };

  const toggleGroup = (subj) => setCollapsed((c) => ({ ...c, [subj]: !c[subj] }));

  const renderCell = (lec, field) => {
    const isEditing = editingCell?.id === lec.id && editingCell?.field === field;
    if (isEditing) {
      if (field === "subject") {
        return (
          <select
            autoFocus
            value={editValue}
            onChange={(e) => { setEditValue(e.target.value); save(lec.id, { [field]: e.target.value }); setEditingCell(null); }}
            onBlur={() => setEditingCell(null)}
            onKeyDown={handleKeyDown}
            className="bg-[hsl(var(--bg-elev-2))] border border-[hsl(var(--accent))] rounded px-1 py-0.5 text-[11px] w-full outline-none"
          >
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        );
      }
      if (field === "duration_min" || field === "total_duration_min") {
        return (
          <input
            autoFocus
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="bg-[hsl(var(--bg-elev-2))] border border-[hsl(var(--accent))] rounded px-1 py-0.5 text-[11px] w-full outline-none mono text-right"
          />
        );
      }
      return (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="bg-[hsl(var(--bg-elev-2))] border border-[hsl(var(--accent))] rounded px-1 py-0.5 text-[11px] w-full outline-none"
        />
      );
    }

    if (field === "completion_percent") {
      const pct = lec.completion_percent ?? 0;
      return (
        <div className="flex items-center gap-1.5 justify-end">
          <div className="w-10 h-1 bg-[hsl(var(--bg-elev-2))] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: pct >= 80 ? "hsl(var(--success))" : pct >= 40 ? "hsl(var(--warning))" : "hsl(var(--danger))",
              }}
            />
          </div>
          <span className="text-[11px] mono text-[hsl(var(--fg-muted))]">{pct}%</span>
        </div>
      );
    }

    if (field === "duration_min" || field === "total_duration_min") {
      const val = lec[field] ?? 0;
      return (
        <span className="text-[11px] mono text-right cursor-pointer hover:text-[hsl(var(--accent))] transition-colors" onClick={() => startEdit(lec.id, field, val)}>
          {val > 0 ? `${val}m` : <span className="text-[hsl(var(--fg-subtle))]">—</span>}
        </span>
      );
    }

    const val = lec[field] ?? "";
    const display = field === "subject"
      ? <span className="text-[11px] font-semibold text-[hsl(var(--accent))]">{val}</span>
      : <span className="text-[11px]">{val || <span className="text-[hsl(var(--fg-subtle))]">—</span>}</span>;

    return (
      <span className="cursor-pointer hover:text-[hsl(var(--accent))] transition-colors" onClick={() => startEdit(lec.id, field, val)}>
        {display}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="card-2 p-5">
        <div className="flex items-center gap-2 mb-4"><div className="skeleton h-4 w-28" /></div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`grid ${GRID_COLS} gap-2 px-3 py-1.5 border-b border-border/30`}>
            {[...Array(10)].map((_, j) => <div key={j} className="skeleton h-3" />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[hsl(var(--info))]" />
          <h3 className="font-semibold text-sm">Lecture Progress</h3>
          <span className="text-[10px] text-[hsl(var(--fg-muted))] mono">{items.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="bg-[hsl(var(--bg))] border border-border rounded px-2 py-1 text-[11px] outline-none focus:border-[hsl(var(--accent))]">
            <option value="ALL">All subjects</option>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            placeholder="Filter topic…"
            className="bg-[hsl(var(--bg))] border border-border rounded px-2 py-1 text-[11px] w-28 outline-none focus:border-[hsl(var(--accent))]"
          />
          <button onClick={openAdd} className="btn-primary text-[11px] px-2 py-1 flex items-center gap-1" title="Add lecture">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {/* Add modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
          <div className="relative card-2 p-6 w-full max-w-sm">
            <button onClick={() => setAddOpen(false)} className="absolute top-3 right-3 btn-ghost p-1 text-[hsl(var(--fg-muted))] hover:text-[hsl(var(--fg))]">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-semibold text-sm mb-4">Add Lecture</h3>
            <label className="label-x mb-1">Subject *</label>
            <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="bg-[hsl(var(--bg-elev-2))] border border-border rounded px-2 py-1.5 text-sm w-full outline-none focus:border-[hsl(var(--accent))] mb-4">
              <option value="">Select subject…</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={addLecture} disabled={!newSubject} className="btn btn-primary w-full text-sm" title={!newSubject ? "Select a subject first" : ""}>
              <Plus className="w-3.5 h-3.5" /> Add Lecture
            </button>
          </div>
        </div>
      )}

      {/* Column header */}
      <div className="overflow-x-auto">
        <div className="min-w-[850px]">
          <div className={`grid ${GRID_COLS} gap-1 px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase text-[hsl(var(--fg-subtle))] border-b border-border bg-[hsl(var(--bg-elev-2))] sticky top-0 z-10`}>
            <SortableHeader label="Subject" sortKey="subject" onClick={toggleSort} icon={sortIcon("subject")} />
            <SortableHeader label="Topic" sortKey="topic" onClick={toggleSort} icon={sortIcon("topic")} />
            <SortableHeader label="Lect #" sortKey="lecture_number" onClick={toggleSort} icon={sortIcon("lecture_number")} />
            <span>Lecture Name</span>
            <span className="text-center">Done</span>
            <span className="text-center">Total</span>
            <span className="text-right">Completion</span>
            <span className="text-center">Notes</span>
            <span className="text-center">Rev</span>
            <span />
          </div>

          {grouped.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-[hsl(var(--fg-muted))] mb-2">No lectures yet</p>
              <button onClick={openAdd} className="btn text-xs"><Plus className="w-3 h-3" /> Add your first lecture</button>
            </div>
          ) : (
            grouped.map(([subject, lectures]) => {
              const isCollapsed = collapsed[subject];
              const completed = lectures.filter((l) => l.completion_percent === 100).length;
              return (
                <div key={subject}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(subject)}
                    className={`grid ${GRID_COLS} gap-1 items-center px-3 py-1 text-[11px] font-semibold bg-[hsl(var(--bg-elev-2))] border-b border-border/60 hover:bg-[hsl(var(--accent))]/[0.04] transition-colors w-full`}
                  >
                    <span className="flex items-center gap-1">
                      <ChevronDown className={`w-3 h-3 text-[hsl(var(--accent))] transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                      <span className="text-[hsl(var(--accent))]">{subject}</span>
                    </span>
                    <span className="text-[hsl(var(--fg-muted))]">{lectures.length} lectures</span>
                    <span />
                    <span />
                    <span className="text-center text-[hsl(var(--fg-muted))]">{lectures.reduce((s, l) => s + (l.duration_min || 0), 0)}m</span>
                    <span className="text-center text-[hsl(var(--fg-muted))]">{lectures.reduce((s, l) => s + (l.total_duration_min || 0), 0)}m</span>
                    <span className="text-right text-[hsl(var(--fg-muted))]">{completed}/{lectures.length} done</span>
                    <span className="text-center text-[hsl(var(--fg-muted))]">{lectures.filter((l) => l.notes_done).length}</span>
                    <span className="text-center text-[hsl(var(--fg-muted))]">{lectures.filter((l) => l.revision_done).length}</span>
                    <span />
                  </button>

                  {!isCollapsed && lectures.map((lec) => (
                    <div
                      key={lec.id}
                      className={`grid ${GRID_COLS} gap-1 items-center px-3 py-1 border-b border-border/30 hover:bg-[hsl(var(--accent))]/[0.03] transition-colors`}
                    >
                      {renderCell(lec, "subject")}
                      {renderCell(lec, "topic")}
                      {renderCell(lec, "lecture_number")}
                      {renderCell(lec, "lecture_name")}
                      {renderCell(lec, "duration_min")}
                      {renderCell(lec, "total_duration_min")}
                      {renderCell(lec, "completion_percent")}
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={lec.notes_done || false}
                          onChange={() => toggleCheck(lec.id, "notes_done", lec.notes_done)}
                          className="accent-[hsl(var(--accent))] cursor-pointer"
                        />
                      </div>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={lec.revision_done || false}
                          onChange={() => toggleCheck(lec.id, "revision_done", lec.revision_done)}
                          className="accent-[hsl(var(--accent))] cursor-pointer"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button onClick={() => handleDelete(lec.id)} className="btn-ghost p-1 text-[hsl(var(--danger))]/70 hover:text-[hsl(var(--danger))]">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function SortableHeader({ label, sortKey, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className="inline-flex items-center gap-1 hover:text-[hsl(var(--fg))] transition-colors"
    >
      <span>{label}</span> {icon}
    </button>
  );
}
