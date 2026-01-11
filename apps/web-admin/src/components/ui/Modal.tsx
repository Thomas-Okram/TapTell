import React, { useEffect } from "react";
import { Button } from "./Button";

export function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  className = "",
}: {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label="Close modal backdrop"
      />
      <div
        className={
          "relative w-full max-w-xl rounded-2xl border border-zinc-200 bg-white shadow-lg " +
          className
        }
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-4">
          <div>
            {title && <div className="text-base font-semibold">{title}</div>}
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="p-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
