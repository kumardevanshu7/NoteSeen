import { create } from "zustand";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { getMeta, setMeta } from "@/lib/db";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { hashVaultAnswer, verifyVaultAnswer } from "@/lib/vault-crypto";
import type { VaultConfig } from "@/lib/types";

const VAULT_KEY = "vault.config";
const VAULT_EDIT_UNLOCK_KEY = "noteseen.edit_unlock_until";

export type VaultReason = "edit" | "delete" | "setup";

type ResolveFn = (ok: boolean) => void;

interface VaultState {
  ready: boolean;
  config: VaultConfig | null;
  /** True while the cloud copy is still being fetched, so gates can wait. */
  cloudChecking: boolean;
  pendingReason: VaultReason | null;
  pendingResolve: ResolveFn | null;

  /** Timestamp in ms until which note editing is unlocked without repeated password prompts. */
  editUnlockExpiresAt: number | null;

  initVault: () => Promise<void>;
  /** Pull vault from Firestore for the signed-in Google account (same Q on every device). */
  syncVaultFromCloud: () => Promise<void>;
  requireVault: (reason: "edit" | "delete") => Promise<boolean>;
  setupVault: (question: string, answer: string) => Promise<void>;
  unlockWithAnswer: (answer: string, timerMinutes?: number) => Promise<boolean>;
  verifyAndStartTimer: (answer: string, minutes: number) => Promise<boolean>;
  startEditUnlockTimer: (minutes: number) => void;
  extendEditUnlockTimer: (minutes: number) => void;
  lockEditNow: () => void;
  isEditUnlocked: () => boolean;
  getRemainingEditUnlockSeconds: () => number;
  cancelGate: () => void;
}

let tickerTimer: ReturnType<typeof setInterval> | null = null;

function readStoredUnlockExpiresAt(): number | null {
  try {
    const raw = localStorage.getItem(VAULT_EDIT_UNLOCK_KEY);
    if (!raw) return null;
    const stamp = Number.parseInt(raw, 10);
    if (Number.isFinite(stamp) && stamp > Date.now()) {
      return stamp;
    }
    localStorage.removeItem(VAULT_EDIT_UNLOCK_KEY);
  } catch {
    // Ignore storage issues
  }
  return null;
}

/**
 * The vault question must be identical on every device, so a gate never falls
 * back to "set up" just because Firebase auth had not resolved yet.
 */
async function currentUserWhenReady() {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;
  try {
    await auth.authStateReady();
  } catch {
    // Older SDKs: fall through with whatever we have.
  }
  return auth.currentUser;
}

async function persistVaultLocal(config: VaultConfig) {
  await setMeta(VAULT_KEY, config);
}

