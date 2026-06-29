import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, AlertCircle } from "lucide-react";
import { mistakesApi } from "@/lib/api";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import RevisitMenu from "@/components/RevisitMenu";

const MODES = [
  { value: "all", label: "All wrong" },
  { value: "wrong_today", label: "Wrong today" },
  { value: "frequently_wrong", label: "Frequently wrong (2+)" },
  { value: "forgotten", label: "Forgotten" },
  { value: "bookmarked_mistakes", label: "Bookmarked mistakes" },
];

export default function Mistakes() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await mistakesApi.get(mode);
    setItems(res.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const practiceAll = () => {
    if (items.length === 0) return;
    navigate("/solve/practice?mode=wrong");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><AlertCircle className="w-5 h-5 text-[hsl(var(--danger))]" /> Mistakes Bank</h1>
          <p className="text-xs text-[hsl(var(--fg-muted))]">Where you slipped · {items.length} questions</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="input max-w-[220px]">
            {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button onClick={practiceAll} disabled={items.length === 0} className="btn btn-primary"><Play className="w-3.5 h-3.5" /> Practice Mistakes</button>
        </div>
      </div>

      {loading ? (
        <div className="card-2 p-6 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10" />)}</div>
      ) : items.length === 0 ? (
        <div className="card-2 p-12 text-center">
          <p className="font-semibold mb-1">No mistakes here.</p>
          <p className="text-xs text-[hsl(var(--fg-muted))]">Either nothing wrong yet, or you&apos;re crushing it.</p>
        </div>
      ) : (
        <div className="card-2 divide-y divide-border">
          {items.map((q) => (
            <div key={q.id} className="px-4 py-3 row-hover flex items-start gap-3">
              <span className="chip chip-danger">{q.subject}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm leading-snug line-clamp-2"><MarkdownRenderer>{q.statement}</MarkdownRenderer></div>
                <div className="mt-1 text-[11px] text-[hsl(var(--fg-muted))]">{q.topic || "—"} · {q.question_type}</div>
              </div>
              <div className="flex items-center gap-1">
                <RevisitMenu itemType="question" itemId={q.id} itemTitle={q.statement.slice(0, 60)} itemSubject={q.subject} compact />
                <button onClick={() => navigate(`/solve/practice?question=${q.id}`)} className="btn"><Play className="w-3.5 h-3.5" /> Solve</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
