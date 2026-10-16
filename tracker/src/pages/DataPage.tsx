import { useRef } from "react";
import { Cloud, Download, Upload } from "lucide-react";
import { useStore } from "../lib/store";
import { supabaseConfigured } from "../lib/supabase";
import { PageHeader } from "../components/ui";

export default function DataPage() {
  const { state, setState, exportJson, importJson, resetProgress, sync } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([exportJson()], { type: "application/json" }));
    a.download = "gate-progress.json";
    a.click();
  };
  const upload = async (file: File) => {
    try { importJson(await file.text()); alert("Imported."); } catch { alert("Invalid JSON file."); }
  };

  return (
    <>
      <PageHeader title="Settings & Sync" sub="Progress is saved in your browser and synced to Supabase." />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="card">
          <div className="card-title">Goals</div>
          <div className="flex flex-wrap gap-4">
            <label><span className="label">Exam date</span><input className="input !w-48" type="date" value={state.examDate ?? ""} onChange={(e) => setState((s) => ({ ...s, examDate: e.target.value || undefined }))} /></label>
            <label><span className="label">Daily focus goal (hours)</span><input className="input !w-48" type="number" min={0} step={0.5} value={(state.dailyGoalMin ?? 240) / 60} onChange={(e) => setState((s) => ({ ...s, dailyGoalMin: Math.round(Number(e.target.value) * 60) }))} /></label>
          </div>
        </div>

        <div className="card">
          <div className="card-title flex items-center gap-2"><Cloud size={15} /> Supabase sync</div>
          {!supabaseConfigured ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              Not configured. Copy <code>.env.example</code> to <code>.env</code>, add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, run <code>supabase/schema.sql</code> in the SQL editor, then restart.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className={`chip ${sync.status === "error" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"}`}>
                {sync.status === "saving" ? "Saving…" : sync.status === "connecting" ? "Connecting…" : sync.status === "error" ? "Sync error" : "Synced"}
              </span>
              {sync.error && <span className="text-rose-500">{sync.error}</span>}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Manual backup</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={download}><Download size={15} />Export JSON</button>
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={15} />Import JSON</button>
            <button className="btn-ghost !text-rose-600" onClick={() => confirm("Erase all progress?") && resetProgress()}>Reset everything</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
          </div>
        </div>
      </div>
    </>
  );
}