async function persistVaultCloud(config: VaultConfig) {
  const user = await currentUserWhenReady();
  if (!user) return;
  await setDoc(
    doc(getFirebaseDb(), "users", user.uid),
    {
      uid: user.uid,
      vaultQuestion: config.question,
      vaultAnswerHash: config.answerHash,
      vaultCreatedAt: config.createdAt,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

async function loadVaultFromCloud(uid: string): Promise<VaultConfig | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as {
    vaultQuestion?: string;
    vaultAnswerHash?: string;
    vaultCreatedAt?: number;
  };
  if (
    typeof data.vaultQuestion !== "string" ||
    !data.vaultQuestion.trim() ||
    typeof data.vaultAnswerHash !== "string" ||
    data.vaultAnswerHash.length < 32
  ) {
    return null;
  }
  return {
    question: data.vaultQuestion.trim(),
    answerHash: data.vaultAnswerHash,
    createdAt: typeof data.vaultCreatedAt === "number" ? data.vaultCreatedAt : Date.now(),
  };
}

export const useVault = create<VaultState>((set, get) => ({
  ready: false,
  config: null,
  cloudChecking: false,
  pendingReason: null,
  pendingResolve: null,
  editUnlockExpiresAt: readStoredUnlockExpiresAt(),

  async initVault() {
    const local = (await getMeta<VaultConfig>(VAULT_KEY)) ?? null;
    // Never clobber a config the cloud sync already installed for this session.
    if (local && !get().config) set({ config: local });

    const storedExpiresAt = readStoredUnlockExpiresAt();
    set({ ready: true, editUnlockExpiresAt: storedExpiresAt });

    // Set up ticker to track timer expiry and trigger re-renders
    if (!tickerTimer && typeof window !== "undefined") {
      tickerTimer = setInterval(() => {
        const { editUnlockExpiresAt } = get();
        if (editUnlockExpiresAt !== null) {
          if (Date.now() >= editUnlockExpiresAt) {
            try {
              localStorage.removeItem(VAULT_EDIT_UNLOCK_KEY);
            } catch {
              // ignore
            }
            set({ editUnlockExpiresAt: null });
            toast.info("Edit unlock timer expired — notes locked");
          }
        }
      }, 1000);

      window.addEventListener("storage", (event) => {
        if (event.key === VAULT_EDIT_UNLOCK_KEY) {
          const next = readStoredUnlockExpiresAt();
          set({ editUnlockExpiresAt: next });
        }
      });
    }

    await get().syncVaultFromCloud();
  },

  async syncVaultFromCloud() {
    const user = await currentUserWhenReady();
    if (!user) return;

    set({ cloudChecking: true });
    try {
      const remote = await loadVaultFromCloud(user.uid);
      const local = get().config ?? (await getMeta<VaultConfig>(VAULT_KEY)) ?? null;

      if (remote) {
        if (!local || local.answerHash !== remote.answerHash || local.question !== remote.question) {
          await persistVaultLocal(remote);
        }
        set({ config: remote });
        return;
      }

      // First device already has a vault — upload it so phones can share it.
      if (local) {
        set({ config: local });
        await persistVaultCloud(local);
      }
    } catch (error) {
      console.warn("NoteSeen: vault cloud sync failed", error);
    } finally {
      set({ cloudChecking: false });
    }
  },

  async requireVault(reason) {
    // Only bypass if editing notes/prompts and edit timer is currently active
    if (reason === "edit" && get().isEditUnlocked()) {
      return true;
    }

    const existing = get().pendingResolve;
    if (existing) existing(false);

    // A second device must reuse the cloud question instead of asking for setup.
    if (!get().config) {
      await get().syncVaultFromCloud();
    }

    return new Promise<boolean>((resolve) => {
      set({
        pendingReason: get().config ? reason : "setup",
        pendingResolve: resolve,
      });
    });
  },

  async setupVault(question, answer) {
    const trimmedQ = question.trim();
    const trimmedA = answer.trim();
    if (!trimmedQ || !trimmedA) throw new Error("Question and answer are required.");

    const config: VaultConfig = {
      question: trimmedQ,
      answerHash: await hashVaultAnswer(trimmedA),
      createdAt: Date.now(),
    };
    await persistVaultLocal(config);
    try {
      await persistVaultCloud(config);
    } catch (error) {
      console.warn("NoteSeen: could not sync vault to cloud", error);
      toast.error("Vault saved on this device only", {
        description: "Cloud sync failed, so other devices will ask again.",
      });
    }

    const resolve = get().pendingResolve;
    set({
      config,
      pendingReason: null,
      pendingResolve: null,
    });
    resolve?.(true);
  },

  async unlockWithAnswer(answer, timerMinutes) {
    const config = get().config;
    if (!config) return false;
    const ok = await verifyVaultAnswer(answer, config.answerHash);
    if (!ok) return false;

    if (timerMinutes && timerMinutes > 0) {
      get().startEditUnlockTimer(timerMinutes);
    }

    const resolve = get().pendingResolve;
    set({
      pendingReason: null,
      pendingResolve: null,
    });
    resolve?.(true);
    return true;
  },

  async verifyAndStartTimer(answer, minutes) {
    const config = get().config;
    if (!config) return false;
    const ok = await verifyVaultAnswer(answer, config.answerHash);
    if (!ok) return false;
    get().startEditUnlockTimer(minutes);
    return true;
  },

  startEditUnlockTimer(minutes) {
    const durationMs = Math.max(1, minutes) * 60 * 1000;
    const expiresAt = Date.now() + durationMs;
    try {
      localStorage.setItem(VAULT_EDIT_UNLOCK_KEY, String(expiresAt));
    } catch {
      // ignore
    }
    set({ editUnlockExpiresAt: expiresAt });
  },

  extendEditUnlockTimer(minutes) {
    const { editUnlockExpiresAt } = get();
    const durationMs = Math.max(1, minutes) * 60 * 1000;
    const base = editUnlockExpiresAt && editUnlockExpiresAt > Date.now() ? editUnlockExpiresAt : Date.now();
    const nextExpires = base + durationMs;
    try {
      localStorage.setItem(VAULT_EDIT_UNLOCK_KEY, String(nextExpires));
    } catch {
      // ignore
    }
    set({ editUnlockExpiresAt: nextExpires });
  },

  lockEditNow() {
    try {
      localStorage.removeItem(VAULT_EDIT_UNLOCK_KEY);
    } catch {
      // ignore
    }
    set({ editUnlockExpiresAt: null });
    toast.message("Notes locked for editing");
  },

  isEditUnlocked() {
    const { editUnlockExpiresAt } = get();
    return editUnlockExpiresAt !== null && Date.now() < editUnlockExpiresAt;
  },

  getRemainingEditUnlockSeconds() {
    const { editUnlockExpiresAt } = get();
    if (!editUnlockExpiresAt) return 0;
    const diff = Math.floor((editUnlockExpiresAt - Date.now()) / 1000);
    return Math.max(0, diff);
  },

  cancelGate() {
    const resolve = get().pendingResolve;
    set({ pendingReason: null, pendingResolve: null });
    resolve?.(false);
  },
}));

export function requireVault(reason: "edit" | "delete"): Promise<boolean> {
  return useVault.getState().requireVault(reason);
}
