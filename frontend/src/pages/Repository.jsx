import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus, Star, Trash2, Edit3, Play, Upload, Download, ExternalLink, X, ArrowUp, ArrowDown, ArrowUpDown, FileText, HelpCircle } from "lucide-react";
import Papa from "papaparse";
import { questionsApi, seed } from "@/lib/api";
import { SUBJECTS, SUBJECT_LABELS, TID } from "@/lib/constants";
import SubjectSelect from "@/components/SubjectSelect";
import { debounce, relLabel, relDays } from "@/lib/dateUtils";
import QuestionFormModal from "@/components/QuestionFormModal";
import QuestionDetailsModal from "@/components/QuestionDetailsModal";
import OcrPromptModal from "@/components/OcrPromptModal";
import RevisitMenu from "@/components/RevisitMenu";
import HelpButton from "@/components/HelpButton";
import { HELP_CONTENT } from "@/lib/helpContent";

// --- small helpers reused by RepoRow ---

function HighlightedStatement({ statement, search }) {
  // Render a single-line plaintext preview, stripping Markdown/LaTeX for uniform row height.
  // Full rendering is in QuestionDetailsModal on click/double-click.
  const plain = statement
    .replace(/\$\$?[^$]*\$?\$/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_~`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const maxLen = 200;
  const display = plain.length > maxLen ? plain.slice(0, maxLen).trim() + "…" : plain;
  return <span className="text-sm whitespace-nowrap">{display}</span>;
}

function RevBadge({ date }) {
  if (!date) return <span className="text-xs text-[hsl(var(--fg-muted))]">—</span>;
  const days = relDays(date);
  const label = relLabel(date);
  const color =
    days == null ? "text-[hsl(var(--fg-muted))]"
    : days <= 0 ? "chip-danger"
    : days <= 3 ? "chip-warning"
    : "text-[hsl(var(--fg-muted))]";
  return <span className={`text-[11px] ${color}`}>{label}</span>;
}

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

const STORAGE_KEY = "byop.repo.filters.v1";
const readSaved = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
};

export default function Repository() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const saved = useMemo(readSaved, []);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(saved.search || "");
  const [subject, setSubject] = useState(sp.get("subject") || saved.subject || "ALL");
  const [filterMode, setFilterMode] = useState(sp.get("filter") || saved.filterMode || "");
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsId, setDetailsId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [undoBuffer, setUndoBuffer] = useState(null); // { items, expiresAt }
  const [sortBy, setSortBy] = useState(saved.sortBy || { key: "updated_at", dir: "desc" });
  const [ocrOpen, setOcrOpen] = useState(false);
  const [importGuideOpen, setImportGuideOpen] = useState(false);

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

  useEffect(() => { load(); }, [subject, filterMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedSearch = useMemo(() => debounce(() => load(), 220), [subject, filterMode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { debouncedSearch(); return () => debouncedSearch.cancel?.(); }, [search, debouncedSearch]);

  // Persist filters
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ subject, filterMode, search, sortBy }));
    } catch { /* ignore quota */ }
  }, [subject, filterMode, search, sortBy]);

  // Client-side sorting layered over backend list
  const sortedItems = useMemo(() => {
    const arr = [...items];
    const { key, dir } = sortBy || {};
    if (!key) return arr;
    const mult = dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let av, bv;
      switch (key) {
        case "subject": av = a.subject || ""; bv = b.subject || ""; return av.localeCompare(bv) * mult;
        case "type": av = a.question_type || ""; bv = b.question_type || ""; return av.localeCompare(bv) * mult;
        case "statement": av = (a.statement || "").toLowerCase(); bv = (b.statement || "").toLowerCase(); return av.localeCompare(bv) * mult;
        case "mastery": av = a.mastery ?? 0; bv = b.mastery ?? 0; return (av - bv) * mult;
        case "next_revision_date": av = a.next_revision_date || "9999-12-31"; bv = b.next_revision_date || "9999-12-31"; return av.localeCompare(bv) * mult;
        case "next_revisit_date": av = a.next_revisit_date || "9999-12-31"; bv = b.next_revisit_date || "9999-12-31"; return av.localeCompare(bv) * mult;
        default: av = a[key] || ""; bv = b[key] || ""; return String(av).localeCompare(String(bv)) * mult;
      }
    });
    return arr;
  }, [items, sortBy]);

  const toggleSort = (key) => {
    setSortBy((prev) => {
      if (prev?.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "asc" };
    });
  };
  const sortIcon = (key) => {
    if (sortBy?.key !== key) return <ArrowUpDown className="w-2.5 h-2.5 opacity-50" />;
    return sortBy.dir === "asc" ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />;
  };

  const openDetails = (id) => { setDetailsId(id); setDetailsOpen(true); };
  const closeDetails = () => setDetailsOpen(false);

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
      exam_source: r.exam_source, year: r.year, difficulty: r.difficulty, bookmarked: r.bookmarked, notes: r.notes,
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
      gateoverflow_url: q.gateoverflow_url, exam_source: q.exam_source || "GATE", year: q.year || "",
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
  }, [subject, filterMode, setSp]);

  return (
    <div className="space-y-6">
      <div className="card-2 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl font-semibold">Repository</h1>
            <p className="text-xs text-[hsl(var(--fg-muted))]">Single source of truth · {sortedItems.length} questions</p>
          </div>
          <HelpButton moduleKey="repository" title={HELP_CONTENT.repository.title} sections={HELP_CONTENT.repository.sections} />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setOcrOpen(true)} className="btn btn-ghost text-xs" data-testid="repo-ocr-btn" title="Copy OCR prompt for AI">
            <FileText className="w-3.5 h-3.5" /> OCR
          </button>
          <label className="btn cursor-pointer" data-testid={TID.repoImportCsv}>
            <Upload className="w-3.5 h-3.5" /> Import CSV
            <input type="file" accept=".csv" onChange={onImport} className="hidden" />
          </label>
          <button onClick={() => setImportGuideOpen(true)} className="btn btn-ghost p-1.5" title="CSV import guide">
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
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
        <SubjectSelect data-testid={TID.repoSubjectFilter} value={subject} onChange={(e) => setSubject(e.target.value)} className="input max-w-[220px]" allOption />
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
        <div className="overflow-x-auto">
        <div className="min-w-[870px]">
        <div className="grid grid-cols-[28px_44px_40px_1fr_70px_70px_66px_136px] px-4 py-2 text-[10px] font-semibold tracking-[0.12em] uppercase text-[hsl(var(--fg-subtle))] border-b-2 border-border bg-[hsl(var(--bg-elev-2))] sticky top-0 z-10">
          <input type="checkbox" checked={items.length > 0 && selected.size === items.length} onChange={toggleAll} className="accent-[hsl(var(--accent))]" />
          <SortHeader label="Subj" onClick={() => toggleSort("subject")} icon={sortIcon("subject")} />
          <SortHeader label="Type" onClick={() => toggleSort("type")} icon={sortIcon("type")} />
          <SortHeader label="Statement" onClick={() => toggleSort("statement")} icon={sortIcon("statement")} />
          <SortHeader label="Mastery" align="right" onClick={() => toggleSort("mastery")} icon={sortIcon("mastery")} />
          <SortHeader label="Next Rev" align="right" onClick={() => toggleSort("next_revision_date")} icon={sortIcon("next_revision_date")} />
          <SortHeader label="Revisit" align="right" onClick={() => toggleSort("next_revisit_date")} icon={sortIcon("next_revisit_date")} />
          <span className="text-right pr-1">Actions</span>
        </div>

        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="grid grid-cols-[28px_44px_40px_1fr_70px_70px_66px_136px] gap-2.5 px-4 py-2 border-b border-border/50">
              {[...Array(8)].map((_, j) => <div key={j} className="skeleton h-3.5" />)}
            </div>
          ))
        ) : sortedItems.length === 0 ? (
          <EmptyRepo onSeed={onSeed} onNew={startNew} />
        ) : (
          sortedItems.map((q) => (
            <RepoRow key={q.id} q={q} selected={selected.has(q.id)} search={search}
              onToggle={() => toggleSelect(q.id)}
              onBookmark={() => toggleBookmark(q)}
              onEdit={() => startEdit(q)}
              onDelete={() => handleDelete(q.id)}
              onPractice={() => navigate(`/solve/practice?question=${q.id}`)}
              onRevisited={load}
              onOpenDetails={() => openDetails(q.id)}
            />
          ))
        )}
        </div>
        </div>
      </div>

      {/* Undo toast */}
      {undoBuffer && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 card-2 px-4 py-2 flex items-center gap-3 shadow-2xl animate-modal-in">
          <span className="text-sm">Deleted {undoBuffer.rows.length} question(s).</span>
          <button onClick={handleUndo} className="btn btn-primary text-xs">Undo</button>
          <button onClick={() => setUndoBuffer(null)} className="btn-ghost p-1"><X className="w-3 h-3" /></button>
        </div>
      )}

      <OcrPromptModal open={ocrOpen} onClose={() => setOcrOpen(false)} />
      <ImportGuide open={importGuideOpen} onClose={() => setImportGuideOpen(false)} />
      <QuestionFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={load} />
      <QuestionDetailsModal
        open={detailsOpen}
        questionId={detailsId}
        onClose={closeDetails}
        onEdit={(q) => { closeDetails(); startEdit(q); }}
        onPractice={(q) => { closeDetails(); navigate(`/solve/practice?question=${q.id}`); }}
        onBookmarkChanged={load}
      />
    </div>
  );
}

function SortHeader({ label, align, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-[hsl(var(--fg))] transition-colors ${align === "right" ? "justify-end" : ""}`}
      title={`Sort by ${label}`}
    >
      <span>{label}</span> {icon}
    </button>
  );
}

