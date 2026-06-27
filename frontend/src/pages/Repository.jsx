import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus, Star, Trash2, Edit3, Play, Upload, Download, ExternalLink, X } from "lucide-react";
import Papa from "papaparse";
import { questionsApi, seed } from "@/lib/api";
import { SUBJECTS, TID } from "@/lib/constants";
import { debounce, fmtDate, relLabel } from "@/lib/dateUtils";
import QuestionFormModal from "@/components/QuestionFormModal";
import RevisitMenu from "@/components/RevisitMenu";
import Latex from "@/components/Latex";

const FILTER_MODES = [
  { value: "", label: "All" },
  { value: "due_today", label: "Due today" },
  { value: "revisit_today", label: "Revisit today" },
  { value: "bookmarked", label: "Bookmarked" },
  { value: "wrong", label: "Wrong" },
  { value: "weak", label: "Weak" },
  { value: "never_attempted", label: "Never attempted" },
  { value: "mastered", label: "Mastered" },
];

export default function Repository() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState(sp.get("subject") || "ALL");
  const [filterMode, setFilterMode] = useState(sp.get("filter") || "");
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [undoBuffer, setUndoBuffer] = useState(null); // { items, expiresAt }

  const load = async () => {
    setLoading(true);
    const params = {};
    if (subject !== "ALL") params.subject = subject;
    if (filterMode) params.filter_mode = filterMode;
    if (search) params.search = search;
    const res = await questionsApi.list(params);
    setItems(res.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [subject, filterMode]);

  const debouncedSearch = useMemo(() => debounce(() => load(), 220), [subject, filterMode]);
  useEffect(() => { debouncedSearch(); return () => debouncedSearch.cancel?.(); /* eslint-disable-next-line */ }, [search]);

  const onSeed = async () => { await seed(); load(); };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  // Optimistic bookmark
  const toggleBookmark = async (q) => {
    setItems((prev) => prev.map((it) => it.id === q.id ? { ...it, bookmarked: !it.bookmarked } : it));
    try { await questionsApi.update(q.id, { bookmarked: !q.bookmarked }); }
    catch { load(); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this question?")) return;
    await questionsApi.remove(id);
    load();
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const ids = [...selected];
    const deletedItems = items.filter((i) => ids.includes(i.id));
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    setSelected(new Set());
    await questionsApi.bulkDelete(ids);
    setUndoBuffer({ rows: deletedItems, expiresAt: Date.now() + 5000 });
    setTimeout(() => setUndoBuffer((b) => (b && Date.now() >= b.expiresAt ? null : b)), 5100);
  };

  const handleUndo = async () => {
    if (!undoBuffer) return;
    const rows = undoBuffer.rows.map((r) => ({
      subject: r.subject, topic: r.topic, question_type: r.question_type,
      statement: r.statement, options: r.options, correct_answer: r.correct_answer,
      explanation: r.explanation, gateoverflow_url: r.gateoverflow_url,
      year: r.year, difficulty: r.difficulty, bookmarked: r.bookmarked, notes: r.notes,
    }));
    await questionsApi.bulkCreate(rows);
    setUndoBuffer(null);
    load();
  };

  const onExport = () => {
    const rows = items.map((q) => ({
      subject: q.subject, topic: q.topic, question_type: q.question_type,
      statement: q.statement, options: (q.options || []).join("|"),
      correct_answer: q.correct_answer, explanation: q.explanation,
      gateoverflow_url: q.gateoverflow_url, year: q.year || "",
      difficulty: q.difficulty, bookmarked: q.bookmarked, notes: q.notes,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `byop-questions-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        const rows = res.data.map((r) => ({
          ...r,
          year: r.year ? parseInt(r.year) : null,
          bookmarked: String(r.bookmarked).toLowerCase() === "true",
        }));
        const out = await questionsApi.bulkCreate(rows);
        alert(`Imported ${out.created}. Skipped ${out.skipped}.`);
        load();
      },
    });
    e.target.value = "";
  };

  const startEdit = (q) => { setEditing(q); setFormOpen(true); };
  const startNew = () => { setEditing(null); setFormOpen(true); };

  // Update URL
  useEffect(() => {
    const params = {};
    if (subject !== "ALL") params.subject = subject;
    if (filterMode) params.filter = filterMode;
    setSp(params, { replace: true });
    // eslint-disable-next-line
  }, [subject, filterMode]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Repository</h1>
          <p className="text-xs text-[hsl(var(--fg-muted))]">Single source of truth · {items.length} questions</p>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="btn cursor-pointer" data-testid={TID.repoImportCsv}>
            <Upload className="w-3.5 h-3.5" /> Import CSV
            <input type="file" accept=".csv" onChange={onImport} className="hidden" />
          </label>
          <button onClick={onExport} className="btn" data-testid={TID.repoExportCsv}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={startNew} className="btn btn-primary" data-testid={TID.repoNewBtn}>
            <Plus className="w-3.5 h-3.5" /> New question
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-2 p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--fg-muted))]" />
          <input
            data-testid={TID.repoSearch}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search statements, topics, notes…"
            className="input pl-8"
          />
        </div>
        <select data-testid={TID.repoSubjectFilter} value={subject} onChange={(e) => setSubject(e.target.value)} className="input max-w-[140px]">
          <option value="ALL">All subjects</option>
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select data-testid={TID.repoFilterMode} value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="input max-w-[180px]">
          {FILTER_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        {selected.size > 0 && (
          <button data-testid={TID.repoBulkDelete} onClick={handleBulkDelete} className="btn btn-danger">
            <Trash2 className="w-3.5 h-3.5" /> Delete {selected.size}
          </button>
        )}
      </div>

      {/* List */}
      <div className="card-2 overflow-hidden">
        <div className="grid grid-cols-[28px_60px_70px_1fr_70px_90px_80px_130px] px-3 py-2 text-[10px] font-semibold tracking-wider uppercase text-[hsl(var(--fg-subtle))] border-b-2 border-border">
          <input type="checkbox" checked={items.length > 0 && selected.size === items.length} onChange={toggleAll} />
          <span>Subj</span>
          <span>Type</span>
          <span>Statement</span>
          <span className="text-right">Mastery</span>
          <span className="text-right">Next Rev</span>
          <span className="text-right">Next Revisit</span>
          <span className="text-right pr-1">Actions</span>
        </div>

        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="grid grid-cols-[28px_60px_70px_1fr_70px_90px_80px_130px] gap-2 px-3 py-2.5 border-b border-border">
              {[...Array(8)].map((_, j) => <div key={j} className="skeleton h-4" />)}
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyRepo onSeed={onSeed} onNew={startNew} />
        ) : (
          items.map((q) => (
            <RepoRow key={q.id} q={q} selected={selected.has(q.id)}
              onToggle={() => toggleSelect(q.id)}
              onBookmark={() => toggleBookmark(q)}
              onEdit={() => startEdit(q)}
              onDelete={() => handleDelete(q.id)}
              onPractice={() => navigate(`/solve/practice?question=${q.id}`)}
              onRevisited={load}
            />
          ))
        )}
      </div>

      {/* Undo toast */}
      {undoBuffer && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 card-2 px-4 py-2 flex items-center gap-3 shadow-2xl animate-modal-in">
          <span className="text-sm">Deleted {undoBuffer.rows.length} question(s).</span>
          <button onClick={handleUndo} className="btn btn-primary text-xs">Undo</button>
          <button onClick={() => setUndoBuffer(null)} className="btn-ghost p-1"><X className="w-3 h-3" /></button>
        </div>
      )}

      <QuestionFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={load} />
    </div>
  );
}

function RepoRow({ q, selected, onToggle, onBookmark, onEdit, onDelete, onPractice, onRevisited }) {
  const mastery = q.mastery ?? 0;
  const masteryColor = mastery >= 80 ? "chip-success" : mastery >= 40 ? "chip-warning" : "chip-danger";
  return (
    <div data-testid={TID.repoRow(q.id)}
      className="grid grid-cols-[28px_60px_70px_1fr_70px_90px_80px_130px] gap-2 items-center px-3 py-2.5 border-b border-border row-hover text-sm">
      <input data-testid={TID.repoRowCheckbox(q.id)} type="checkbox" checked={selected} onChange={onToggle} />
      <span className="chip">{q.subject}</span>
      <span className="text-xs text-[hsl(var(--fg-muted))] mono">{q.question_type}</span>
      <div className="min-w-0 truncate" title={q.statement}>
        <span className="text-[hsl(var(--fg-muted))] mr-1 text-xs mono">{q.topic || "—"}</span>
        <Latex>{q.statement.length > 110 ? q.statement.slice(0, 110) + "…" : q.statement}</Latex>
      </div>
      <span className={`chip ${masteryColor} justify-self-end`}>{mastery}</span>
      <span className="text-xs text-[hsl(var(--fg-muted))] justify-self-end">{q.next_revision_date ? relLabel(q.next_revision_date) : "—"}</span>
      <span className="text-xs text-[hsl(var(--fg-muted))] justify-self-end">{q.next_revisit_date ? relLabel(q.next_revisit_date) : "—"}</span>
      <div className="flex items-center gap-0.5 justify-self-end">
        <button data-testid={TID.repoRowBookmark(q.id)} onClick={onBookmark} className="btn-ghost p-1.5" title="Bookmark">
          <Star className={`w-3.5 h-3.5 ${q.bookmarked ? "fill-yellow-400 text-yellow-400" : "text-[hsl(var(--fg-muted))]"}`} />
        </button>
        <button data-testid={TID.repoRowPractice(q.id)} onClick={onPractice} className="btn-ghost p-1.5" title="Practice"><Play className="w-3.5 h-3.5" /></button>
        <RevisitMenu itemType="question" itemId={q.id} itemTitle={q.statement.slice(0, 60)} itemSubject={q.subject} onScheduled={onRevisited} compact />
        <button data-testid={TID.repoRowEdit(q.id)} onClick={onEdit} className="btn-ghost p-1.5" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
        <button data-testid={TID.repoRowDelete(q.id)} onClick={onDelete} className="btn-ghost p-1.5 text-[hsl(var(--danger))]" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
        {q.gateoverflow_url && (
          <a href={q.gateoverflow_url} target="_blank" rel="noreferrer" className="btn-ghost p-1.5 text-[hsl(var(--info))]" title="GateOverflow"><ExternalLink className="w-3.5 h-3.5" /></a>
        )}
      </div>
    </div>
  );
}

function EmptyRepo({ onSeed, onNew }) {
  return (
    <div className="py-16 text-center">
      <p className="text-base font-semibold mb-1">No questions yet</p>
      <p className="text-xs text-[hsl(var(--fg-muted))] mb-5">Refine filters or add a question to start.</p>
      <div className="flex items-center justify-center gap-2">
        <button onClick={onNew} className="btn btn-primary"><Plus className="w-3.5 h-3.5" /> New question</button>
        <button onClick={onSeed} className="btn">Load 8 sample questions</button>
      </div>
    </div>
  );
}
