import { useId, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { subjectTone } from "../lib/subjects";

/**
 * Multi-select for subjects: picked ones are removable chips, a search box opens the rest.
 * Type to filter · ↑/↓ + Enter to pick · Backspace removes the last chip · Esc closes.
 */
export default function SubjectPicker({ value, onChange, options }: { value: string[]; onChange: (v: string[]) => void; options: string[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const rest = options.filter((o) => !value.includes(o) && o.toLowerCase().includes(q.trim().toLowerCase()));
  const pick = (o: string) => {
    onChange([...value, o]);
    setQ("");
    setHi(0);
    input.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(rest.length - 1, h + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === "Enter") { if (open && rest[hi]) { e.preventDefault(); pick(rest[hi]); } }
    else if (e.key === "Escape") { if (open) { e.stopPropagation(); setOpen(false); } }
    else if (e.key === "Backspace" && !q && value.length) onChange(value.slice(0, -1));
  };

  return (
    <div className="relative">
      <div className="input flex min-h-[2.5rem] cursor-text flex-wrap items-center gap-1.5 !py-1.5" onClick={() => input.current?.focus()}>
        {value.map((s) => (
          <span key={s} className={`chip gap-1 !pr-1 ${subjectTone(s)}`}>
            {s}
            <button type="button" aria-label={`Remove ${s}`} className="grid size-4 cursor-pointer place-items-center rounded-full hover:bg-black/10 dark:hover:bg-white/15" onClick={(e) => { e.stopPropagation(); onChange(value.filter((x) => x !== s)); }}><X size={11} /></button>
          </span>
        ))}
        <input ref={input} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-label="Add subject"
          className="min-w-[7rem] flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          placeholder={value.length ? "Add another…" : "Add subjects…"} value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKey} />
      </div>
      {open && (
        <ul id={listId} role="listbox" aria-label="Subjects" className="absolute inset-x-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#151a2a]">
          {rest.map((o, i) => (
            <li key={o} role="option" aria-selected={i === hi} onMouseDown={(e) => { e.preventDefault(); pick(o); }} onMouseEnter={() => setHi(i)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${i === hi ? "bg-brand-50 dark:bg-white/10" : ""}`}>
              <Plus size={13} className="text-slate-400" /><span className={`chip ${subjectTone(o)}`}>{o}</span>
            </li>
          ))}
          {!rest.length && <li className="px-2.5 py-2 text-sm text-slate-400">{value.length === options.length ? "All subjects added" : "No matching subject"}</li>}
        </ul>
      )}
    </div>
  );
}
