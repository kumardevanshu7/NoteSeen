import { useEffect, useState, useSyncExternalStore } from "react";

function getPath(): string {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

/** Tiny path router — no react-router dependency. */
export function usePath(): string {
  return useSyncExternalStore(subscribe, getPath, () => "/");
}

export function navigate(to: string): void {
  if (to === getPath() + window.location.search) return;
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Send deep-link / share / PWA shortcut traffic straight into the editor. */
export function useAppDeepLinkRedirect(): void {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (done) return;
    if (window.location.pathname !== "/" && window.location.pathname !== "") return;
    const params = new URLSearchParams(window.location.search);
    const wantsApp =
      params.get("new") === "1" ||
      params.get("search") === "1" ||
      params.has("text") ||
      params.has("url") ||
      params.has("title");
    if (!wantsApp) {
      setDone(true);
      return;
    }
    navigate(`/app${window.location.search}`);
    setDone(true);
  }, [done]);
}
