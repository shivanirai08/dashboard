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
  taskId: string | null;
  /** attach the running/next session to a task (its time gets logged there) */
  focusOnTask: (id: string, title: string) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  /** open timer: log the elapsed time as a session and reset */
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
  const labelRef = useRef(label);
  labelRef.current = label;
  const taskRef = useRef(taskId);
  taskRef.current = taskId;

  const logSession = useCallback(
    (minutes: number) => {
      if (minutes < 1) return;
      const tid = taskRef.current ?? undefined;
      setState((prev) => ({
        ...prev,
        pomodoros: [
          { id: uid(), startedAt: new Date().toISOString(), minutes, label: labelRef.current.trim() || undefined, taskId: tid, kind: "focus" },
          ...prev.pomodoros,
        ],
        todos: tid ? prev.todos.map((t) => (t.id === tid ? { ...t, timeMin: (t.timeMin ?? 0) + minutes } : t)) : prev.todos,
      }));
    },
    [setState],
  );

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (mode === "open") {
        setRemaining((s) => s + 1);
        return;
      }
      setRemaining((s) => {
        if (s > 1) return s - 1;
        setRunning(false);
        if (phase === "focus") {
          logSession(focusMin);
          setPhase("break");
          return breakMin * 60;
        }
        setPhase("focus");
        return focusMin * 60;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, mode, phase, focusMin, breakMin, logSession]);

  const setMode = useCallback(
    (m: TimerMode) => {
      setRunning(false);
      setModeRaw(m);
      setPhase("focus");
      setRemaining(m === "open" ? 0 : focusMin * 60);
    },
    [focusMin],
  );

  const focusOnTask = useCallback((id: string, title: string) => {
    setTaskId(id);
    setLabel(title);
    setState((prev) => ({ ...prev, todos: prev.todos.map((t) => (t.id === id && t.status === "todo" ? { ...t, status: "doing" } : t)) }));
    setRunning(true);
  }, [setState]);

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(mode === "open" ? 0 : (phase === "focus" ? focusMin : breakMin) * 60);
  }, [mode, phase, focusMin, breakMin]);

  const skip = useCallback(() => {
    setRunning(false);
    if (phase === "focus") {
      setPhase("break");
      setRemaining(breakMin * 60);
    } else {
      setPhase("focus");
      setRemaining(focusMin * 60);
    }
  }, [phase, focusMin, breakMin]);

  const finish = useCallback(() => {
    setRunning(false);
    logSession(Math.max(1, Math.round(remaining / 60)));
    setRemaining(0);
  }, [remaining, logSession]);

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
      taskId,
      focusOnTask,
      start,
      pause,
      reset,
      skip,
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
    [mode, setMode, phase, remaining, running, focusMin, breakMin, label, taskId, focusOnTask, start, pause, reset, skip, finish],
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
