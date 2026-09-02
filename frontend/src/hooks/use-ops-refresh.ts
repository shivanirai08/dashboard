"use client";

import { useEffect } from "react";

/** Re-fetch when a create modal succeeds (booking / customer / mechanic). */
export function useOpsRefresh(reload: () => void) {
  useEffect(() => {
    function onRefresh() {
      reload();
    }
    window.addEventListener("ops:refresh", onRefresh);
    return () => window.removeEventListener("ops:refresh", onRefresh);
  }, [reload]);
}
