import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { toast } from "sonner";
import { create } from "zustand";
import { getFirebaseAuth, getGoogleProvider, startAnalytics } from "@/lib/firebase";
import { fetchUserProfile, saveUserProfile, type UserProfile } from "@/lib/profile";
import { setSyncAdapter, syncAdapter } from "@/lib/sync/adapter";
import { createFirestoreAdapter } from "@/lib/sync/firestore";
import { navigate } from "@/lib/nav";
import { useNotes } from "@/store/notes";
import { useVault } from "@/store/vault";
import { useSecrets } from "@/store/secrets";

interface AuthState {
  ready: boolean;
  user: User | null;
  syncing: boolean;
  profile: UserProfile | null;
  profileReady: boolean;
  initAuth: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (input: Omit<UserProfile, "onboardedAt">) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  syncNow: (notify?: boolean) => Promise<boolean>;
}

let stopSync: (() => void) | null = null;
let stopWorkspaceSync: (() => void) | null = null;

function localOnlyAdapter() {
  return {
    id: "local-only" as const,
    async connect() {},
    async pushNotes() {},
    async removeNotes() {},
    subscribe() {
      return () => {};
    },
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function startCloudSync(user: User) {
  stopSync?.();
  stopSync = null;
  stopWorkspaceSync?.();
  stopWorkspaceSync = null;

  const adapter = createFirestoreAdapter();
  setSyncAdapter(adapter);

  try {
    await adapter.connect();
    useNotes.getState().setCloudUser(user.uid);

    const remoteWorkspaces = (await adapter.pullWorkspaces?.()) ?? [];
    if (remoteWorkspaces.length > 0) {
      useNotes.getState().mergeRemoteWorkspaces(remoteWorkspaces);
    }

    const remote = (await adapter.pullNotes?.()) ?? [];
    if (remote.length > 0) {
      useNotes.getState().mergeRemoteNotes(remote);
    }

    await useNotes.getState().pushAllToCloud();

    const recovered = await useNotes.getState().recoverOrphanedPromptCards(user.uid);
    if (recovered > 0) {
      toast.success(
        recovered === 1
          ? "Restored 1 prompt card from your image library"
          : `Restored ${recovered} prompt cards from your image library`,
      );
    }

    stopWorkspaceSync = adapter.subscribeWorkspaces?.((remoteWorkspaces) => {
      useNotes.getState().mergeRemoteWorkspaces(remoteWorkspaces);
    }) ?? null;

    stopSync = adapter.subscribe((remoteNotes) => {
      useNotes.getState().mergeRemoteNotes(remoteNotes);
    });

    stopFocusSync?.();
    stopFocusSync = registerFocusSync();
  } catch (error) {
    console.error("NoteSeen: could not start cloud sync", error);
    toast.error("Could not connect to Firestore", {
      description: "You are still signed in. Notes stay on this device until sync recovers.",
    });
  }
}

let stopFocusSync: (() => void) | null = null;

export async function syncNow(notify = false): Promise<boolean> {
  const adapter = syncAdapter();
  if (adapter.id === "local-only") return false;
  const user = getFirebaseAuth().currentUser;
  if (!user) return false;

  useAuth.setState({ syncing: true });
  try {
    // 1. Commit and flush any local pending notes/workspaces to cloud immediately
    await useNotes.getState().flush({ toDisk: true });
    await adapter.flushCloud?.();

    // 2. Pull latest remote updates
    const [remoteWorkspaces, remoteNotes] = await Promise.all([
      adapter.pullWorkspaces ? adapter.pullWorkspaces() : Promise.resolve([]),
      adapter.pullNotes ? adapter.pullNotes() : Promise.resolve([]),
    ]);

    if (remoteWorkspaces.length > 0) {
      useNotes.getState().mergeRemoteWorkspaces(remoteWorkspaces);
    }
    if (remoteNotes.length > 0) {
      useNotes.getState().mergeRemoteNotes(remoteNotes);
    }

    if (notify) {
      toast.success("Synced with cloud", { duration: 1500 });
    }
    return true;
  } catch (error) {
    console.error("NoteSeen: syncNow failed", error);
    if (notify) {
      toast.error("Sync failed", { description: "Check your internet connection." });
    }
    return false;
  } finally {
    useAuth.setState({ syncing: false });
  }
}

export function registerFocusSync(): () => void {
  if (typeof window === "undefined") return () => {};

  let lastPullTime = 0;
  const pullIfActive = () => {
    const now = Date.now();
    // Throttle to max once every 2 seconds
    if (now - lastPullTime < 2000) return;
    lastPullTime = now;
    void syncNow(false);
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") {
      pullIfActive();
    }
  };

  const onFocus = () => pullIfActive();
  const onOnline = () => pullIfActive();

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onFocus);
  window.addEventListener("online", onOnline);

  // Periodic heartbeat poll every 25 seconds while tab is active in foreground
  const interval = setInterval(() => {
    if (document.visibilityState === "visible") {
      pullIfActive();
    }
  }, 25_000);

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("online", onOnline);
    clearInterval(interval);
  };
}

