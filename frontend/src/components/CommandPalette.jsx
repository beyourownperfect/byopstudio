import React, { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { SUBJECTS, SUBJECT_LABELS, TID } from "@/lib/constants";
import { Search, Zap, BookOpen, Activity, Calendar, Star, AlertCircle } from "lucide-react";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (path) => { setOpen(false); navigate(path); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-32 px-4">
      <div className="absolute inset-0 bg-black/60 animate-overlay-in" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl card-2 overflow-hidden animate-modal-in">
        <Command label="Command Menu" className="w-full">
          <div className="flex items-center px-3 border-b-2 border-border">
            <Search className="w-4 h-4 text-[hsl(var(--fg-muted))]" />
            <Command.Input
              placeholder="Jump to anywhere... (Cmd+K)"
              className="w-full bg-transparent py-3 px-2 text-sm focus:outline-none"
            />
          </div>
          <Command.List className="max-h-[400px] overflow-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-[hsl(var(--fg-muted))]">No results</Command.Empty>

            <Command.Group heading="Navigate" className="mb-2">
              <CmdItem icon={Zap} label="Pulse — Today's Mission" onSelect={() => go("/pulse")} />
              <CmdItem icon={BookOpen} label="Repository" onSelect={() => go("/solve/repository")} />
              <CmdItem icon={Activity} label="Practice" onSelect={() => go("/solve/practice")} />
              <CmdItem icon={Star} label="Bookmarks" onSelect={() => go("/solve/bookmarks")} />
              <CmdItem icon={AlertCircle} label="Mistakes Bank" onSelect={() => go("/solve/mistakes")} />
              <CmdItem icon={Calendar} label="Timeline" onSelect={() => go("/timeline")} />
              <CmdItem icon={Activity} label="Log" onSelect={() => go("/log")} />
            </Command.Group>

            <Command.Group heading="Practice by Subject">
              {SUBJECTS.map((s) => (
                <CmdItem key={s} icon={Activity} label={`Practice ${SUBJECT_LABELS[s]}`}
                  onSelect={() => go(`/solve/practice?subject=${s}`)} />
              ))}
            </Command.Group>

            <Command.Group heading="Filter Repository">
              <CmdItem label="Due today" onSelect={() => go("/solve/repository?filter=due_today")} />
              <CmdItem label="Revisit today" onSelect={() => go("/solve/repository?filter=revisit_today")} />
              <CmdItem label="Wrong" onSelect={() => go("/solve/repository?filter=wrong")} />
              <CmdItem label="Weak" onSelect={() => go("/solve/repository?filter=weak")} />
              <CmdItem label="Never attempted" onSelect={() => go("/solve/repository?filter=never_attempted")} />
              <CmdItem label="Mastered" onSelect={() => go("/solve/repository?filter=mastered")} />
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CmdItem({ icon: Icon, label, onSelect }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-2 px-2 py-2 text-sm rounded cursor-pointer aria-selected:bg-[hsl(var(--bg-elev-2))]"
    >
      {Icon && <Icon className="w-3.5 h-3.5 text-[hsl(var(--fg-muted))]" />}
      {label}
    </Command.Item>
  );
}
