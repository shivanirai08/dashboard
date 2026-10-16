import { REASONS, REASON_KEYS, marksOf } from "../lib/reasons";
import type { Mistake } from "../lib/types";

/** Reason | count | share | marks lost — a small pivot table. */
export function ReasonBreakdown({ rows }: { rows: Mistake[] }) {
  const total = rows.length || 1;
  const marks = rows.reduce((a, m) => a + marksOf(m), 0);
  return (
    <div className="sheet-wrap">
      <table className="sheet">
        <thead><tr><th>Why it went wrong</th><th className="text-right">Qs</th><th className="w-40">Share</th><th className="text-right">Marks lost</th></tr></thead>
        <tbody>
          {REASON_KEYS.map((k) => {
            const list = rows.filter((m) => m.kind === k);
            return (
              <tr key={k}>
                <td className="px-3 py-2"><span className={`chip ${REASONS[k].chip}`}>{REASONS[k].label}</span></td>
                <td className="px-3 py-2 text-right font-medium">{list.length}</td>
                <td className="px-3 py-2">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full" style={{ width: `${(list.length / total) * 100}%`, background: REASONS[k].bar }} /></div>
                </td>
                <td className="px-3 py-2 text-right">{list.reduce((a, m) => a + marksOf(m), 0) || "–"}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot><tr><td>Total</td><td className="text-right">{rows.length}</td><td /><td className="text-right">{marks}</td></tr></tfoot>
      </table>
    </div>
  );
}

/** Subject × reason heat-table. */
export function SubjectMatrix({ rows }: { rows: Mistake[] }) {
  const subjects = [...new Set(rows.map((m) => m.subject))].sort();
  const max = Math.max(1, ...subjects.flatMap((s) => REASON_KEYS.map((k) => rows.filter((m) => m.subject === s && m.kind === k).length)));
  if (!subjects.length) return <div className="py-8 text-center text-sm text-slate-400">No data yet</div>;
  return (
    <div className="sheet-wrap">
      <table className="sheet">
        <thead>
          <tr>
            <th>Subject</th>
            {REASON_KEYS.map((k) => <th key={k} className="text-center" title={REASONS[k].label}>{REASONS[k].short}</th>)}
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => {
            const sub = rows.filter((m) => m.subject === s);
            return (
              <tr key={s}>
                <td className="whitespace-nowrap px-3 py-2 font-medium">{s}</td>
                {REASON_KEYS.map((k) => {
                  const n = sub.filter((m) => m.kind === k).length;
                  return <td key={k} className="px-3 py-2 text-center" style={n ? { background: `rgba(244,63,94,${0.1 + (n / max) * 0.3})` } : undefined}>{n || ""}</td>;
                })}
                <td className="px-3 py-2 text-right font-semibold">{sub.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
