"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import NewBookingModal from "@/components/bookings/new-booking-modal";
import CustomerFormModal from "@/components/customers/customer-form-modal";
import MechanicFormModal from "@/components/mechanics/mechanic-form-modal";

type BookingPrefill = {
  customerName?: string;
  phone?: string;
  email?: string;
  zone?: string;
  mechanic?: string;
};

type OpsContextValue = {
  openNewBooking: (prefill?: BookingPrefill) => void;
  openAddCustomer: () => void;
  openInviteMechanic: () => void;
};

const OpsContext = createContext<OpsContextValue | null>(null);

export function OpsProvider({ children }: { children: ReactNode }) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingPrefill, setBookingPrefill] = useState<BookingPrefill>({});
  const [customerOpen, setCustomerOpen] = useState(false);
  const [mechanicOpen, setMechanicOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  const openNewBooking = useCallback((prefill?: BookingPrefill) => {
    setBookingPrefill(prefill ?? {});
    setBookingOpen(true);
  }, []);

  const openAddCustomer = useCallback(() => setCustomerOpen(true), []);
  const openInviteMechanic = useCallback(() => setMechanicOpen(true), []);

  const value = useMemo(
    () => ({ openNewBooking, openAddCustomer, openInviteMechanic }),
    [openNewBooking, openAddCustomer, openInviteMechanic],
  );

  return (
    <OpsContext.Provider value={value}>
      <div data-ops-refresh={refreshKey}>{children}</div>
      <NewBookingModal
        open={bookingOpen}
        prefill={bookingPrefill}
        onClose={() => setBookingOpen(false)}
        onCreated={() => {
          setBookingOpen(false);
          bump();
          window.dispatchEvent(new CustomEvent("ops:refresh"));
        }}
      />
      <CustomerFormModal
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        onCreated={() => {
          setCustomerOpen(false);
          bump();
          window.dispatchEvent(new CustomEvent("ops:refresh"));
        }}
      />
      <MechanicFormModal
        open={mechanicOpen}
        onClose={() => setMechanicOpen(false)}
        onCreated={() => {
          setMechanicOpen(false);
          bump();
          window.dispatchEvent(new CustomEvent("ops:refresh"));
        }}
      />
    </OpsContext.Provider>
  );
}

export function useOps() {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error("useOps must be used within OpsProvider");
  return ctx;
}
