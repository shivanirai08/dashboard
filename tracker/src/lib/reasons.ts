import type { Mistake, MistakeKind } from "./types";

export const REASONS: Record<MistakeKind, { short: string; label: string; chip: string; bar: string }> = {
  concept: { short: "No concept", label: "Didn't know the concept", chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300", bar: "#8b5cf6" },
  implement: { short: "Couldn't apply", label: "Knew the concept, couldn't implement it", chip: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300", bar: "#14b8a6" },
  forgot: { short: "Forgot", label: "Knew it, forgot", chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300", bar: "#6366f1" },
  silly: { short: "Silly", label: "Silly mistake", chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300", bar: "#f43f5e" },
  calculation: { short: "Calc", label: "Calculation error", chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", bar: "#f59e0b" },
  misread: { short: "Misread", label: "Misread question", chip: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300", bar: "#0ea5e9" },
  guess: { short: "Guess", label: "Wrong guess", chip: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300", bar: "#ec4899" },
  time: { short: "Time", label: "Time pressure", chip: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300", bar: "#64748b" },
};

export const REASON_KEYS = Object.keys(REASONS) as MistakeKind[];

export const marksOf = (m: Mistake) => m.marks ?? 1;
