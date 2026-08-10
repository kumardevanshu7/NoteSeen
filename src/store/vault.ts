import { create } from "zustand";
import { getMeta, setMeta } from "@/lib/db";
import { hashVaultAnswer, verifyVaultAnswer } from "@/lib/vault-crypto";
import type { VaultConfig } from "@/lib/types";

const VAULT_KEY = "vault.config";

export type VaultReason = "edit" | "delete" | "setup";

type ResolveFn = (ok: boolean) => void;

interface VaultState {
  ready: boolean;
  config: VaultConfig | null;
  /** When set, the gate dialog is open for this reason. */
  pendingReason: VaultReason | null;
  pendingResolve: ResolveFn | null;

  initVault: () => Promise<void>;
  /** Always prompts — no timed unlock session. */
  requireVault: (reason: "edit" | "delete") => Promise<boolean>;
  setupVault: (question: string, answer: string) => Promise<void>;
  unlockWithAnswer: (answer: string) => Promise<boolean>;
  cancelGate: () => void;
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
    await setMeta(VAULT_KEY, config);
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

/** Convenience for non-React call sites. */
export function requireVault(reason: "edit" | "delete"): Promise<boolean> {
  return useVault.getState().requireVault(reason);
}
