import { useCallback, useRef } from "react";
import { useToast } from "../components/Toast";
import { addDays, todayISO } from "./dates";
import { uid } from "./ids";
import { nextInterval } from "./revision";
import { fromMin, nowHM, toMin } from "./schedule";
import { missPatch, type Column } from "./tasks";
import { useStore } from "./store";
import type { TaskNote, TodoItem, TodoStatus } from "./types";

const DEFAULT_LEN = 60;

/** A dated task always has a time: the one given, otherwise the current clock time (unless it is all-day, like revisions). */
function withTime(t: TodoItem, patch: Partial<TodoItem>, untimed = false): TodoItem {
  const next = { ...t, ...patch };
  if (!next.planned) {
    delete next.start;
    delete next.end;
    return next;
  }
  if (!next.start && untimed) {
    delete next.end;
  } else {
    if (!next.start) next.start = nowHM();
    if (!next.end || toMin(next.end) <= toMin(next.start)) next.end = fromMin(toMin(next.start) + DEFAULT_LEN);
  }
  if (next.due && next.due < next.planned) next.due = next.planned;
  return next;
}

/** The single place tasks are created and changed — calendar, board, revision page and dashboard all use it. */
export function useTasks() {
  const { state, setState } = useStore();
  const toast = useToast();
  const ref = useRef(state);
  ref.current = state;

  const create = useCallback((d: Partial<TodoItem> & { title: string }, opts: { untimed?: boolean } = {}): TodoItem => {
    const t = withTime({ id: uid(), status: "todo", createdAt: todayISO(), ...d } as TodoItem, {}, opts.untimed);
    if (t.status === "done") t.doneAt = t.doneAt ?? todayISO();
    setState((s) => ({ ...s, todos: [t, ...s.todos] }));
    return t;
  }, [setState]);

  const update = useCallback((id: string, patch: Partial<TodoItem>, opts: { untimed?: boolean } = {}) => {
    setState((s) => ({
      ...s,
      todos: s.todos.map((t) => {
        if (t.id !== id) return t;
        const next = withTime(t, patch, opts.untimed);
        if (next.status === "done") next.doneAt = next.doneAt ?? todayISO();
        else delete next.doneAt;
        return next;
      }),
    }));
  }, [setState]);

  /** Spaced repetition: close this revision and schedule the next one (further out when remembered, tomorrow when forgotten). */
  const review = useCallback((id: string, remembered: boolean) => {
    const t = ref.current.todos.find((x) => x.id === id);
    if (!t?.revision || t.status === "done") return;
    const today = todayISO();
    const interval = remembered ? nextInterval(t.revision.intervalDays) : 1;
    const key = t.revision.key;
    setState((s) => {
      const open = s.todos.some((x) => x.id !== id && x.revision?.key === key && x.status !== "done");
      const todos = s.todos.map((x) => (x.id === id ? { ...x, status: "done" as const, doneAt: today, revision: { ...x.revision!, lastReviewed: today } } : x));
      if (open) return { ...s, todos };
      const nextTask: TodoItem = {
        id: uid(), title: t.title, subjects: t.subjects, priority: t.priority, status: "todo", createdAt: today,
        planned: addDays(today, interval), revision: { ...t.revision!, intervalDays: interval, lastReviewed: today },
      };
      return { ...s, todos: [nextTask, ...todos] };
    });
    toast(remembered ? `Revised · next in ${interval} day${interval > 1 ? "s" : ""}` : "Marked forgotten · again tomorrow");
  }, [setState, toast]);

  const setStatus = useCallback((id: string, status: TodoStatus) => {
    const today = todayISO();
    const cur = ref.current.todos.find((x) => x.id === id);
    if (status === "done" && cur?.revision && cur.status !== "done") return review(id, true);
    setState((s) => ({
      ...s,
      // reopening a revision takes back the repeat that "revised" had scheduled
      todos: s.todos
        .filter((x) => !(cur?.revision && cur.status === "done" && status !== "done" && x.id !== id && x.revision?.key === cur.revision.key && x.status !== "done"))
        .map((t) => {
          if (t.id !== id) return t;
          // starting a task puts it on today
          if (status === "doing" && (!t.planned || t.planned > today)) return withTime(t, { status, planned: today, start: undefined, end: undefined, doneAt: undefined }, !!t.revision);
          const next = { ...t, status };
          if (status === "done") next.doneAt = today;
          else delete next.doneAt;
          return next;
        }),
    }));
  }, [setState, review]);

  const toggleDone = useCallback((t: TodoItem) => setStatus(t.id, t.status === "done" ? "todo" : "done"), [setStatus]);

  /** Put a task on `date` (keeps its length; picks the current time if it had none; all-day revisions stay all-day). */
  const reschedule = useCallback((id: string, date: string, start?: string) => {
    setState((s) => ({
      ...s,
      todos: s.todos.map((t) => {
        if (t.id !== id || t.status === "done") return t; // finished tasks stay where they were done
        const miss = missPatch(t, date) ?? {};
        if (t.revision && !t.start && !start) return withTime(t, { ...miss, planned: date }, true);
        const len = t.start && t.end ? toMin(t.end) - toMin(t.start) : DEFAULT_LEN;
        const st = start ?? nowHM();
        return withTime(t, { ...miss, planned: date, start: st, end: fromMin(toMin(st) + len) });
      }),
    }));
  }, [setState]);

  /** Board drag / status menu. Returns a short note when the task had to be moved to a different day. */
  const moveTo = useCallback((t: TodoItem, col: Column): string | undefined => {
    const today = todayISO();
    if (col === "done") return void setStatus(t.id, "done");
    if (col === "backlog") return void update(t.id, { planned: undefined, due: undefined, status: "todo" });
    if (col === "doing") {
      if (!t.planned || t.planned > today) reschedule(t.id, today);
      return void setStatus(t.id, "doing");
    }
    // "To do" = scheduled for later
    if (!t.planned || t.planned <= today) {
      reschedule(t.id, addDays(today, 1), t.start);
      setStatus(t.id, "todo");
      return "Moved to tomorrow";
    }
    setStatus(t.id, "todo");
  }, [setStatus, update, reschedule]);

  const patchNotes = useCallback((id: string, fn: (notes: TaskNote[]) => TaskNote[]) => {
    setState((s) => ({ ...s, todos: s.todos.map((t) => {
      if (t.id !== id) return t;
      const notes = fn(t.notes ?? []);
      return { ...t, notes: notes.length ? notes : undefined };
    }) }));
  }, [setState]);

  const addNote = useCallback((id: string, text: string) => {
    if (!text.trim()) return;
    patchNotes(id, (n) => [{ id: uid(), text: text.trim(), createdAt: new Date().toISOString() }, ...n]);
  }, [patchNotes]);
  const editNote = useCallback((id: string, noteId: string, text: string) => {
    if (!text.trim()) return;
    patchNotes(id, (n) => n.map((x) => (x.id === noteId ? { ...x, text: text.trim(), updatedAt: new Date().toISOString() } : x)));
  }, [patchNotes]);
  const deleteNote = useCallback((id: string, noteId: string) => patchNotes(id, (n) => n.filter((x) => x.id !== noteId)), [patchNotes]);

  return { create, update, setStatus, toggleDone, reschedule, moveTo, review, addNote, editNote, deleteNote };
}
