import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { toast } from "sonner";
import { create } from "zustand";
import { getFirebaseAuth, getGoogleProvider, startAnalytics } from "@/lib/firebase";
import { setSyncAdapter, syncAdapter } from "@/lib/sync/adapter";
import { createFirestoreAdapter } from "@/lib/sync/firestore";
import { navigate } from "@/lib/nav";
import { useNotes } from "@/store/notes";

interface AuthState {
  ready: boolean;
  user: User | null;
  syncing: boolean;
  initAuth: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
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

async function startCloudSync(user: User) {
  stopSync?.();
  stopSync = null;

  const adapter = createFirestoreAdapter();
  setSyncAdapter(adapter);

  try {
    await adapter.connect();
    useNotes.getState().setCloudUser(user.uid);

    stopSync = adapter.subscribe((remoteNotes) => {
      useNotes.getState().mergeRemoteNotes(remoteNotes);
    });

    await useNotes.getState().pushAllToCloud();
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

export const useAuth = create<AuthState>((set) => ({
  ready: false,
  user: null,
  syncing: false,

  initAuth() {
    void startAnalytics();
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      set({ user, ready: true });
      if (user) {
        set({ syncing: true });
        void startCloudSync(user).finally(() => set({ syncing: false }));
      } else {
        stopCloudSync();
        set({ syncing: false });
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

  async signOut() {
    try {
      await useNotes.getState().flush({ toDisk: true });
      const adapter = syncAdapter();
      if (adapter.id === "firestore") {
        const notes = Object.values(useNotes.getState().notes);
        await adapter.pushNotes(notes);
        await adapter.flushCloud?.();
      }
      stopCloudSync();
      await firebaseSignOut(getFirebaseAuth());
      toast.success("Signed out");
      navigate("/");
    } catch (error) {
      console.error("NoteSeen: sign-out failed", error);
      toast.error("Could not sign out");
    }
  },
}));
