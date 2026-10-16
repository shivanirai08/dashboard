import { useState } from "react";
import { FolderClosed, FolderOpen, Layers, Plus, Trophy } from "lucide-react";
import { useStore } from "../lib/store";
import { formatDate } from "../lib/dates";
import { PageHeader } from "../components/ui";
import MistakeSheet from "../components/MistakeSheet";
import { ReasonBreakdown, SubjectMatrix } from "../components/Analysis";
import { REASONS, REASON_KEYS } from "../lib/reasons";
import type { Mistake, MistakeKind } from "../lib/types";

type Folder = { type: "all" } | { type: "none" } | { type: "mock"; id: string } | { type: "session"; name: string };

export default function Mistakes() {
  const { state, catalog, setState } = useStore();
  const [folder, setFolder] = useState<Folder>({ type: "all" });
  const [kind, setKind] = useState<MistakeKind | "">("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "resolved">("all");
  const [newSession, setNewSession] = useState("");

  const sessions = [...new Set([...(state.sessions ?? []), ...state.mistakes.map((m) => m.session).filter((s): s is string => !!s)])];
  const inFolder = (m: Mistake) =>
    folder.type === "all" ? true
    : folder.type === "none" ? !m.mockId && !m.session
    : folder.type === "mock" ? m.mockId === folder.id
    : m.session === folder.name;

  const scoped = state.mistakes.filter(inFolder);
  const rows = scoped.filter((m) => (!kind || m.kind === kind) && (!subject || m.subject === subject) && (status === "all" || (status === "open") === !m.resolved));
  const count = (f: (m: Mistake) => boolean) => state.mistakes.filter(f).length;
  const mocks = [...state.mocks].sort((a, b) => b.date.localeCompare(a.date));

  const defaults: Partial<Mistake> = folder.type === "mock" ? { mockId: folder.id } : folder.type === "session" ? { session: folder.name } : {};
  const title = folder.type === "all" ? "All mistakes" : folder.type === "none" ? "Unsorted" : folder.type === "mock" ? state.mocks.find((m) => m.id === folder.id)?.name ?? "Mock" : folder.name;

  const addSession = () => {
    const n = newSession.trim();
    if (!n) return;
    setState((p) => ({ ...p, sessions: [...new Set([...(p.sessions ?? []), n])] }));
    setFolder({ type: "session", name: n });
    setNewSession("");
  };

  const same = (a: Folder, b: Folder) => JSON.stringify(a) === JSON.stringify(b);
  const FolderBtn = ({ f, label, n, icon }: { f: Folder; label: string; n: number; icon?: boolean }) => (
    <button onClick={() => setFolder(f)} className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${same(folder, f) ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-50" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"}`}>
      {icon !== false && (same(folder, f) ? <FolderOpen size={15} /> : <FolderClosed size={15} />)}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs text-slate-400">{n}</span>
    </button>
  );

  return (
    <>
      <PageHeader title="Mistake Log" sub="Group mistakes by mock or revision session — every wrong question, with the reason it went wrong." />
      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="card h-fit space-y-4 !p-3 lg:sticky lg:top-4">
          <div className="space-y-0.5">
            <FolderBtn f={{ type: "all" }} label="All mistakes" n={state.mistakes.length} />
            <FolderBtn f={{ type: "none" }} label="Unsorted" n={count((m) => !m.mockId && !m.session)} />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><Trophy size={12} />Mocks</div>
            <div className="max-h-64 space-y-0.5 overflow-y-auto">
              {mocks.map((m) => <FolderBtn key={m.id} f={{ type: "mock", id: m.id }} label={m.name} n={count((x) => x.mockId === m.id)} />)}
              {!mocks.length && <div className="px-2.5 text-xs text-slate-400">Log a mock first</div>}
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><Layers size={12} />Revision sessions</div>
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {sessions.map((s) => <FolderBtn key={s} f={{ type: "session", name: s }} label={s} n={count((x) => x.session === s)} />)}
            </div>
            <div className="mt-2 flex gap-1.5 px-1">
              <input className="input !py-1 text-xs" placeholder="New session…" value={newSession} onChange={(e) => setNewSession(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSession()} />
              <button className="btn !px-2 !py-1" onClick={addSession} aria-label="Create session"><Plus size={14} /></button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
            {folder.type === "mock" && (() => { const m = state.mocks.find((x) => x.id === folder.id); return m ? <span className="text-sm text-slate-500">{formatDate(m.date)} · {m.score}/{m.maxScore}</span> : null; })()}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select className="input !w-auto" value={kind} onChange={(e) => setKind(e.target.value as MistakeKind | "")}>
                <option value="">All reasons</option>{REASON_KEYS.map((k) => <option key={k} value={k}>{REASONS[k].label}</option>)}
              </select>
              <select className="input !w-auto" value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">All subjects</option>{catalog.subjects.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="all">Any status</option><option value="open">Not revised</option><option value="resolved">Revised</option>
              </select>
            </div>
          </div>

          <MistakeSheet rows={rows} defaults={defaults} showSource={folder.type === "all" || folder.type === "none"} />

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="min-w-0"><div className="card-title">Reason breakdown</div><ReasonBreakdown rows={rows} /></div>
            <div className="min-w-0"><div className="card-title">Subject × reason</div><SubjectMatrix rows={rows} /></div>
          </div>
        </div>
      </div>
    </>
  );
}
