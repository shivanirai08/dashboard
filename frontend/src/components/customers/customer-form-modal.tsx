"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import { GhostButton, PrimaryButton } from "@/components/ui";

const empty = { name: "", phone: "", email: "", zone: "" };

export default function CustomerFormModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(empty);
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const field =
    "h-9 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-subtle focus:border-accent-ring focus:outline-none focus:ring-2 focus:ring-accent-ring/40";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createCustomer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        zone: form.zone.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div className="absolute left-1/2 top-16 w-full max-w-md -translate-x-1/2 px-4">
        <form
          onSubmit={submit}
          className="overflow-hidden rounded-xl border border-border bg-surface shadow-panel"
        >
          <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Add customer
              </h2>
              <p className="mt-0.5 text-xs text-subtle">Save a profile for future bookings</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-subtle hover:bg-surface-3 hover:text-foreground"
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </header>

          <div className="space-y-3 px-5 py-4">
            {(
              [
                ["name", "Name", "Aarav Mehta"],
                ["phone", "Phone", "+91 …"],
                ["email", "Email", "optional"],
                ["zone", "Zone", "Mumbai Central"],
              ] as const
            ).map(([key, label, placeholder]) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-subtle">{label}</span>
                <input
                  required={key === "name" || key === "phone"}
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className={field}
                  placeholder={placeholder}
                />
              </label>
            ))}
            {error ? (
              <p className="rounded-lg bg-cancelled-soft px-3 py-2 text-xs text-cancelled">{error}</p>
            ) : null}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <GhostButton type="button" onClick={onClose}>
              Cancel
            </GhostButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Save customer
            </PrimaryButton>
          </footer>
        </form>
      </div>
    </div>
  );
}