function RepoRow({ q, selected, search, onToggle, onBookmark, onEdit, onDelete, onPractice, onRevisited, onOpenDetails }) {
  const mastery = q.mastery ?? 0;
  const masteryBarColor = mastery >= 80 ? "bg-[hsl(var(--success))]" : mastery >= 40 ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--danger))]";
  const handleDoubleClick = (e) => {
    if (e.target.closest("button, a, input, [data-no-dbl]")) return;
    if (window.getSelection) window.getSelection().removeAllRanges();
    onOpenDetails?.();
  };
  return (
    <div data-testid={TID.repoRow(q.id)}
      onDoubleClick={handleDoubleClick}
      className={`grid grid-cols-[28px_44px_40px_1fr_70px_70px_66px_136px] gap-2 items-center px-4 py-2 border-b border-border/50 text-sm cursor-default select-none transition-colors ${
        selected ? "bg-[hsl(var(--accent))]/10 border-l-2 border-l-[hsl(var(--accent))]" : "hover:bg-[hsl(var(--bg-elev))]/80"
      }`}>
      <input data-testid={TID.repoRowCheckbox(q.id)} type="checkbox" checked={selected} onChange={onToggle} data-no-dbl className="accent-[hsl(var(--accent))]" />

      {/* Subject badge - slightly stronger */}
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold rounded border border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]" title={SUBJECT_LABELS[q.subject]}>
        {q.subject}
      </span>

      {/* Type */}
      <span className="text-[10px] text-[hsl(var(--fg-muted))] mono font-medium">{q.question_type}</span>

      {/* Statement */}
      <div className="min-w-0 truncate" title={[q.statement, q.topic, q.exam_source && `${q.exam_source}${q.year ? ` ${q.year}` : ""}`].filter(Boolean).join(" · ")}>
        <HighlightedStatement statement={q.statement} search={search} />
      </div>

      {/* Mastery bar + percentage */}
      <div className="flex items-center gap-1.5 justify-self-end w-full max-w-[60px]">
        <div className="flex-1 h-1 bg-[hsl(var(--bg-elev-2))] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${masteryBarColor}`} style={{ width: `${mastery}%` }} />
        </div>
        <span className="text-[11px] mono text-[hsl(var(--fg-muted))] w-7 text-right">{mastery}</span>
      </div>

      {/* Next revision - color coded */}
      <div className="justify-self-end">
        <RevBadge date={q.next_revision_date} />
      </div>

      {/* Revisit date */}
      <div className="justify-self-end">
        <RevBadge date={q.next_revisit_date} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 justify-self-end">
        <button data-testid={TID.repoRowBookmark(q.id)} onClick={onBookmark} className="btn-ghost p-1" title="Bookmark">
          <Star className={`w-3.5 h-3.5 ${q.bookmarked ? "fill-yellow-400 text-yellow-400" : "text-[hsl(var(--fg-muted))]"}`} />
        </button>
        <button data-testid={TID.repoRowPractice(q.id)} onClick={onPractice} className="btn-ghost p-1" title="Practice"><Play className="w-3.5 h-3.5" /></button>
        <RevisitMenu itemType="question" itemId={q.id} itemTitle={q.statement.slice(0, 60)} itemSubject={q.subject} onScheduled={onRevisited} compact />
        <button data-testid={TID.repoRowEdit(q.id)} onClick={onEdit} className="btn-ghost p-1" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
        {q.gateoverflow_url && (
          <a href={q.gateoverflow_url} target="_blank" rel="noreferrer" className="btn-ghost p-1 text-[hsl(var(--info))]" title="GateOverflow"><ExternalLink className="w-3.5 h-3.5" /></a>
        )}
        <span className="w-px h-4 bg-border/70 mx-0.5" />
        <button data-testid={TID.repoRowDelete(q.id)} onClick={onDelete} className="btn-ghost p-1 text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger))]/10" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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
        <button onClick={onSeed} className="btn">Load 12 sample questions</button>
      </div>
    </div>
  );
}

