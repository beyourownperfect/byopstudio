import React from "react";

export default function Modal({ open, onClose, title, children, footer, size = "md" }) {
  if (!open) return null;
  const sizeCls = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/70 animate-overlay-in" onClick={onClose} />
      <div className={`relative w-full ${sizeCls} card-2 max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-modal-in`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b-2 border-border">
            <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
            <button onClick={onClose} className="btn-ghost px-2 py-1 text-sm">esc</button>
          </div>
        )}
        <div className="flex-1 overflow-auto p-4 sm:p-5">{children}</div>
        {footer && <div className="px-4 sm:px-5 py-3 border-t-2 border-border flex items-center justify-end gap-2 flex-wrap">{footer}</div>}
      </div>
    </div>
  );
}
