import { Pause, Play } from "lucide-react";
import { usePomodoro } from "../lib/pomodoro";
import type { TodoItem } from "../lib/types";

/** Play on a task starts the focus stopwatch against it; tap again to pause. Hidden once the task is done. */
export default function PlayButton({ task, className = "" }: { task: TodoItem; className?: string }) {
  const p = usePomodoro();
  if (task.status === "done") return null;
  const live = p.running && p.taskId === task.id;
  const paused = !p.running && p.started && p.taskId === task.id;
  const label = live ? `Pause focus on ${task.title}` : paused ? `Resume focus on ${task.title}` : `Start focus on ${task.title}`;
  return (
    <button type="button" aria-label={label} title={live ? "Pause" : paused ? "Resume" : "Start focus"} aria-pressed={live}
      onClick={(e) => { e.stopPropagation(); if (live) p.pause(); else p.focusOnTask(task.id, task.title, task.subjects?.join(", ")); }}
      className={`grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg transition ${live ? "bg-brand-500 text-white" : "text-slate-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-white/10"} ${className}`}>
      {live ? <Pause size={14} /> : <Play size={14} />}
    </button>
  );
}