function ImportGuide({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card-2 p-6 w-full max-w-lg max-h-[85vh] overflow-auto">
        <button onClick={onClose} className="absolute top-3 right-3 btn-ghost p-1 text-[hsl(var(--fg-muted))] hover:text-[hsl(var(--fg))]">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold mb-1">CSV Import Guide</h3>
        <p className="text-xs text-[hsl(var(--fg-muted))] mb-4">Expected format and columns for bulk question import.</p>

        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-[11px] uppercase tracking-wide text-[hsl(var(--fg-subtle))] mb-1.5">Required Columns</h4>
            <div className="bg-[hsl(var(--bg-elev-2))] rounded-md p-3 text-[11px] space-y-1">
              <div><code className="chip mono text-[10px]">subject</code> <span className="text-[hsl(var(--fg-muted))]">One of: C, DS, AL, OS, DB, COA, TOC, CD, DL, EM, DM, CN</span></div>
              <div><code className="chip mono text-[10px]">question_type</code> <span className="text-[hsl(var(--fg-muted))]">MCQ, MSQ, or NAT</span></div>
              <div><code className="chip mono text-[10px]">statement</code> <span className="text-[hsl(var(--fg-muted))]">Question text. Supports Markdown and LaTeX ($...$)</span></div>
              <div><code className="chip mono text-[10px]">options</code> <span className="text-[hsl(var(--fg-muted))]">Pipe-separated: A&#124;B&#124;C&#124;D (skip for NAT)</span></div>
              <div><code className="chip mono text-[10px]">correct_answer</code> <span className="text-[hsl(var(--fg-muted))]">Index (0=A,1=B) or "A,B" for MSQ, or string for NAT</span></div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-[11px] uppercase tracking-wide text-[hsl(var(--fg-subtle))] mb-1.5">Optional Columns</h4>
            <div className="bg-[hsl(var(--bg-elev-2))] rounded-md p-3 text-[11px] space-y-1">
              <div><code className="chip mono text-[10px]">topic</code><span className="text-[hsl(var(--fg-muted))]"> Sub-topic name</span></div>
              <div><code className="chip mono text-[10px]">explanation</code><span className="text-[hsl(var(--fg-muted))]"> Solution text (Markdown + LaTeX)</span></div>
              <div><code className="chip mono text-[10px]">year</code><span className="text-[hsl(var(--fg-muted))]"> Exam year (integer)</span></div>
              <div><code className="chip mono text-[10px]">exam_source</code><span className="text-[hsl(var(--fg-muted))]"> GATE, ISRO, GO DPP, GO Mock...</span></div>
              <div><code className="chip mono text-[10px]">difficulty</code><span className="text-[hsl(var(--fg-muted))]"> Easy, Medium, Hard</span></div>
              <div><code className="chip mono text-[10px]">gateoverflow_url</code><span className="text-[hsl(var(--fg-muted))]"> Link to discussion</span></div>
              <div><code className="chip mono text-[10px]">bookmarked</code><span className="text-[hsl(var(--fg-muted))]"> true or false</span></div>
              <div><code className="chip mono text-[10px]">notes</code><span className="text-[hsl(var(--fg-muted))]"> Personal notes</span></div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-[11px] uppercase tracking-wide text-[hsl(var(--fg-subtle))] mb-1.5">Example CSV</h4>
            <pre className="bg-[hsl(var(--bg-elev-2))] rounded-md p-3 text-[10px] mono text-[hsl(var(--fg-muted))] overflow-x-auto">
{`subject,question_type,statement,options,correct_answer,difficulty,topic,year
OS,MCQ,What is a page fault?,A CPU interrupt|A memory access error|A disk error|A network error,1,Medium,Memory Management,2021
DS,NAT,Height of a balanced BST with 7 nodes?,,4,Easy,Trees,2019`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold text-[11px] uppercase tracking-wide text-[hsl(var(--fg-subtle))] mb-1.5">Recommended Workflow: OCR → Import</h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-[hsl(var(--fg-muted))]">
              <li>Snap/photocopy the question page from a PDF or book.</li>
              <li>Use the <strong>OCR</strong> button to copy the AI prompt template.</li>
              <li>Paste the prompt into ChatGPT/Claude/Gemini with your image.</li>
              <li>AI returns a CSV-formatted table — copy and save as <code className="mono text-[10px]">.csv</code>.</li>
              <li>Click <strong>Import CSV</strong> to bulk-load into the repository.</li>
              <li>Review imported questions and add explanations/links.</li>
            </ol>
          </div>
        </div>

        <button onClick={onClose} className="btn btn-primary w-full mt-6 text-sm">Got it</button>
      </div>
    </div>
  );
}
