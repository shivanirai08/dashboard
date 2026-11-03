import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fmtDur } from "../lib/schedule";
import { plannedMin } from "../lib/tasks";
import type { TodoItem } from "../lib/types";

const PRESETS: [number, string][] = [[100, "Full"], [75, "Mostly"], [50, "Half"], [25, "Barely"]];
const W = 272;
const GAP = 6;

/** Same colour language as the schedule: emerald = all of it, lime = partial, amber = little. */
const toneOf = (p: number) => (p === 100 ? { text: "text-emerald-600 dark:text-emerald-400", fill: "#10b981" } : p >= 50 ? { text: "text-lime-700 dark:text-lime-400", fill: "#84cc16" } : { text: "text-amber-600 dark:text-amber-400", fill: "#f59e0b" });

/** Small popover next to the tick box: asks how much of the task actually got finished. */
export default function CompletionDialog({ task, anchor, onClose, onSave }: { task: TodoItem; anchor: HTMLElement; onClose: () => void; onSave: (pct: number, carryRest: boolean) => void }) {
  const [pct, setPct] = useState(task.completion ?? 100);
  const [carry, setCarry] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const box = useRef<HTMLFormElement>(null);
  const partial = pct < 100;
  const tone = toneOf(pct);
  const len = plannedMin(task);

  // sit just below the tick box, flip above when there is no room, and stay inside the viewport
  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const h = box.current?.offsetHeight ?? 0;
      const left = Math.max(8, Math.min(r.left - 8, window.innerWidth - W - 8));
      const below = r.bottom + GAP;
      const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - GAP - h) : below;
      setPos({ left, top });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [anchor, partial]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form ref={box} role="dialog" aria-label={`How much of “${task.title}” did you finish?`} onSubmit={(e) => { e.preventDefault(); onSave(pct, carry); }}
        className="card absolute space-y-3 !p-3 shadow-xl" style={{ width: W, left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white" title={task.title}>{task.title}</span>
          <span className={`shrink-0 text-base font-semibold tabular-nums ${tone.text}`} aria-live="polite">{pct}%</span>
        </div>

        <div role="radiogroup" aria-label="Quick amount" className="grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[.03]">
          {PRESETS.map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={pct === v} onClick={() => setPct(v)}
              className={`cursor-pointer rounded-lg py-1.5 text-xs transition ${pct === v ? "bg-brand-600 font-semibold text-white shadow-sm" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}>{label}</button>
          ))}
        </div>

        <div>
          <input type="range" aria-label="Exact amount finished" min={5} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-slate-700 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-slate-700 [&::-webkit-slider-thumb]:shadow-md"
            style={{ background: `linear-gradient(to right, ${tone.fill} ${pct}%, rgb(148 163 184 / .3) ${pct}%)` }} />
          {len > 0 && <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{fmtDur(len * pct / 100)} of {fmtDur(len)} counts</div>}
        </div>

        {partial && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" className="size-3.5 shrink-0 cursor-pointer accent-emerald-600" checked={carry} onChange={(e) => setCarry(e.target.checked)} />
            Move the remaining {100 - pct}% to tomorrow
          </label>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost !px-3 !py-1.5" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn !px-3 !py-1.5" autoFocus>{partial ? `Save ${pct}%` : "Mark done"}</button>
        </div>
      </form>
    </div>
  );
}
