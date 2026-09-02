"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import { GhostButton, PrimaryButton } from "@/components/ui";

type Prefill = {
  customerName?: string;
  phone?: string;
  email?: string;
  zone?: string;
  mechanic?: string;
};

const empty = {
  customerName: "",
  phone: "",
  email: "",
  zone: "",
  vehicle: "",
  plate: "",
  service: "",
  location: "",
  mechanic: "",
};

export default function NewBookingModal({
  open,
  prefill,
  onClose,
  onCreated,
}: {
  open: boolean;
  prefill?: Prefill;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState(empty);
  const [services, setServices] = useState<string[]>([]);
  const [mechanics, setMechanics] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      ...empty,
      customerName: prefill?.customerName ?? "",
      phone: prefill?.phone ?? "",
      email: prefill?.email ?? "",
      zone: prefill?.zone ?? "",
      mechanic: prefill?.mechanic ?? "",
    });
    setError("");
    api
      .getBookingFilters()
      .then((filters) => {
        setServices(filters.services);
        setMechanics(filters.mechanics);
        setForm((prev) => ({
          ...prev,
          service: prev.service || filters.services[0] || "",
        }));
      })
      .catch(() => {});
  }, [open, prefill]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function set<K extends keyof typeof empty>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createBooking({
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        zone: form.zone.trim() || undefined,
        vehicle: form.vehicle.trim(),
        plate: form.plate.trim(),
        service: form.service,
        location: form.location.trim(),
        mechanic: form.mechanic || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create booking");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "h-9 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-subtle focus:border-accent-ring focus:outline-none focus:ring-2 focus:ring-accent-ring/40";

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div className="absolute left-1/2 top-10 w-full max-w-lg -translate-x-1/2 px-4 sm:top-16">
        <form
          onSubmit={submit}
          className="overflow-hidden rounded-xl border border-border bg-surface shadow-panel"
        >
          <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                New booking
              </h2>
              <p className="mt-0.5 text-xs text-subtle">Create a roadside job for dispatch</p>
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

          <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-medium text-subtle">Customer</span>
                <input
                  required
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  className={field}
                  placeholder="Full name"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-subtle">Phone</span>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className={field}
                  placeholder="+91 …"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-subtle">Zone</span>
                <input
                  value={form.zone}
                  onChange={(e) => set("zone", e.target.value)}
                  className={field}
                  placeholder="Andheri West"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-subtle">Vehicle</span>
                <input
                  required
                  value={form.vehicle}
                  onChange={(e) => set("vehicle", e.target.value)}
                  className={field}
                  placeholder="Maruti Swift"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-subtle">Plate</span>
                <input
                  required
                  value={form.plate}
                  onChange={(e) => set("plate", e.target.value)}
                  className={field}
                  placeholder="MH 12 AB 1234"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-medium text-subtle">Location</span>
                <input
                  required
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  className={field}
                  placeholder="Pickup address / landmark"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-subtle">Service</span>
                <select
                  required
                  value={form.service}
                  onChange={(e) => set("service", e.target.value)}
                  className={field}
                >
                  {services.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-subtle">
                  Mechanic <span className="text-subtle/70">(optional)</span>
                </span>
                <select
                  value={form.mechanic}
                  onChange={(e) => set("mechanic", e.target.value)}
                  className={field}
                >
                  <option value="">Unassigned</option>
                  {mechanics.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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
              Create booking
            </PrimaryButton>
          </footer>
        </form>
      </div>
    </div>
  );
}
