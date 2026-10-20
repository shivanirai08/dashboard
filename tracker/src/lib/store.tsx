import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { bundledCatalog } from "./catalog";
import { supabase } from "./supabase";
import type { AppState, Catalog } from "./types";

const KEY = "gate-cs-tracker-v2";
const ROW = "main";
const TS_KEY = "gate-cs-tracker-updated-at";

const empty: AppState = { mocks: [], mistakes: [], revisions: [], todos: [], pomodoros: [] };

// older saves had `done: boolean` instead of `status`
function normalize(raw: AppState): AppState {
  const todos = (raw.todos ?? []).map((t) => {
    const legacy = t as typeof t & { done?: boolean };
    const { subject, ...rest } = t;
    return { ...rest, subjects: t.subjects ?? (subject ? [subject] : undefined), status: t.status ?? (legacy.done ? "done" : "todo") } as AppState["todos"][number];
  });
  // a "test" is one subject; an earlier multi-subject test is really a custom mock
  const mocks = (raw.mocks ?? []).map((m) => (m.type === "test" && (m.subjects?.length ?? 0) > 1 ? { ...m, type: "custom" as const } : m));
  return { ...empty, ...raw, mocks, todos: migrateRevisions(raw.revisions, migrateBlocks(raw.schedule, todos)), revisions: [], schedule: undefined };
}

// revision topics are tasks too: one due day each, repeated on a growing interval
function migrateRevisions(revs: AppState["revisions"] | undefined, todos: AppState["todos"]): AppState["todos"] {
  if (!revs?.length) return todos;
  return [
    ...todos,
    ...revs.map((r) => ({
      id: r.id, title: r.topic, subjects: r.subject ? [r.subject] : undefined, status: "todo" as const, planned: r.nextDue, createdAt: r.lastReviewed,
      revision: { key: r.id, intervalDays: r.intervalDays, lastReviewed: r.lastReviewed, notes: r.notes || undefined },
    })),
  ];
}

// the planner and the todo list used to be two lists; a time block is now just a task with a time
function migrateBlocks(blocks: AppState["schedule"], todos: AppState["todos"]): AppState["todos"] {
  if (!blocks?.length) return todos;
  const out = todos.map((t) => ({ ...t }));
  const byId = new Map(out.map((t) => [t.id, t]));
  for (const b of [...blocks].sort((a, c) => (a.date + a.start).localeCompare(c.date + c.start))) {
    const t = b.todoId ? byId.get(b.todoId) : undefined;
    if (t && !t.start) {
      Object.assign(t, { planned: b.date, start: b.start, end: b.end });
    } else {
      out.push({ id: b.id, title: b.title, subjects: b.subject ? [b.subject] : undefined, status: b.done ? "done" : "todo", planned: b.date, start: b.start, end: b.end, createdAt: b.date, doneAt: b.done ? b.date : undefined });
    }
  }
  return out;
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw) as AppState) : empty;
  } catch {
    return empty;
  }
}

function persist(state: AppState, ts = new Date().toISOString()) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    localStorage.setItem(TS_KEY, ts);
  } catch {
    /* storage unavailable */
  }
}

const localTs = () => {
  try {
    return localStorage.getItem(TS_KEY) ?? "";
  } catch {
    return "";
  }
};

export type SyncStatus = "off" | "connecting" | "synced" | "saving" | "error";

type Store = {
  state: AppState;
  catalog: Catalog;
  setState: (updater: (prev: AppState) => AppState) => void;
  exportJson: () => string;
  importJson: (raw: string) => void;
  resetProgress: () => void;
  sync: { status: SyncStatus; error?: string };
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<AppState>(() => load());
  const [sync, setSync] = useState<Store["sync"]>({ status: supabase ? "connecting" : "off" });
  const ready = useRef(false); // never push before the first pull finished

  // pull once on load: newest side wins
  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from("tracker_state")
      .select("data, updated_at")
      .eq("id", ROW)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setSync({ status: "error", error: error.message });
          return;
        }
        if (data && data.updated_at > localTs()) {
          const next = normalize(data.data as AppState);
          persist(next, data.updated_at);
          setStateRaw(next);
        }
        ready.current = true;
        setSync({ status: "synced" });
        setStateRaw((s) => ({ ...s })); // first push when local was newer / remote empty
      });
  }, []);

  // debounced push
  useEffect(() => {
    if (!supabase || !ready.current) return;
    const sb = supabase;
    setSync((s) => (s.status === "error" ? s : { status: "saving" }));
    const t = window.setTimeout(async () => {
      const ts = new Date().toISOString();
      const { error } = await sb.from("tracker_state").upsert({ id: ROW, data: state, updated_at: ts });
      if (error) setSync({ status: "error", error: error.message });
      else {
        persist(state, ts);
        setSync({ status: "synced" });
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [state]);

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw((prev) => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, []);

  const importJson = useCallback((raw: string) => setState(() => normalize(JSON.parse(raw) as AppState)), [setState]);

  const value = useMemo<Store>(
    () => ({
      state,
      catalog: bundledCatalog,
      setState,
      exportJson: () => JSON.stringify(state, null, 2),
      importJson,
      resetProgress: () => setState(() => empty),
      sync,
    }),
    [state, setState, importJson, sync],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
