import { create } from "zustand";
import { doc, getDoc, setDoc } from "firebase/firestore";
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

async function persistVaultLocal(config: VaultConfig) {
  await setMeta(VAULT_KEY, config);
}

async function persistVaultCloud(config: VaultConfig) {
  const user = getFirebaseAuth().currentUser;
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
  pendingReason: null,
  pendingResolve: null,

  async initVault() {
    const config = (await getMeta<VaultConfig>(VAULT_KEY)) ?? null;
    set({ config, ready: true });
  },

  async syncVaultFromCloud() {
    const user = getFirebaseAuth().currentUser;
    if (!user) return;

    try {
      const remote = await loadVaultFromCloud(user.uid);
      const local = get().config;

      if (remote) {
        if (!local || local.answerHash !== remote.answerHash || local.question !== remote.question) {
          await persistVaultLocal(remote);
          set({ config: remote });
        }
        return;
      }

      // First device already has a vault — upload it so phones can share it.
      if (local) {
        await persistVaultCloud(local);
      }
    } catch (error) {
      console.warn("NoteSeen: vault cloud sync failed", error);
    }
  },

  requireVault(reason) {
    return new Promise<boolean>((resolve) => {
      const existing = get().pendingResolve;
      if (existing) existing(false);

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
