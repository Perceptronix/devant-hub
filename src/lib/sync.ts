import { useEffect } from "react";

export const SYNC_EVENT = "devant:sync";

export function emitSync(scope?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { scope: scope ?? "all", at: Date.now() } }));
}

export function useSyncListener(handler: () => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fn = () => handler();
    window.addEventListener(SYNC_EVENT, fn);
    return () => window.removeEventListener(SYNC_EVENT, fn);
  }, [handler]);
}
