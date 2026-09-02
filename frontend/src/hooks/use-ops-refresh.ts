"use client";

import { useEffect } from "react";

export type OpsReloadOptions = {
  /** Keep current UI visible while refetching (used for live WS / background refresh). */
  silent?: boolean;
};

/** Re-fetch when a create modal succeeds or a live WebSocket event arrives. */
export function useOpsRefresh(reload: (opts?: OpsReloadOptions) => void) {
  useEffect(() => {
    function onRefresh() {
      reload({ silent: true });
    }
    window.addEventListener("ops:refresh", onRefresh);
    return () => window.removeEventListener("ops:refresh", onRefresh);
  }, [reload]);
}
