import { Pause, Play, Square } from "lucide-react";
import { usePomodoro } from "../lib/pomodoro";

/** Start → (End + small Pause/Resume). End logs the time and resets. */
export default function TimerControls() {
  const p = usePomodoro();
  if (!p.started) {
    return <button className="btn" onClick={p.start}><Play size={15} />Start</button>;
  }
  return (
    <div className="flex items-center gap-2">
      <button className="btn !from-rose-500 !to-rose-600" onClick={p.finish}><Square size={13} />End</button>
      <button className="btn-ghost !px-2.5" onClick={p.running ? p.pause : p.start} aria-label={p.running ? "Pause" : "Resume"} title={p.running ? "Pause" : "Resume"}>
        {p.running ? <Pause size={15} /> : <Play size={15} />}
      </button>
    </div>
  );
}