function stopCloudSync() {
  stopFocusSync?.();
  stopFocusSync = null;
  stopSync?.();
  stopSync = null;
  stopWorkspaceSync?.();
  stopWorkspaceSync = null;
  setSyncAdapter(localOnlyAdapter());
  useNotes.getState().setCloudUser(null);
}

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  user: null,
  syncing: false,
  profile: null,
  profileReady: false,

  initAuth() {
    void startAnalytics();
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      set({ user, ready: true });
      if (user) {
        set({ syncing: true, profileReady: false });
        void (async () => {
          try {
            const profile = await fetchUserProfile(user.uid);
            set({ profile, profileReady: true });
          } catch (error) {
            console.error("NoteSeen: profile load failed", error);
            set({ profile: null, profileReady: true });
          }
          await useVault.getState().syncVaultFromCloud();
          await useSecrets.getState().syncFromCloud();
          await startCloudSync(user);
          set({ syncing: false });
        })();
      } else {
        stopCloudSync();
        useSecrets.getState().lock();
        set({ syncing: false, profile: null, profileReady: true });
      }
    });
    return unsub;
  },

  async signInWithGoogle() {
    try {
      await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
      toast.success("Signed in with Google");
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return;
      }
      console.error("NoteSeen: Google sign-in failed", error);
      toast.error("Google sign-in failed", {
        description:
          code === "auth/unauthorized-domain"
            ? "Add this domain under Firebase Authentication → Settings → Authorized domains."
            : "Enable the Google provider in Firebase Authentication, then try again.",
      });
    }
  },

  async refreshProfile() {
    const user = get().user;
    if (!user) {
      set({ profile: null, profileReady: true });
      return;
    }
    try {
      const profile = await fetchUserProfile(user.uid);
      set({ profile, profileReady: true });
    } catch (error) {
      console.error("NoteSeen: profile refresh failed", error);
      set({ profileReady: true });
    }
  },

  async saveProfile(input) {
    try {
      const profile = await saveUserProfile(input);
      set({ profile, profileReady: true });
      toast.success("Profile saved");
      return true;
    } catch (error) {
      console.error("NoteSeen: profile save failed", error);
      toast.error("Could not save profile");
      return false;
    }
  },

  async signOut() {
    // Never block sign-out on a slow/failing cloud flush.
    try {
      await withTimeout(useNotes.getState().flush({ toDisk: true }), 2500);
    } catch (error) {
      console.warn("NoteSeen: local flush before sign-out failed", error);
    }

    try {
      const adapter = syncAdapter();
      if (adapter.id === "firestore") {
        const notes = Object.values(useNotes.getState().notes);
        adapter.pushNotes(notes);
        await withTimeout(adapter.flushCloud?.() ?? Promise.resolve(), 2500);
      }
    } catch (error) {
      console.warn("NoteSeen: cloud flush before sign-out failed", error);
    }

    stopCloudSync();
    useSecrets.getState().lock();

    try {
      await firebaseSignOut(getFirebaseAuth());
      set({ user: null, profile: null, syncing: false, profileReady: true });
      toast.success("Signed out");
      navigate("/");
    } catch (error) {
      console.error("NoteSeen: sign-out failed", error);
      toast.error("Could not sign out");
    }
  },

  async syncNow(notify = false) {
    return syncNow(notify);
  },
}));
