import { useState, type ReactNode } from "react";
import { fmtHM, parseHM } from "../lib/schedule";

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {sub && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
      <div className="text-slate-300 dark:text-slate-600">{icon}</div>
      {text}
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/** Hours input: type 2.45 for 2 h 45 min, 0.30 for half an hour. Holds minutes. */
export function HoursInput({ minutes, onChange, className = "input", label }: { minutes: number | undefined; onChange: (min: number | undefined) => void; className?: string; label?: string }) {
  const [text, setText] = useState(minutes ? fmtHM(minutes) : "");
  const parsed = parseHM(text);
  const bad = text.trim() !== "" && parsed === undefined;
  // follow outside changes (e.g. a duration preset) without fighting what the user is typing
  if (!bad && (parsed ?? 0) !== (minutes ?? 0)) setText(minutes ? fmtHM(minutes) : "");
  return (
    <input className={`${className} ${bad ? "!border-rose-400" : ""}`} inputMode="decimal" placeholder="1.30" aria-label={label} aria-invalid={bad} value={text}
      title="Hours.minutes — 2.45 = 2 h 45 min, 0.30 = 30 min"
      onChange={(e) => { setText(e.target.value); onChange(parseHM(e.target.value)); }} />
  );
}
