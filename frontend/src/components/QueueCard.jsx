import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, CheckCircle2, BookOpen, RotateCcw, Target } from "lucide-react";
import { queueApi } from "@/lib/api";
import { relLabel } from "@/lib/dateUtils";
import { SUBJECT_LABELS } from "@/lib/constants";
import { subjectColor } from "@/lib/gateSyllabus";

const GROUP_LABELS = {
  overdue: { label: "Overdue", color: "text-[hsl(var(--danger))]", bg: "bg-[hsl(var(--danger))]/10", border: "border-[hsl(var(--danger))]/30" },
  today: { label: "Today", color: "text-[hsl(var(--accent))]", bg: "bg-[hsl(var(--accent))]/10", border: "border-[hsl(var(--accent))]/30" },
  this_week: { label: "This Week", color: "text-[hsl(var(--info))]", bg: "bg-[hsl(var(--info))]/10", border: "border-[hsl(var(--info))]/30" },
  upcoming: { label: "Upcoming", color: "text-[hsl(var(--fg-muted))]", bg: "bg-[hsl(var(--bg-elev-2))]", border: "border-border" },
};

const KIND_ICONS = {
  srs: RotateCcw,
  timeline_revision: BookOpen,
  revisit: Clock,
  mission: Target,
};

export default function QueueCard() {
  const navigate = useNavigate();
  const { data: queue, isLoading, isError } = useQuery({
    queryKey: ["queue"],
    queryFn: () => queueApi.get(),
    staleTime: 60_000,
  });
  const [expanded, setExpanded] = useState({ overdue: true, today: true, this_week: false, upcoming: false });

  if (isLoading) {
    return (
      <div className="card-2 p-5">
        <div className="skeleton h-20" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card-2 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-[hsl(var(--fg-muted))]" />
          <h3 className="font-semibold text-sm">What should I do next?</h3>
        </div>
        <p className="text-sm text-[hsl(var(--fg-subtle))]">Could not load execution queue.</p>
      </div>
    );
  }

  if (!queue || queue.total === 0) {
    return (
      <div className="card-2 p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
          <h3 className="font-semibold text-sm">Execution queue</h3>
        </div>
        <p className="text-sm text-[hsl(var(--fg-muted))]">All caught up! Add questions or schedule revisions to build your queue.</p>
      </div>
    );
  }

  const toggleGroup = (key) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  return (
    <div className="card-2 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[hsl(var(--accent))]" />
          <h3 className="font-semibold text-sm">What should I do next?</h3>
        </div>
        <span className="chip mono text-[11px]">{queue.total} items</span>
      </div>

      <div className="space-y-1 max-h-[280px] overflow-y-auto">
        {Object.entries(GROUP_LABELS).map(([key, g]) => {
          const items = queue.groups[key] || [];
          if (items.length === 0) return null;
          const isExp = expanded[key];
          return (
            <div key={key}>
              <button
                onClick={() => toggleGroup(key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-left text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-[hsl(var(--bg-elev))]/60`}
              >
                <span className={`${g.color} flex items-center gap-1.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${g.bg.split(" ")[0]}`} />
                  {g.label}
                </span>
                <span className="mono text-[11px] text-[hsl(var(--fg-muted))]">{items.length}</span>
              </button>
              {isExp && (
                <div className="space-y-0.5 mb-1">
                  {items.map((item) => {
                    const Icon = KIND_ICONS[item.kind] || Target;
                    const subjLabel = item.subject ? (SUBJECT_LABELS[item.subject] || item.subject) : "";
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.link)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-[hsl(var(--bg-elev))]/60 transition-colors group"
                      >
                        <Icon className="w-3 h-3 text-[hsl(var(--fg-subtle))] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs truncate">{item.title}</div>
                          <div className="text-[10px] text-[hsl(var(--fg-subtle))] flex items-center gap-1.5">
                            {subjLabel && <span className={`inline-flex items-center px-1.5 py-px rounded border text-[9px] font-semibold ${subjectColor(item.subject).bg} ${subjectColor(item.subject).text} ${subjectColor(item.subject).border}`}>{subjLabel}</span>}
                            <span>{item.meta}</span>
                            {item.due_date && <span>· {relLabel(item.due_date)}</span>}
                          </div>
                        </div>
                        <ArrowRight className="w-3 h-3 text-[hsl(var(--accent))] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
