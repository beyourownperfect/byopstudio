import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Play, ExternalLink } from "lucide-react";
import { questionsApi } from "@/lib/api";
import { SUBJECT_LABELS, TID } from "@/lib/constants";
import { relLabel } from "@/lib/dateUtils";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import RevisitMenu from "@/components/RevisitMenu";
import HelpButton from "@/components/HelpButton";
import { HELP_CONTENT } from "@/lib/helpContent";

export default function Bookmarks() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await questionsApi.list({ filter_mode: "bookmarked" });
    setItems(res.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleBookmark = async (q) => {
    setItems((prev) => prev.filter((i) => i.id !== q.id));
    try { await questionsApi.update(q.id, { bookmarked: false }); }
    catch (err) { console.error("[Bookmarks] Failed to remove bookmark:", err); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="card-2 px-5 py-4">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" /> Bookmarks
          <HelpButton moduleKey="bookmarks" title="Bookmarks" sections={HELP_CONTENT.bookmarks.sections} />
        </h1>
        <p className="text-xs text-[hsl(var(--fg-muted))]">Important questions you starred · {items.length} items</p>
      </div>

      {loading ? (
        <div className="card-2 p-6 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10" />)}</div>
      ) : items.length === 0 ? (
        <div className="card-2 p-12 text-center">
          <p className="font-semibold mb-1">Nothing bookmarked yet.</p>
          <p className="text-xs text-[hsl(var(--fg-muted))]">Star a question from Practice or Repository to keep it here.</p>
        </div>
      ) : (
        <div className="card-2 divide-y divide-border">
          {items.map((q) => (
            <div key={q.id} className="px-4 py-3 row-hover flex items-start gap-3">
              <div className="flex flex-col gap-1 items-center pt-1">
                <span className="chip chip-accent" title={SUBJECT_LABELS[q.subject]}>{q.subject}</span>
                <span className="chip mono text-[10px]">{q.mastery ?? 0}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm leading-snug line-clamp-2"><MarkdownRenderer>{q.statement}</MarkdownRenderer></div>
                <div className="mt-1 text-[11px] text-[hsl(var(--fg-muted))] flex items-center gap-2">
                  <span>{q.topic || "—"}</span>
                  <span>·</span>
                  <span>Next review: {q.next_revision_date ? relLabel(q.next_revision_date) : "—"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleBookmark(q)} className="btn-ghost p-1.5">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </button>
                <RevisitMenu itemType="question" itemId={q.id} itemTitle={q.statement.slice(0, 60)} itemSubject={q.subject} compact />
                <button onClick={() => navigate(`/solve/practice?question=${q.id}`)} className="btn btn-primary"><Play className="w-3.5 h-3.5" /> Practice</button>
                {q.gateoverflow_url && (
                  <a href={q.gateoverflow_url} target="_blank" rel="noreferrer" className="btn-ghost p-1.5"><ExternalLink className="w-4 h-4" /></a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
