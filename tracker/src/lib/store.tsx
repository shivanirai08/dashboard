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
import { restoreMultiDayStarts } from "./tasks";
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

const REPAIR_KEY = "gate-repair-multiday-v1";

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const state = normalize(JSON.parse(raw) as AppState);
    // once: bring multi-day tasks that were pulled forward back to their real start day.
    // The raw save is copied aside first and the flag is only set after the repair worked.
    if (localStorage.getItem(REPAIR_KEY)) return state;
    try {
      localStorage.setItem(`${KEY}-backup-premultiday`, raw);
      const fixed = restoreMultiDayStarts(state);
      if (fixed !== state) persist(fixed);
      localStorage.setItem(REPAIR_KEY, "1");
      return fixed;
    } catch {
      return state;
    }
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

/**
 * Combine this device's state with the cloud copy. Whole-state "newest wins" used to throw away
 * whatever the other side had logged, so devices drifted apart. Focus sessions are append-only,
 * so they are unioned by id (totals and streaks then agree everywhere); everything else follows
 * the newer side, keeping the larger per-task time so a merged task never loses logged minutes.
 */
function mergeStates(local: AppState, remote: AppState, remoteNewer: boolean): AppState {
  const [base, other] = remoteNewer ? [remote, local] : [local, remote];
  const seen = new Set<string>();
  const pomodoros = [...local.pomodoros, ...remote.pomodoros]
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const otherTime = new Map(other.todos.map((t) => [t.id, t.timeMin ?? 0]));
  const todos = base.todos.map((t) => {
    const theirs = otherTime.get(t.id) ?? 0;
    return theirs > (t.timeMin ?? 0) ? { ...t, timeMin: theirs } : t;
  });
  return { ...base, pomodoros, todos };
}

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

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // pull the cloud copy and merge it in; resolves to the merged state (null if the pull failed)
  const pullMerge = useCallback(async (): Promise<AppState | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from("tracker_state").select("data, updated_at").eq("id", ROW).maybeSingle();
    if (error) {
      setSync({ status: "error", error: error.message });
      return null;
    }
    if (!data) return stateRef.current;
    const remote = normalize(data.data as AppState);
    const remoteNewer = data.updated_at > localTs();
    const merged = mergeStates(stateRef.current, remote, remoteNewer);
    if (JSON.stringify(merged) !== JSON.stringify(stateRef.current)) {
      persist(merged, remoteNewer ? data.updated_at : undefined);
      stateRef.current = merged;
      setStateRaw((prev) => mergeStates(prev, remote, remoteNewer));
    }
    return merged;
  }, []);

  // pull on load, then again whenever the app comes back to the foreground or the network returns,
  // so a device that sat open (or offline) for days catches up
  useEffect(() => {
    if (!supabase) return;
    void pullMerge().then((merged) => {
      if (!merged) return;
      ready.current = true;
      setSync({ status: "synced" });
      setStateRaw((s) => ({ ...s })); // first push when local was newer / remote empty
    });
    const refresh = () => {
      if (ready.current && document.visibilityState === "visible") void pullMerge();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [pullMerge]);

  // debounced push: merge the latest cloud copy first so another device's changes are never overwritten
  useEffect(() => {
    if (!supabase || !ready.current) return;
    const sb = supabase;
    setSync((s) => (s.status === "error" ? s : { status: "saving" }));
    const t = window.setTimeout(async () => {
      const merged = await pullMerge();
      if (!merged) return;
      const ts = new Date().toISOString();
      const { error } = await sb.from("tracker_state").upsert({ id: ROW, data: merged, updated_at: ts });
      if (error) setSync({ status: "error", error: error.message });
      else {
        persist(merged, ts);
        setSync({ status: "synced" });
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [state, pullMerge]);

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
