import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, StickyNote, Trash2, X } from "lucide-react";
import { useStore } from "../lib/store";
import { useTasks } from "../lib/useTasks";
import type { TodoItem } from "../lib/types";

const stamp = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Small button for calendar items and board cards; opens that task's notes in their own dialog. */
export function NotesButton({ task, className = "" }: { task: TodoItem; className?: string }) {
  const [open, setOpen] = useState(false);
  const count = task.notes?.length ?? 0;
  return (
    <>
      <button type="button" draggable={false} className={`icon-btn relative shrink-0 ${className}`} aria-label={`Notes for “${task.title}”${count ? ` (${count})` : ""}`} title="Notes"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        <StickyNote size={13} />
        {count > 0 && <span className="absolute -right-1 -top-1 grid min-w-3.5 place-items-center rounded-full bg-brand-500 px-1 text-[9px] font-semibold leading-3.5 text-white">{count}</span>}
      </button>
      {open && <TaskNotesDialog taskId={task.id} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Notes for one task. Deliberately separate from the edit-task dialog: add several, edit or remove each. */
export default function TaskNotesDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { state } = useStore();
  const { addNote, editNote, deleteNote } = useTasks();
  const task = state.todos.find((t) => t.id === taskId);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // onClose changes every render (the focus timer re-renders each second); a ref keeps focus from being re-grabbed
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!task) return null;
  const notes = task.notes ?? [];
  const add = () => { if (text.trim()) { addNote(taskId, text); setText(""); ref.current?.focus(); } };
  const saveEdit = () => { if (editing && editText.trim()) editNote(taskId, editing, editText); setEditing(null); };
  // Enter adds, Shift+Enter is a newline
  const onEnter = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(hover: hover)").matches) { e.preventDefault(); fn(); } };

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-900/50 p-0 sm:place-items-center sm:p-4"
      onClick={(e) => e.stopPropagation()} onMouseDown={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="task-notes-title" className="card flex max-h-[85dvh] w-full max-w-md flex-col gap-3 !rounded-b-none shadow-2xl sm:!rounded-b-2xl">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id="task-notes-title" className="flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-white"><StickyNote size={16} />Notes</h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={task.title}>{task.title}</p>
          </div>
          <button type="button" className="icon-btn hover:!text-slate-700" aria-label="Close notes" onClick={onClose}><X size={16} /></button>
        </div>

        <div>
          <textarea ref={ref} className="input min-h-20 resize-y" placeholder="Add a note…" title="Enter to add · Shift+Enter for a new line" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onEnter(add)} aria-label="New note" />
          <div className="mt-2 flex justify-end"><button type="button" className="btn" disabled={!text.trim()} onClick={add}>Add note</button></div>
        </div>

        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-white/10 dark:bg-white/[.03]">
              {editing === n.id ? (
                <>
                  <textarea autoFocus className="input min-h-16 resize-y" value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={onEnter(saveEdit)} aria-label="Edit note" />
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                    <button type="button" className="btn" disabled={!editText.trim()} onClick={saveEdit}>Save</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100">{n.text}</p>
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{stamp(n.createdAt)}{n.updatedAt && " · edited"}</span>
                    <button type="button" className="icon-btn ml-auto !size-6" aria-label="Edit note" onClick={() => { setEditing(n.id); setEditText(n.text); }}><Pencil size={12} /></button>
                    <button type="button" className="icon-btn !size-6 hover:!text-rose-600 dark:text-rose-400" aria-label="Delete note" onClick={() => deleteNote(taskId, n.id)}><Trash2 size={12} /></button>
                  </div>
                </>
              )}
            </li>
          ))}
          {!notes.length && <li className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">No notes yet. Add as many as you like.</li>}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
