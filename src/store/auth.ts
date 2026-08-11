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
}

let stopSync: (() => void) | null = null;

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

  const adapter = createFirestoreAdapter();
  setSyncAdapter(adapter);

  try {
    await adapter.connect();
    useNotes.getState().setCloudUser(user.uid);

    // Pull + merge BEFORE any push so this device cannot resurrect deleted notes.
    const remote = (await adapter.pullNotes?.()) ?? [];
    if (remote.length > 0) {
      useNotes.getState().mergeRemoteNotes(remote);
    }

    await useNotes.getState().pushAllToCloud();

    stopSync = adapter.subscribe((remoteNotes) => {
      useNotes.getState().mergeRemoteNotes(remoteNotes);
    });
  } catch (error) {
    console.error("NoteSeen: could not start cloud sync", error);
    toast.error("Could not connect to Firestore", {
      description: "You are still signed in. Notes stay on this device until sync recovers.",
    });
  }
}

function stopCloudSync() {
  stopSync?.();
  stopSync = null;
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
}));
