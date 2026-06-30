import React, { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";
import { REVISIT_PRESETS, TID } from "@/lib/constants";
import { revisitsApi } from "@/lib/api";

/**
 * RevisitMenu — schedules a revisit for any item type.
 * Props: itemType, itemId, itemTitle, itemSubject, onScheduled, label, compact
 */
export default function RevisitMenu({ itemType, itemId, itemTitle = "", itemSubject = null, onScheduled, label = "Revisit", compact = false, className = "" }) {
  const [open, setOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const schedule = async (days, date) => {
    const payload = { item_type: itemType, item_id: itemId, item_title: itemTitle, item_subject: itemSubject };
    if (date) payload.revisit_date = date;
    else payload.days = days;
    const created = await revisitsApi.create(payload);
    setOpen(false);
    setCustomDate("");
    onScheduled?.(created);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-testid={TID.revisitMenuTrigger}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`${compact ? "btn-ghost p-1 text-xs" : "btn"} ${className}`}
        title="Schedule a manual revisit reminder"
      >
        <Clock className="w-3.5 h-3.5" strokeWidth={1.75} /> {!compact && label}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-56 card-1 p-2 shadow-xl animate-modal-in">
          <div className="label-x px-2 py-1">Revisit</div>
          {REVISIT_PRESETS.map((p) => (
            <button
              key={p.days}
              data-testid={TID.revisitOption(p.days)}
              onClick={() => schedule(p.days)}
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-[hsl(var(--bg-elev-2))]"
            >
              {p.label}
            </button>
          ))}
          <div className="border-t border-border my-1" />
          <div className="px-2 pb-1">
            <label className="label-x">Custom date</label>
            <div className="flex gap-1 mt-1">
              <input
                type="date"
                data-testid={TID.revisitCustomDate}
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="input flex-1 text-xs px-2 py-1"
              />
              <button
                onClick={() => customDate && schedule(null, customDate)}
                className="btn btn-primary text-xs px-2 py-1"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
