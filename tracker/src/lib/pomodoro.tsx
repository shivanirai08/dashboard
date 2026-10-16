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
import { uid } from "./ids";
import { useStore } from "./store";

type Phase = "focus" | "break";
export type TimerMode = "pomodoro" | "open";

type PomodoroApi = {
  mode: TimerMode;
  setMode: (m: TimerMode) => void;
  phase: Phase;
  /** pomodoro: seconds left · open: seconds elapsed */
  remaining: number;
  running: boolean;
  focusMin: number;
  breakMin: number;
  label: string;
  setLabel: (s: string) => void;
  subject: string;
  setSubject: (s: string) => void;
  taskId: string | null;
  /** attach the running/next session to a task (its time gets logged there) */
  focusOnTask: (id: string, title: string, subject?: string) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  /** seconds spent in the current run (0 = untouched) */
  elapsed: number;
  /** end the run: log what was focused (if any) and reset */
  finish: () => void;
  setFocusMin: (n: number) => void;
  setBreakMin: (n: number) => void;
};

const PomodoroContext = createContext<PomodoroApi | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { setState } = useStore();
  const [mode, setModeRaw] = useState<TimerMode>("pomodoro");
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [phase, setPhase] = useState<Phase>("focus");
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const subjectRef = useRef(subject);
  subjectRef.current = subject;
  const labelRef = useRef(label);
  labelRef.current = label;
  const runStart = useRef<Date | null>(null); // when the current run first started
  const taskRef = useRef(taskId);
  taskRef.current = taskId;

  const logSession = useCallback(
    (minutes: number) => {
      if (minutes < 1) return;
      const tid = taskRef.current ?? undefined;
      const end = new Date();
      const start = runStart.current ?? new Date(end.getTime() - minutes * 60_000);
      runStart.current = null;
      setState((prev) => ({
        ...prev,
        pomodoros: [
          { id: uid(), startedAt: start.toISOString(), endedAt: end.toISOString(), minutes, label: labelRef.current.trim() || undefined, taskId: tid, subject: subjectRef.current || undefined, kind: "focus" },
          ...prev.pomodoros,
        ],
        todos: tid ? prev.todos.map((t) => (t.id === tid ? { ...t, timeMin: (t.timeMin ?? 0) + minutes } : t)) : prev.todos,
      }));
    },
    [setState],
  );

  // Tick from the wall clock, not from the interval count: browsers throttle
  // timers in background tabs, which would make a naive "-1 per tick" drift.
  useEffect(() => {
    if (!running) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const delta = Math.max(1, Math.floor((now - last) / 1000));
      last += delta * 1000;
      if (mode === "open") {
        setRemaining((s) => s + delta);
        return;
      }
      setRemaining((s) => {
        if (s > delta) return s - delta;
        setRunning(false);
        chime(phase === "focus" ? "Focus session done — take a break" : "Break over — back to focus");
        if (phase === "focus") {
          logSession(focusMin);
          setPhase("break");
          return breakMin * 60;
        }
        runStart.current = null;
        setPhase("focus");
        return focusMin * 60;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, mode, phase, focusMin, breakMin, logSession]);

  // show the timer in the browser tab title
  useEffect(() => {
    const base = "GATE CSE Tracker";
    const started = mode === "open" ? remaining > 0 : remaining < (phase === "focus" ? focusMin : breakMin) * 60;
    document.title = running || started ? `${running ? "▶" : "⏸"} ${formatClock(remaining)} · ${base}` : base;
  }, [running, remaining, mode, phase, focusMin, breakMin]);

  const setMode = useCallback(
    (m: TimerMode) => {
      setRunning(false);
      runStart.current = null;
      setModeRaw(m);
      setPhase("focus");
      setRemaining(m === "open" ? 0 : focusMin * 60);
    },
    [focusMin],
  );

  const focusOnTask = useCallback((id: string, title: string, subj?: string) => {
    setTaskId(id);
    setLabel(title);
    if (subj) setSubject(subj);
    setState((prev) => ({ ...prev, todos: prev.todos.map((t) => (t.id === id && t.status === "todo" ? { ...t, status: "doing" } : t)) }));
    runStart.current ??= new Date();
    setRunning(true);
  }, [setState]);

  const start = useCallback(() => {
    askNotificationPermission();
    runStart.current ??= new Date();
    setRunning(true);
  }, []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setRunning(false);
    runStart.current = null;
    setRemaining(mode === "open" ? 0 : (phase === "focus" ? focusMin : breakMin) * 60);
  }, [mode, phase, focusMin, breakMin]);

  const skip = useCallback(() => {
    setRunning(false);
    runStart.current = null;
    if (phase === "focus") {
      setPhase("break");
      setRemaining(breakMin * 60);
    } else {
      setPhase("focus");
      setRemaining(focusMin * 60);
    }
  }, [phase, focusMin, breakMin]);

  const elapsed = mode === "open" ? remaining : (phase === "focus" ? focusMin : breakMin) * 60 - remaining;

  const finish = useCallback(() => {
    setRunning(false);
    if (phase === "focus") logSession(Math.round(elapsed / 60));
    runStart.current = null;
    setPhase("focus");
    setRemaining(mode === "open" ? 0 : focusMin * 60);
  }, [phase, elapsed, mode, focusMin, logSession]);

  const value = useMemo<PomodoroApi>(
    () => ({
      mode,
      setMode,
      phase,
      remaining,
      running,
      focusMin,
      breakMin,
      label,
      setLabel: (s) => {
        setLabel(s);
        setTaskId(null);
      },
      subject,
      setSubject,
      taskId,
      focusOnTask,
      start,
      pause,
      reset,
      skip,
      elapsed,
      finish,
      setFocusMin: (n) => {
        setFocusMin(n);
        if (!running && mode === "pomodoro" && phase === "focus") setRemaining(n * 60);
      },
      setBreakMin: (n) => {
        setBreakMin(n);
        if (!running && mode === "pomodoro" && phase === "break") setRemaining(n * 60);
      },
    }),
    [mode, setMode, phase, remaining, running, focusMin, breakMin, label, subject, taskId, focusOnTask, start, pause, reset, skip, elapsed, finish],
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePomodoro(): PomodoroApi {
  const ctx = useContext(PomodoroContext);
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

function chime(message: string) {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g).connect(ctx.destination);
      g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.4);
      o.start(ctx.currentTime + i * 0.25);
      o.stop(ctx.currentTime + i * 0.25 + 0.4);
    });
  } catch {
    /* audio unavailable */
  }
  if ("Notification" in window && Notification.permission === "granted") new Notification(message);
}

/** Ask once (on first Start) so the end-of-session notification can show. */
export function askNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
}
