import { create } from "zustand";

interface FullscreenState {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  setFullscreen: (value: boolean) => void;
}

export const useFullscreen = create<FullscreenState>((set, get) => ({
  isFullscreen: false,

  toggleFullscreen: () => {
    const next = !get().isFullscreen;
    set({ isFullscreen: next });

    if (typeof document !== "undefined") {
      if (next && document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          // Browser security policy might block if not directly user triggered, app full screen still works
        });
      } else if (!next && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  },

  setFullscreen: (value: boolean) => {
    set({ isFullscreen: value });
    if (typeof document !== "undefined") {
      if (value && document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (!value && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  },
}));

// Sync with browser's native Escape / F11
if (typeof document !== "undefined") {
  document.addEventListener("fullscreenchange", () => {
    const isNative = Boolean(document.fullscreenElement);
    if (!isNative && useFullscreen.getState().isFullscreen) {
      useFullscreen.setState({ isFullscreen: false });
    }
  });
}
