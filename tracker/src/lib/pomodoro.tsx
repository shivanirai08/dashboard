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
import { todayISO } from "./dates";
import { uid } from "./ids";
import { fromMin, nowHM, toMin } from "./schedule";
import { useStore } from "./store";

/**
 * Focus stopwatch: it counts up from when you press play. Pause to stop the clock, resume to keep
 * going, End to log what you did — against the selected task, or as "extra study" with no task.
 */
type FocusApi = {
  running: boolean;
  /** seconds focused in the current run (0 = untouched) */
  elapsed: number;
  /** the stopwatch has time on it (running or paused) */
  started: boolean;
  label: string;
  setLabel: (s: string) => void;
  subject: string;
  setSubject: (s: string) => void;
  taskId: string | null;
  /** attach the next session to a task (its time gets logged there); null = extra study, logged only in the day's session log */
  selectTask: (id: string | null, title?: string, subject?: string) => void;
  /** play on a task: select it and start/resume (switching from another task logs that one first) */
  focusOnTask: (id: string, title: string, subject?: string) => void;
  start: () => void;
  pause: () => void;
  /** end the run: log what was focused (if any) and reset */
  finish: () => void;
};

const RUN_KEY = "gate-focus-run";
type Saved = { accMs: number; resumeAt: number | null; startedAt: string | null; taskId: string | null; label: string; subject: string };

function loadRun(): Saved {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (raw) return { accMs: 0, resumeAt: null, startedAt: null, taskId: null, label: "", subject: "", ...(JSON.parse(raw) as Partial<Saved>) };
  } catch {
    /* storage unavailable */
  }
  return { accMs: 0, resumeAt: null, startedAt: null, taskId: null, label: "", subject: "" };
}

const FocusContext = createContext<FocusApi | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { setState } = useStore();
  // the run lives in a ref (so it survives re-renders and a page reload); `tick` just redraws it
  const run = useRef<Saved>(loadRun());
  const [, setTick] = useState(0);
  const redraw = () => setTick((n) => n + 1);
  const save = () => {
    try { localStorage.setItem(RUN_KEY, JSON.stringify(run.current)); } catch { /* ignore */ }
    redraw();
  };

  const elapsedMs = () => run.current.accMs + (run.current.resumeAt ? Date.now() - run.current.resumeAt : 0);
  const running = run.current.resumeAt !== null;
  const elapsed = Math.floor(elapsedMs() / 1000);

  // tick from the wall clock, not an interval count: background tabs throttle timers
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(redraw, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // show the timer in the browser tab title
  useEffect(() => {
    const base = "GATE CSE Tracker";
    document.title = elapsed > 0 ? `${running ? "▶" : "⏸"} ${formatClock(elapsed)} · ${base}` : base;
  }, [running, elapsed]);

  /** starting work on a task moves it to in progress (and onto today if it was later / unscheduled) */
  const markStarted = useCallback((id: string) => {
    const today = todayISO();
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((t) => {
        if (t.id !== id || t.status !== "todo") return t;
        if (t.planned && t.planned <= today) return { ...t, status: "doing" };
        const start = nowHM();
        return { ...t, status: "doing", planned: today, start, end: fromMin(toMin(start) + 60) };
      }),
    }));
  }, [setState]);

  const logSession = useCallback((minutes: number) => {
    const r = run.current;
    if (minutes < 1) return;
    const end = new Date();
    const startedAt = r.startedAt ?? new Date(end.getTime() - minutes * 60_000).toISOString();
    const tid = r.taskId ?? undefined;
    setState((prev) => ({
      ...prev,
      pomodoros: [
        { id: uid(), startedAt, endedAt: end.toISOString(), minutes, label: r.label.trim() || undefined, taskId: tid, subject: r.subject || undefined, kind: "focus" },
        ...prev.pomodoros,
      ],
      todos: tid ? prev.todos.map((t) => (t.id === tid ? { ...t, timeMin: (t.timeMin ?? 0) + minutes } : t)) : prev.todos,
    }));
  }, [setState]);

  const start = useCallback(() => {
    const r = run.current;
    if (r.resumeAt) return;
    r.resumeAt = Date.now();
    r.startedAt ??= new Date().toISOString();
    if (r.taskId) markStarted(r.taskId);
    save();
  }, [markStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  const pause = useCallback(() => {
    const r = run.current;
    if (!r.resumeAt) return;
    r.accMs += Date.now() - r.resumeAt;
    r.resumeAt = null;
    save();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback(() => {
    const r = run.current;
    logSession(Math.round(elapsedMs() / 60_000));
    run.current = { accMs: 0, resumeAt: null, startedAt: null, taskId: r.taskId, label: r.label, subject: r.subject };
    save();
  }, [logSession]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTask = useCallback((id: string | null, title?: string, subj?: string) => {
    const r = run.current;
    r.taskId = id;
    r.label = id ? (title ?? "") : "";
    if (id && subj) r.subject = subj;
    save();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const focusOnTask = useCallback((id: string, title: string, subj?: string) => {
    // switching tasks mid-run: bank the time on the previous one first
    if (run.current.taskId !== id && elapsedMs() > 0) finish();
    selectTask(id, title, subj);
    start();
  }, [finish, selectTask, start]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = run.current;
  const value = useMemo<FocusApi>(
    () => ({
      running,
      elapsed,
      started: elapsed > 0,
      label: r.label,
      setLabel: (s) => { run.current.label = s; run.current.taskId = null; save(); },
      subject: r.subject,
      setSubject: (s) => { run.current.subject = s; save(); },
      taskId: r.taskId,
      selectTask,
      focusOnTask,
      start,
      pause,
      finish,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [running, elapsed, r.label, r.subject, r.taskId, selectTask, focusOnTask, start, pause, finish],
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePomodoro(): FocusApi {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("usePomodoro must be used inside PomodoroProvider");
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h ? `${h}:${mm}` : mm;
}
