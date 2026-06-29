import React, { useEffect, useRef } from "react";
import { Copy, X } from "lucide-react";

const OCR_PROMPT =
  "Extract the question into clean Markdown. Preserve paragraphs, lists, tables, code blocks and indentation. Convert all mathematics to LaTeX (`$...$`, `$$...$$`). Do not summarize or solve. If text is unreadable, write `[unclear]`. Return only: **Question**, **Options**, **Correct Answer** (if visible), **Explanation** (if visible).";

export default function OcrPromptModal({ open, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const copy = async () => {
    await navigator.clipboard.writeText(OCR_PROMPT);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        className="relative max-w-lg w-full rounded-lg border-2 border-border bg-[hsl(var(--bg))]/90 backdrop-blur-md shadow-2xl animate-modal-in"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">OCR Prompt</h3>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4">
          <pre className="text-sm leading-relaxed text-[hsl(var(--fg))] whitespace-pre-wrap font-sans bg-[hsl(var(--bg-elev-2))] p-3 rounded border border-border">
            {OCR_PROMPT}
          </pre>
          <p className="text-[11px] text-[hsl(var(--fg-muted))] mt-3">
            Paste this prompt into an AI tool with a screenshot of the question.
            Copy the returned Markdown into the New Question form.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button onClick={copy} className="btn btn-primary text-xs">
            <Copy className="w-3.5 h-3.5" /> Copy Prompt
          </button>
          <button onClick={onClose} className="btn text-xs">Close</button>
        </div>
      </div>
    </div>
  );
}
