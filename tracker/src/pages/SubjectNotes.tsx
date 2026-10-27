import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, GripVertical, PanelLeftClose, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import { uid } from "../lib/ids";
import { subjectAccent, subjectTone } from "../lib/subjects";
import { useToast } from "../components/Toast";
import { PageHeader } from "../components/ui";
import type { DragEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { SubjectPoint } from "../lib/types";

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

// layout: a closed tab is a STRIP wide, an open panel never gets narrower than MIN_PANEL
const MIN_PANEL = 280;
const STRIP = 36;
const GAP = 6;

/** How many panels fit in `width` while every other subject stays a strip. */
function capacity(width: number, total: number): number {
  for (let n = total; n > 1; n--) {
    if ((width - (total - n) * STRIP - (total - 1) * GAP) / n >= MIN_PANEL) return n;
  }
  return 1;
}

const desktopQuery = "(min-width: 1024px)";

function useDesktop() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(desktopQuery); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  );
}

export default function SubjectNotes() {
  const { state, catalog, setState } = useStore();
  const toast = useToast();
  const desktop = useDesktop();
  const rowRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [openList, setOpenList] = useState<string[] | null>(null); // null = still the automatic fill
  const [mobileOpened, setMobileOpened] = useState<string[]>([]); // empty subjects expanded on phones

  // the row only exists on desktop; track its width so the number of open tabs follows the space
  useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [desktop]);

  const points = useMemo(() => state.subjectPoints ?? [], [state.subjectPoints]);

  const patch = (fn: (p: SubjectPoint[]) => SubjectPoint[]) => setState((s) => ({ ...s, subjectPoints: fn(s.subjectPoints ?? []) }));
  const add = (subject: string, text: string) => patch((p) => [{ id: uid(), subject, text: text.trim(), done: false, createdAt: new Date().toISOString() }, ...p]);
  const toggle = (id: string) => patch((p) => p.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const star = (id: string) => patch((p) => p.map((x) => (x.id === id ? { ...x, starred: !x.starred } : x)));
  const edit = (id: string, text: string) => patch((p) => p.map((x) => (x.id === id ? { ...x, text: text.trim(), updatedAt: new Date().toISOString() } : x)));
  const remove = (pt: SubjectPoint) => {
    patch((p) => p.filter((x) => x.id !== pt.id));
    toast("Pointer deleted", () => patch((p) => (p.some((x) => x.id === pt.id) ? p : [pt, ...p])));
  };
  const clearDone = (subject: string) => {
    const gone = points.filter((x) => x.subject === subject && x.done);
    if (!gone.length) return;
    patch((p) => p.filter((x) => !(x.subject === subject && x.done)));
    toast(`Cleared ${gone.length} done pointer${gone.length > 1 ? "s" : ""}`, () => patch((p) => [...gone, ...p]));
  };
  const handlers = { onAdd: add, onToggle: toggle, onStar: star, onEdit: edit, onDelete: remove, onClearDone: clearDone };

  // the user's tab order; subjects added to the catalog later land at the end, removed ones drop out
  const order = useMemo(() => {
    const saved = (state.subjectOrder ?? []).filter((s) => catalog.subjects.includes(s));
    return [...saved, ...catalog.subjects.filter((s) => !saved.includes(s))];
  }, [state.subjectOrder, catalog.subjects]);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<{ subject: string; after: boolean } | null>(null);

  const move = (subject: string, target: string, after: boolean) => {
    if (subject === target) return;
    const rest = order.filter((s) => s !== subject);
    const i = rest.indexOf(target) + (after ? 1 : 0);
    rest.splice(i, 0, subject);
    setState((s) => ({ ...s, subjectOrder: rest }));
  };
  const nudge = (subject: string, dir: -1 | 1) => {
    const i = order.indexOf(subject);
    const j = i + dir;
    if (j >= 0 && j < order.length) move(subject, order[j], dir === 1);
  };
  // Alt + ←/→ on a focused tab moves it (keyboard alternative to dragging)
  const keyMove = (subject: string) => (e: ReactKeyboardEvent) => {
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); nudge(subject, e.key === "ArrowLeft" ? -1 : 1); }
  };
  const dropProps = (subject: string) => ({
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!drag) return;
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      setOver({ subject, after: e.clientX > r.left + r.width / 2 });
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      if (drag && over) move(drag, over.subject, over.after);
      setDrag(null);
      setOver(null);
    },
  });
  const dragStart = (subject: string) => (e: DragEvent<HTMLElement>) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", subject);
    const card = (e.currentTarget as HTMLElement).closest("[data-tab]");
    if (card) e.dataTransfer.setDragImage(card, 20, 20);
    setDrag(subject);
  };
  const dragEnd = () => { setDrag(null); setOver(null); };

  const rows = order.map((subject) => ({ subject, items: points.filter((x) => x.subject === subject) }));
  const open = points.filter((x) => !x.done).length;

  // desktop: every visit starts with as many tabs open as fit (subjects with notes first);
  // after the user opens or closes one, their choice is kept (trimmed from the left if the window shrinks)
  const max = capacity(width, rows.length);
  const inOrder = (list: string[]) => order.filter((s) => list.includes(s));
  const fillOrder = [...rows.filter((r) => r.items.length), ...rows.filter((r) => !r.items.length)].map((r) => r.subject);
  const wanted = openList ? inOrder(openList) : inOrder(fillOrder.slice(0, max));
  const openNow = wanted.slice(Math.max(0, wanted.length - max));
  const saveOpen = (next: string[]) => setOpenList(next);
  const openTab = (subject: string) => {
    let next = inOrder([...openNow, subject]);
    // out of room: close the left-most open tab (never the one just clicked)
    while (next.length > max) {
      const victim = next.find((s) => s !== subject);
      next = next.filter((s) => s !== victim);
    }
    saveOpen(next);
  };
  const closeTab = (subject: string) => saveOpen(openNow.filter((s) => s !== subject));

  const sub = points.length ? `${open} open pointer${open === 1 ? "" : "s"} across ${rows.length} subjects` : "A running list per subject — what to do next, what you missed.";

  if (!desktop) {
    const full = rows.filter((r) => r.items.length || mobileOpened.includes(r.subject));
    const empties = rows.filter((r) => !full.includes(r));
    return (
      <>
        <PageHeader title="Subject Notes" sub={sub} />
        <div className="space-y-4">
          {full.map(({ subject, items }) => <MobilePanel key={subject} subject={subject} points={items} {...handlers} />)}
        </div>
        {empties.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Nothing noted yet · {empties.length}</h2>
            <div className="flex flex-wrap gap-2">
              {empties.map(({ subject }) => (
                <button key={subject} type="button" onClick={() => setMobileOpened((o) => [...o, subject])}
                  className="group flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-slate-300 bg-white/60 px-3 py-1.5 text-sm text-slate-600 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 dark:border-white/20 dark:bg-white/[.03] dark:text-slate-300 dark:hover:bg-brand-500/15">
                  <span className={`size-2 rounded-full ${subjectAccent(subject)}`} aria-hidden />{subject}<Plus size={14} className="text-slate-400 group-hover:text-brand-600" />
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Subject Notes" sub={sub} />

      <div ref={rowRef} className="flex h-[calc(100vh-11rem)] min-h-[440px] gap-[6px] overflow-x-auto" role="tablist" aria-label="Subjects" aria-orientation="horizontal">
        {rows.map(({ subject, items }) => {
          const isOpen = openNow.includes(subject);
          const hint = over?.subject === subject && drag !== subject ? (over.after ? "after" : "before") : null;
          return (
            <div key={subject} data-tab className={`relative flex ${isOpen ? "flex-1 basis-0" : "shrink-0"} ${drag === subject ? "opacity-40" : ""}`} style={isOpen ? { minWidth: MIN_PANEL } : undefined} {...dropProps(subject)}>
              {hint && <span aria-hidden className={`pointer-events-none absolute inset-y-0 z-10 w-[3px] rounded-full bg-brand-500 ${hint === "before" ? "-left-[5px]" : "-right-[5px]"}`} />}
              {isOpen ? (
                <SubjectPanel fill subject={subject} points={items} onFold={() => closeTab(subject)} grip={{ onDragStart: dragStart(subject), onDragEnd: dragEnd, onKeyDown: keyMove(subject) }} {...handlers} />
              ) : (
                <Strip subject={subject} items={items} onOpen={() => openTab(subject)} grip={{ onDragStart: dragStart(subject), onDragEnd: dragEnd, onKeyDown: keyMove(subject) }} />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/** A closed subject: a full-height strip with the name running up its side. */
function Strip({ subject, items, onOpen, grip }: { subject: string; items: SubjectPoint[]; onOpen: () => void; grip: Grip }) {
  const openCount = items.filter((x) => !x.done).length;
  return (
    <button type="button" role="tab" aria-selected={false} draggable {...grip} onClick={onOpen} title={`Open ${subject} · drag or Alt+←/→ to reorder`} aria-label={`Open ${subject}${openCount ? `, ${openCount} open pointers` : ", empty"}`}
      className={`group relative flex w-9 shrink-0 cursor-grab active:cursor-grabbing flex-col items-center gap-3 overflow-hidden rounded-2xl border bg-white pb-4 pt-5 transition hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md dark:bg-[#111522] dark:hover:bg-brand-500/10 ${items.length ? "border-slate-200 dark:border-white/10" : "border-dashed border-slate-300 dark:border-white/20"}`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${subjectAccent(subject)} ${items.length ? "" : "opacity-40"}`} aria-hidden />
      <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums ${openCount ? subjectTone(subject) : "bg-slate-100 text-slate-400 dark:bg-white/10"}`}>
        {openCount || <Plus size={12} />}
      </span>
      <span className="min-h-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium text-slate-700 [writing-mode:vertical-rl] rotate-180 group-hover:text-brand-700 dark:text-slate-200 dark:group-hover:text-brand-50">{subject}</span>
    </button>
  );
}

function MobilePanel(props: Omit<PanelProps, "onFold" | "collapsed" | "fill">) {
  const [collapsed, setCollapsed] = useState(false);
  return <SubjectPanel {...props} collapsed={collapsed} onFold={() => setCollapsed((v) => !v)} />;
}

type Grip = { onDragStart: (e: DragEvent<HTMLElement>) => void; onDragEnd: () => void; onKeyDown: (e: ReactKeyboardEvent) => void };

type PanelProps = {
  /** desktop: handle to drag the tab to a new position */
  grip?: Grip;
  subject: string;
  points: SubjectPoint[];
  onFold: () => void;
  /** phones: the panel folds in place instead of into a side strip */
  collapsed?: boolean;
  /** desktop: stretch to the full height of the row */
  fill?: boolean;
  onAdd: (subject: string, text: string) => void;
  onToggle: (id: string) => void;
  onStar: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (pt: SubjectPoint) => void;
  onClearDone: (subject: string) => void;
};

function SubjectPanel({ subject, points, onFold, collapsed, fill, grip, onAdd, onToggle, onStar, onEdit, onDelete, onClearDone }: PanelProps) {
  const [text, setText] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const finished = points.filter((x) => x.done);
  const active = points.filter((x) => !x.done).sort((a, b) => Number(!!b.starred) - Number(!!a.starred));
  const pct = points.length ? Math.round((finished.length / points.length) * 100) : 0;
  const submit = () => { if (text.trim()) { onAdd(subject, text); setText(""); ref.current?.focus(); } };
  const saveEdit = () => { if (editing && editText.trim()) onEdit(editing, editText); setEditing(null); };
  const panelId = `panel-${subject.replace(/\W+/g, "-")}`;
  const reveal = "lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100";

  const row = (pt: SubjectPoint) => (
    <li key={pt.id} className="group flex items-start gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-white/[.04]">
      <button type="button" role="checkbox" aria-checked={pt.done} aria-label={`Mark “${pt.text}” ${pt.done ? "not done" : "done"}`} onClick={() => onToggle(pt.id)}
        className={`mt-0.5 grid size-[22px] shrink-0 cursor-pointer place-items-center rounded-full border-2 transition ${pt.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500/50 dark:border-white/25"}`}>
        <Check size={12} strokeWidth={3.5} />
      </button>
      {editing === pt.id ? (
        <input autoFocus className="input !py-1" aria-label="Edit pointer" value={editText} onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }} onBlur={saveEdit} />
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className={`whitespace-pre-wrap break-words text-sm leading-6 ${pt.done ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"}`}>{pt.text}</p>
            <p className="text-[11px] text-slate-400">{ago(pt.createdAt)}{pt.updatedAt && " · edited"}</p>
          </div>
          <span className="flex shrink-0 items-center">
            <button type="button" aria-pressed={!!pt.starred} aria-label={pt.starred ? "Unstar pointer" : "Star pointer"} onClick={() => onStar(pt.id)} className={`icon-btn !size-7 ${pt.starred ? "!text-amber-500" : reveal}`}>
              <Star size={14} fill={pt.starred ? "currentColor" : "none"} />
            </button>
            <button type="button" className={`icon-btn !size-7 hover:!text-brand-600 ${reveal}`} aria-label="Edit pointer" onClick={() => { setEditing(pt.id); setEditText(pt.text); }}><Pencil size={13} /></button>
            <button type="button" className={`icon-btn !size-7 ${reveal}`} aria-label="Delete pointer" onClick={() => onDelete(pt)}><Trash2 size={13} /></button>
          </span>
        </>
      )}
    </li>
  );

  return (
    <section className={`card pop-in relative flex flex-col overflow-hidden !p-0 transition-shadow hover:shadow-md ${fill ? "h-full min-w-0 flex-1" : ""}`} aria-labelledby={`${panelId}-h`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${subjectAccent(subject)}`} aria-hidden />
      <header className="flex items-center gap-2.5 px-4 pb-3 pt-5">
        {grip && (
          <button type="button" draggable {...grip} aria-label={`Reorder ${subject} — drag, or Alt with left/right arrows`} title="Drag to reorder · Alt+←/→"
            className="-ml-2 grid size-7 shrink-0 cursor-grab place-items-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-white/10"><GripVertical size={16} /></button>
        )}
        <h2 id={`${panelId}-h`} title={subject} className={`chip min-w-0 truncate !text-[13px] ${subjectTone(subject)}`}>{subject}</h2>
        <span className="ml-auto flex items-center gap-2 text-xs tabular-nums text-slate-500">
          {points.length > 0 && (
            <>
              <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 font-medium dark:bg-white/10" title={`${active.length} open`}>{active.length}<span className={fill ? "hidden" : "hidden sm:inline"}> open</span></span>
              <span className="grid size-7 place-items-center" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${subject} ${pct}% done`}>
                <svg viewBox="0 0 36 36" className="size-7 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" className="stroke-slate-200 dark:stroke-white/10" /><circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-emerald-500 transition-[stroke-dashoffset] duration-500" strokeDasharray={94.25} strokeDashoffset={94.25 * (1 - pct / 100)} /></svg>
              </span>
            </>
          )}
          <button type="button" className="icon-btn !size-7 hover:!text-slate-700" aria-label={`${collapsed ? "Expand" : "Collapse"} ${subject}`} aria-expanded={collapsed === undefined ? undefined : !collapsed} title={fill ? "Close this tab" : undefined} onClick={onFold}>
            {fill ? <PanelLeftClose size={16} /> : <ChevronDown size={16} className={`transition-transform ${collapsed ? "-rotate-90" : ""}`} />}
          </button>
        </span>
      </header>

      {!collapsed && <div id={panelId} className={`flex flex-col gap-2 px-3 pb-3 ${fill ? "min-h-0 flex-1" : ""}`}>
        <textarea ref={ref} rows={1} className="input mx-1 w-[calc(100%-.5rem)] resize-none [field-sizing:content] max-h-40" placeholder="Add a pointer…" title="Enter to add · Shift+Enter for a new line" aria-label={`New pointer for ${subject}`}
          value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} />

        <ul className={`space-y-0.5 overflow-y-auto ${fill ? "min-h-0 flex-1" : "max-h-96"}`}>
          {active.map(row)}
          {!active.length && (
            <li className="px-3 py-5 text-center text-xs leading-5 text-slate-400">{points.length ? "All caught up here." : "Nothing noted yet. Add what to do next, or something you missed."}</li>
          )}
        </ul>

        {finished.length > 0 && (
          <div className="border-t border-slate-100 pt-2 dark:border-white/[.06]">
            <div className="flex items-center justify-between px-2">
              <button type="button" aria-expanded={showDone} className="flex cursor-pointer items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-800 dark:hover:text-slate-200" onClick={() => setShowDone((v) => !v)}>
                <span className={`inline-block transition-transform ${showDone ? "rotate-90" : ""}`}>›</span>Done · {finished.length}
              </button>
              <button type="button" className="cursor-pointer text-xs text-slate-400 transition hover:text-rose-500" onClick={() => onClearDone(subject)}>Clear</button>
            </div>
            {showDone && <ul className="mt-1 space-y-0.5">{finished.map(row)}</ul>}
          </div>
        )}
      </div>}
    </section>
  );
}
