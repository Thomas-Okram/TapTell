import React, { createContext, useContext, useMemo, useState } from "react";

type Toast = { id: string; title: string; message?: string };
const Ctx = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(
  null
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = (t: Omit<Toast, "id">) => {
    const id = String(Date.now()) + Math.random().toString(16).slice(2);
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 3000);
  };

  const value = useMemo(() => ({ push }), []);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {items.map((t) => (
          <div
            key={t.id}
            className="w-80 rounded-2xl border border-zinc-200 bg-white p-3 shadow"
          >
            <div className="text-sm font-semibold">{t.title}</div>
            {t.message && (
              <div className="mt-1 text-sm text-zinc-600">{t.message}</div>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToasts() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToasts must be used inside ToastProvider");
  return v;
}
