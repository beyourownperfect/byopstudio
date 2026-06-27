import React, { useState } from "react";
import { HelpCircle, X } from "lucide-react";

/**
 * Compact contextual-help popup. Triggered by a small "?" icon button.
 * `sections` is an array of { title, body } items.
 */
export default function HelpButton({ moduleKey, title, sections = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={`help-trigger-${moduleKey}`}
        title={`What is ${title}?`}
        className="btn-ghost p-1.5 rounded-full border border-border text-[hsl(var(--fg-muted))] hover:text-[hsl(var(--accent))]"
        aria-label={`Help for ${title}`}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && (
        <div
          data-testid={`help-modal-${moduleKey}`}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-2 sm:p-4"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            className="relative w-full max-w-md rounded-lg border-2 border-border bg-[hsl(var(--bg-elev))]/95 backdrop-blur-md shadow-2xl animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-border">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[hsl(var(--accent))]" />
                <h3 className="font-semibold text-sm">{title} · Quick guide</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                data-testid={`help-close-${moduleKey}`}
                className="btn-ghost p-1"
                aria-label="Close help"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-3 max-h-[70vh] overflow-y-auto">
              {sections.map((s, i) => (
                <div key={i}>
                  <div className="label-x mb-1">{s.title}</div>
                  <p className="text-[13px] leading-relaxed text-[hsl(var(--fg-muted))]">{s.body}</p>
                </div>
              ))}
              <p className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--fg-subtle))] pt-1">
                ~20–30 second read · Press esc to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
