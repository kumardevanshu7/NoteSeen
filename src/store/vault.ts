import { create } from "zustand";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { getMeta, setMeta } from "@/lib/db";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { hashVaultAnswer, verifyVaultAnswer } from "@/lib/vault-crypto";
import type { VaultConfig } from "@/lib/types";

const VAULT_KEY = "vault.config";

export type VaultReason = "edit" | "delete" | "setup";

type ResolveFn = (ok: boolean) => void;

interface VaultState {
  ready: boolean;
  config: VaultConfig | null;
  /** True while the cloud copy is still being fetched, so gates can wait. */
  cloudChecking: boolean;
  pendingReason: VaultReason | null;
  pendingResolve: ResolveFn | null;

  initVault: () => Promise<void>;
  /** Pull vault from Firestore for the signed-in Google account (same Q on every device). */
  syncVaultFromCloud: () => Promise<void>;
  requireVault: (reason: "edit" | "delete") => Promise<boolean>;
  setupVault: (question: string, answer: string) => Promise<void>;
  unlockWithAnswer: (answer: string) => Promise<boolean>;
  cancelGate: () => void;
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

  async initVault() {
    const local = (await getMeta<VaultConfig>(VAULT_KEY)) ?? null;
    // Never clobber a config the cloud sync already installed for this session.
    if (local && !get().config) set({ config: local });
    set({ ready: true });
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

  async unlockWithAnswer(answer) {
    const config = get().config;
    if (!config) return false;
    const ok = await verifyVaultAnswer(answer, config.answerHash);
    if (!ok) return false;

    const resolve = get().pendingResolve;
    set({
      pendingReason: null,
      pendingResolve: null,
    });
    resolve?.(true);
    return true;
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
