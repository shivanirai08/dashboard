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
import { setDayEnds } from "./dates";
import { supabase } from "./supabase";
import { restoreMultiDayStarts } from "./tasks";
import type { AppState, Catalog } from "./types";

const KEY = "gate-cs-tracker-v2";
// The dev server must never write to the real row: a stale dev copy once overwrote two days of
// progress. Dev gets its own row (seeded from "main", read-only); VITE_SYNC_ROW overrides both.
const MAIN_ROW = "main";
const ROW = (import.meta.env.VITE_SYNC_ROW as string | undefined) ?? (import.meta.env.DEV ? "dev" : MAIN_ROW);
const TABLE = "tracker_state";
const BASE_KEY = "gate-cs-tracker-synced-at"; // the cloud row's updated_at this device last merged
const DIRTY_KEY = "gate-cs-tracker-dirty"; // set by a real edit, cleared once that edit is in the cloud

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

function persist(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

const setBase = (v: string) => {
  try {
    localStorage.setItem(BASE_KEY, v);
  } catch {
    /* storage unavailable */
  }
};
const isDirty = () => {
  try {
    return localStorage.getItem(DIRTY_KEY) === "1";
  } catch {
    return false;
  }
};
const setDirty = (v: boolean) => {
  try {
    if (v) localStorage.setItem(DIRTY_KEY, "1");
    else localStorage.removeItem(DIRTY_KEY);
  } catch {
    /* storage unavailable */
  }
};

type Item = { id: string; updatedAt?: string };

/** stamp edited todos and leave a tombstone for deleted items, so a merge can tell "deleted" from "never seen" */
function stamp(prev: AppState, next: AppState): AppState {
  if (prev === next) return next;
  const now = new Date().toISOString();
  const before = new Map(prev.todos.map((t) => [t.id, JSON.stringify(t)]));
  const todos = next.todos.map((t) => {
    const was = before.get(t.id);
    return was === undefined || was === JSON.stringify(t) ? t : { ...t, updatedAt: now };
  });
  const alive = new Set<string>([...next.todos, ...next.mocks, ...next.mistakes].map((x) => x.id));
  const gone = [...prev.todos, ...prev.mocks, ...prev.mistakes].filter((x) => !alive.has(x.id));
  const deleted = gone.length ? { ...next.deleted, ...Object.fromEntries(gone.map((x) => [x.id, now])) } : next.deleted;
  return { ...next, todos, ...(deleted ? { deleted } : {}) };
}

/** union by id; the same id on both sides goes to `pick`; a tombstone newer than the item removes it */
function mergeItems<T extends Item>(local: T[], remote: T[], deleted: Record<string, string>, pick: (l: T, r: T) => T): T[] {
  const mine = new Map(local.map((x) => [x.id, x]));
  const out: T[] = [];
  const seen = new Set<string>();
  for (const r of remote) {
    seen.add(r.id);
    const l = mine.get(r.id);
    out.push(l ? pick(l, r) : r);
  }
  for (const l of local) if (!seen.has(l.id)) out.push(l);
  return out.filter((x) => !(x.id in deleted) || (x.updatedAt ?? "") > deleted[x.id]);
}

/**
 * Combine this device's state with the cloud copy, item by item (never "whole state, newest wins").
 * - No unsynced edits here: the cloud copy is adopted, so a stale tab can never overwrite newer work.
 * - Unsynced edits: each task / mock / mistake is merged by id, the more recently edited task wins,
 *   deletions are honoured through tombstones, and logged minutes never go down.
 * Focus sessions are append-only, so they are unioned by id everywhere.
 */
function mergeStates(local: AppState, remote: AppState, localDirty: boolean): AppState {
  const seen = new Set<string>();
  const pomodoros = [...local.pomodoros, ...remote.pomodoros]
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (!localDirty) return { ...remote, pomodoros };

  const deleted: Record<string, string> = { ...remote.deleted };
  for (const [id, ts] of Object.entries(local.deleted ?? {})) if (ts > (deleted[id] ?? "")) deleted[id] = ts;
  const time = (t: AppState["todos"][number]) => t.timeMin ?? 0;
  const todos = mergeItems(local.todos, remote.todos, deleted, (l, r) => {
    const win = (l.updatedAt ?? "") > (r.updatedAt ?? "") ? l : r; // tie: the cloud copy
    const other = win === l ? r : l;
    return time(other) > time(win) ? { ...win, timeMin: time(other) } : win;
  });
  const mine = <T,>(l: T) => l; // an edited mock / mistake here is the newer one
  const mocks = mergeItems<AppState["mocks"][number]>(local.mocks, remote.mocks, deleted, mine);
  const mistakes = mergeItems<AppState["mistakes"][number]>(local.mistakes, remote.mistakes, deleted, mine);
  // per-day goal maps are only ever added to, so union them rather than losing the other device's entries
  const goalByDay = { ...remote.goalByDay, ...local.goalByDay };
  const goalFrom = { ...remote.goalFrom, ...local.goalFrom };
  return {
    ...remote,
    ...local,
    todos,
    mocks,
    mistakes,
    pomodoros,
    ...(Object.keys(deleted).length ? { deleted } : {}),
    ...(Object.keys(goalByDay).length ? { goalByDay } : {}),
    ...(Object.keys(goalFrom).length ? { goalFrom } : {}),
  };
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

  setDayEnds(state.dayEnds); // "today" is derived from this, so it must be set before children render

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const editSeq = useRef(0); // bumped by every real edit, so an edit made during a push stays flagged
  const backedUpDay = useRef("");

  // pull the cloud copy and merge it in. Resolves to the merged state plus what the cloud held
  // (null if the pull failed). Dev with no row of its own starts from a read-only copy of "main".
  const pullMerge = useCallback(async () => {
    if (!supabase) return null;
    let { data, error } = await supabase.from(TABLE).select("data, updated_at").eq("id", ROW).maybeSingle();
    if (error) {
      setSync({ status: "error", error: error.message });
      return null;
    }
    const existed = Boolean(data);
    if (!data && ROW !== MAIN_ROW) {
      ({ data } = await supabase.from(TABLE).select("data, updated_at").eq("id", MAIN_ROW).maybeSingle());
    }
    if (!data) return { merged: stateRef.current, base: null as string | null, existed, raw: null as AppState | null };
    const remote = normalize(data.data as AppState);
    const dirty = isDirty() || !existed; // a brand-new row has to receive this device's copy
    const merged = mergeStates(stateRef.current, remote, dirty);
    if (JSON.stringify(merged) !== JSON.stringify(stateRef.current)) {
      persist(merged);
      stateRef.current = merged;
      setStateRaw((prev) => mergeStates(prev, remote, dirty));
    }
    if (existed) setBase(data.updated_at);
    return { merged, base: existed ? (data.updated_at as string) : null, existed, raw: data.data as AppState };
  }, []);

  // push only unsynced edits, and only if nobody wrote since our last pull (compare-and-swap on
  // updated_at); on a lost race re-pull, merge and retry, so no device ever overwrites another's work
  const flush = useCallback(async () => {
    if (!supabase || !ready.current || !isDirty()) return;
    const sb = supabase;
    const seq = editSeq.current;
    setSync((s) => (s.status === "error" ? s : { status: "saving" }));
    for (let attempt = 0; attempt < 4; attempt++) {
      const pulled = await pullMerge();
      if (!pulled) return;
      const ts = new Date().toISOString();
      const day = ts.slice(0, 10);
      if (pulled.existed && pulled.raw && backedUpDay.current !== day) {
        // one cloud snapshot per day, taken before the first overwrite of that day
        await sb.from(TABLE).upsert({ id: `${ROW}-backup-${day}`, data: pulled.raw, updated_at: ts }, { onConflict: "id", ignoreDuplicates: true });
        backedUpDay.current = day;
      }
      const res = pulled.base
        ? await sb.from(TABLE).update({ data: pulled.merged, updated_at: ts }).eq("id", ROW).eq("updated_at", pulled.base).select("updated_at")
        : await sb.from(TABLE).insert({ id: ROW, data: pulled.merged, updated_at: ts }).select("updated_at");
      if (res.error && res.error.code !== "23505") {
        setSync({ status: "error", error: res.error.message });
        return;
      }
      if (!res.error && res.data?.length) {
        setBase(res.data[0].updated_at as string);
        if (editSeq.current === seq) {
          setDirty(false);
          persist(pulled.merged);
        }
        setSync({ status: "synced" });
        return;
      }
      // someone else wrote in between: loop pulls their copy and merges again
    }
    setSync({ status: "error", error: "Sync kept conflicting; will retry on the next change." });
  }, [pullMerge]);

  // pull on load, then again whenever the app comes back to the foreground or the network returns,
  // so a device that sat open (or offline) for days catches up
  useEffect(() => {
    if (!supabase) return;
    void pullMerge().then((pulled) => {
      if (!pulled) return;
      ready.current = true;
      setSync({ status: "synced" });
      if (!pulled.existed) setDirty(true);
      if (isDirty()) void flush();
    });
    const refresh = () => {
      if (!ready.current || document.visibilityState !== "visible") return;
      void (isDirty() ? flush() : pullMerge());
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [pullMerge, flush]);

  // debounced push after an edit (a pull alone never changes `state` into something worth pushing)
  useEffect(() => {
    if (!supabase || !ready.current || !isDirty()) return;
    const t = window.setTimeout(() => void flush(), 800);
    return () => window.clearTimeout(t);
  }, [state, flush]);

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw((prev) => {
      const next = stamp(prev, updater(prev));
      if (next !== prev) {
        editSeq.current++;
        setDirty(true);
      }
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
