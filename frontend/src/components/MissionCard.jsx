import React, { useEffect, useState } from "react";
import {
  Target, Plus, Check, Trash2, GripVertical,
  Pencil, X as XIcon,
} from "lucide-react";
import { userMissionsApi } from "@/lib/api";

export default function MissionCard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const res = await userMissionsApi.list();
    setItems(res.items || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e?.preventDefault();
    const t = newTitle.trim();
    if (!t) return;
    setNewTitle("");
    const created = await userMissionsApi.create({ title: t });
    setItems((cur) => [...cur, created]);
  };

  const toggle = async (m) => {
    setItems((cur) => cur.map((x) => x.id === m.id ? { ...x, completed: !x.completed } : x));
    try { await userMissionsApi.update(m.id, { completed: !m.completed }); }
    catch { load(); }
  };

  const remove = async (m) => {
    setItems((cur) => cur.filter((x) => x.id !== m.id));
    try { await userMissionsApi.remove(m.id); }
    catch { load(); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const t = (editing.title || "").trim();
    if (!t) { setEditing(null); return; }
    const id = editing.id;
    setItems((cur) => cur.map((x) => x.id === id ? { ...x, title: t } : x));
    setEditing(null);
    try { await userMissionsApi.update(id, { title: t }); }
    catch { load(); }
  };

  const move = async (idx, dir) => {
    const incomplete = items.filter((x) => !x.completed);
    const j = idx + dir;
    if (j < 0 || j >= incomplete.length) return;
    const newIncomplete = [...incomplete];
    [newIncomplete[idx], newIncomplete[j]] = [newIncomplete[j], newIncomplete[idx]];
    const completed = items.filter((x) => x.completed);
    setItems([...newIncomplete, ...completed]);
    try { await userMissionsApi.reorder(newIncomplete.map((x) => x.id)); }
    catch { load(); }
  };

  const incomplete = items.filter((x) => !x.completed);
  const completed = items.filter((x) => x.completed);

  return (
    <div className="card-2 p-5" data-testid="pulse-mission-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[hsl(var(--accent))]" />
          <h2 className="font-semibold">Today&apos;s Mission</h2>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--fg-subtle))]">
          {incomplete.length} active · {completed.length} done
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="skeleton h-9" />)}</div>
      ) : (
        <div className="space-y-1.5">
          {incomplete.length === 0 && completed.length === 0 && (
            <p className="text-xs text-[hsl(var(--fg-muted))]">
              No tasks yet. Add anything you want to commit to today.
            </p>
          )}

          {incomplete.map((m, i) => (
            <div
              key={m.id}
              data-testid={`mission-user-${m.id}`}
              className="group px-2 py-1.5 rounded border border-border row-hover flex items-center gap-2"
            >
              <span className="text-[hsl(var(--fg-subtle))] cursor-grab" title="Use ↑/↓ to reorder">
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <button
                onClick={() => toggle(m)}
                data-testid={`mission-user-toggle-${m.id}`}
                className="w-4 h-4 rounded border-2 border-border flex items-center justify-center hover:border-[hsl(var(--accent))]"
                aria-label="Mark complete"
              />
              {editing?.id === m.id ? (
                <input
                  autoFocus
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  onBlur={saveEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }}
                  className="input flex-1 h-7 text-sm"
                  data-testid={`mission-user-edit-input-${m.id}`}
                />
              ) : (
                <span
                  onDoubleClick={() => setEditing({ id: m.id, title: m.title })}
                  className="flex-1 text-sm truncate select-none"
                  title="Double-click to edit"
                >
                  {m.title}
                </span>
              )}
              <div className="hidden sm:flex items-center gap-0.5">
                <button onClick={() => move(i, -1)} disabled={i === 0}
                  data-testid={`mission-user-up-${m.id}`}
                  className="btn-ghost p-1 text-xs disabled:opacity-30" aria-label="Move up">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === incomplete.length - 1}
                  data-testid={`mission-user-down-${m.id}`}
                  className="btn-ghost p-1 text-xs disabled:opacity-30" aria-label="Move down">▼</button>
              </div>
              <button onClick={() => setEditing({ id: m.id, title: m.title })}
                data-testid={`mission-user-edit-${m.id}`}
                className="btn-ghost p-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Edit">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => remove(m)}
                data-testid={`mission-user-delete-${m.id}`}
                className="btn-ghost p-1 text-[hsl(var(--danger))] opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {completed.length > 0 && (
            <div className="pt-2 mt-2 border-t border-border/60 space-y-1">
              {completed.map((m) => (
                <div
                  key={m.id}
                  data-testid={`mission-user-done-${m.id}`}
                  className="group px-2 py-1.5 rounded flex items-center gap-2 text-[hsl(var(--fg-muted))]"
                >
                  <button
                    onClick={() => toggle(m)}
                    data-testid={`mission-user-toggle-${m.id}`}
                    className="w-4 h-4 rounded border-2 border-[hsl(var(--success))] bg-[hsl(var(--success))]/15 flex items-center justify-center"
                    aria-label="Mark incomplete"
                  >
                    <Check className="w-3 h-3 text-[hsl(var(--success))]" />
                  </button>
                  <span className="flex-1 text-sm line-through truncate">{m.title}</span>
                  <button onClick={() => remove(m)}
                    data-testid={`mission-user-delete-${m.id}`}
                    className="btn-ghost p-1 text-[hsl(var(--danger))] opacity-0 group-hover:opacity-100" aria-label="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={add} className="mt-3 flex items-center gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task… (e.g. revise OS scheduling)"
          data-testid="mission-user-input"
          className="input flex-1 h-9 text-sm"
          maxLength={200}
        />
        <button type="submit" disabled={!newTitle.trim()}
          data-testid="mission-user-add"
          className="btn btn-primary disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
        {newTitle && (
          <button type="button" onClick={() => setNewTitle("")} className="btn-ghost p-1.5">
            <XIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </form>
    </div>
  );
}
