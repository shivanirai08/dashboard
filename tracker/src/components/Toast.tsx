import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; msg: string; undo?: () => void };
const Ctx = createContext<(msg: string, undo?: () => void) => void>(() => {});

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push = useCallback((msg: string, undo?: () => void) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg, undo }]);
    window.setTimeout(() => dismiss(id), 6000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 lg:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
            {t.msg}
            {t.undo && (
              <button className="cursor-pointer font-semibold text-indigo-300 hover:underline dark:text-indigo-600" onClick={() => { t.undo?.(); dismiss(t.id); }}>Undo</button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
