import { create } from "zustand";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { getMeta, setMeta } from "@/lib/db";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import {
  decryptSecretValue,
  encryptSecretValue,
  hashSecretPin,
  isValidPin,
  randomSaltHex,
  verifySecretPin,
} from "@/lib/secret-crypto";
import type { SecretCategory, SecretEntry, SecretPinConfig } from "@/lib/types";
import { DEFAULT_WORKSPACE_ID, normalizeSecretEntry } from "@/lib/types";

const PIN_KEY = "secret.vault.pin";
const ENTRIES_KEY = "secret.vault.entries";

interface SecretDraft {
  title: string;
  category: SecretCategory;
  username: string;
  value: string;
  notes: string;
}

interface SecretsState {
  ready: boolean;
  pinConfig: SecretPinConfig | null;
  entries: SecretEntry[];
  /** Session PIN — kept only in memory while unlocked. */
  sessionPin: string | null;
  unlocked: boolean;

  initSecrets: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  setupPin: (pin: string, confirm: string) => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  addEntry: (draft: SecretDraft, workspaceId?: string) => Promise<SecretEntry | null>;
  updateEntry: (id: string, draft: SecretDraft) => Promise<boolean>;
  removeEntry: (id: string) => Promise<boolean>;
  revealValue: (id: string) => Promise<string | null>;
  moveSecretsToWorkspace: (fromWorkspaceId: string, toWorkspaceId: string) => Promise<void>;
}

async function currentUserWhenReady() {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;
  try {
    await auth.authStateReady();
  } catch {
    // ignore
  }
  return auth.currentUser;
}

async function persistPinLocal(config: SecretPinConfig) {
  await setMeta(PIN_KEY, config);
}

async function persistEntriesLocal(entries: SecretEntry[]) {
  await setMeta(ENTRIES_KEY, entries);
}

async function persistPinCloud(config: SecretPinConfig) {
  const user = await currentUserWhenReady();
  if (!user) return;
  await setDoc(
    doc(getFirebaseDb(), "users", user.uid),
    {
      uid: user.uid,
      secretPinHash: config.pinHash,
      secretPinSalt: config.salt,
      secretPinCreatedAt: config.createdAt,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

async function loadPinFromCloud(uid: string): Promise<SecretPinConfig | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as {
    secretPinHash?: string;
    secretPinSalt?: string;
    secretPinCreatedAt?: number;
  };
  if (
    typeof data.secretPinHash !== "string" ||
    data.secretPinHash.length < 32 ||
    typeof data.secretPinSalt !== "string" ||
    data.secretPinSalt.length < 16
  ) {
    return null;
  }
  return {
    pinHash: data.secretPinHash,
    salt: data.secretPinSalt,
    createdAt: typeof data.secretPinCreatedAt === "number" ? data.secretPinCreatedAt : Date.now(),
  };
}

async function loadEntriesFromCloud(uid: string): Promise<SecretEntry[]> {
  const snap = await getDocs(collection(getFirebaseDb(), "users", uid, "secrets"));
  const list: SecretEntry[] = [];
  snap.forEach((row) => {
    const d = row.data() as Partial<SecretEntry>;
    if (
      typeof d.id !== "string" ||
      typeof d.title !== "string" ||
      typeof d.valueCipher !== "string" ||
      typeof d.valueIv !== "string"
    ) {
      return;
    }
    list.push(
      normalizeSecretEntry({
        id: d.id,
        workspaceId: typeof d.workspaceId === "string" ? d.workspaceId : DEFAULT_WORKSPACE_ID,
        title: d.title,
        category: d.category === "password" || d.category === "other" ? d.category : "api",
        username: typeof d.username === "string" ? d.username : "",
        valueCipher: d.valueCipher,
        valueIv: d.valueIv,
        notes: typeof d.notes === "string" ? d.notes : "",
        createdAt: typeof d.createdAt === "number" ? d.createdAt : Date.now(),
        updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : Date.now(),
      }),
    );
  });
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function upsertEntryCloud(entry: SecretEntry) {
  const user = await currentUserWhenReady();
  if (!user) return;
  await setDoc(doc(getFirebaseDb(), "users", user.uid, "secrets", entry.id), entry, {
    merge: true,
  });
}

async function deleteEntryCloud(id: string) {
  const user = await currentUserWhenReady();
  if (!user) return;
  await deleteDoc(doc(getFirebaseDb(), "users", user.uid, "secrets", id));
}

function mergeEntries(local: SecretEntry[], remote: SecretEntry[]): SecretEntry[] {
  const map = new Map<string, SecretEntry>();
  for (const entry of local) map.set(entry.id, entry);
  for (const entry of remote) {
    const existing = map.get(entry.id);
    if (!existing || entry.updatedAt >= existing.updatedAt) map.set(entry.id, entry);
  }
  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export const useSecrets = create<SecretsState>((set, get) => ({
  ready: false,
  pinConfig: null,
  entries: [],
  sessionPin: null,
  unlocked: false,

  async initSecrets() {
    const pinConfig = (await getMeta<SecretPinConfig>(PIN_KEY)) ?? null;
    const rawEntries = (await getMeta<SecretEntry[]>(ENTRIES_KEY)) ?? [];
    const entries = rawEntries.map((entry) => normalizeSecretEntry(entry));
    if (!get().pinConfig && pinConfig) set({ pinConfig });
    if (get().entries.length === 0 && entries.length > 0) set({ entries });
    set({ ready: true });
    await get().syncFromCloud();
  },

  async syncFromCloud() {
    const user = await currentUserWhenReady();
    if (!user) return;

    try {
      const remotePin = await loadPinFromCloud(user.uid);
      const localPin = get().pinConfig ?? (await getMeta<SecretPinConfig>(PIN_KEY)) ?? null;
      const localEntries = get().entries.length
        ? get().entries
        : ((await getMeta<SecretEntry[]>(ENTRIES_KEY)) ?? []);

      if (remotePin) {
        if (
          !localPin ||
          localPin.pinHash !== remotePin.pinHash ||
          localPin.salt !== remotePin.salt
        ) {
          await persistPinLocal(remotePin);
          // PIN changed on another device — force re-unlock.
          set({ pinConfig: remotePin, sessionPin: null, unlocked: false });
        } else {
          set({ pinConfig: remotePin });
        }
      } else if (localPin) {
        set({ pinConfig: localPin });
        await persistPinCloud(localPin);
      }

      const remoteEntries = await loadEntriesFromCloud(user.uid);
      const merged = mergeEntries(localEntries, remoteEntries);
      await persistEntriesLocal(merged);
      set({ entries: merged });

      // Push local-only rows that cloud is missing.
      if (remoteEntries.length === 0 && localEntries.length > 0) {
        const batch = writeBatch(getFirebaseDb());
        for (const entry of localEntries) {
          batch.set(doc(getFirebaseDb(), "users", user.uid, "secrets", entry.id), entry, {
            merge: true,
          });
        }
        await batch.commit();
      } else {
        const remoteIds = new Set(remoteEntries.map((e) => e.id));
        for (const entry of localEntries) {
          if (!remoteIds.has(entry.id)) await upsertEntryCloud(entry);
        }
      }
    } catch (error) {
      console.warn("NoteSeen: secret vault cloud sync failed", error);
    }
  },

  async setupPin(pin, confirm) {
    if (!isValidPin(pin)) throw new Error("PIN must be exactly 4 digits.");
    if (pin !== confirm) throw new Error("PINs do not match.");

    const salt = randomSaltHex();
    const pinHash = await hashSecretPin(pin, salt);
    const config: SecretPinConfig = { pinHash, salt, createdAt: Date.now() };

    await persistPinLocal(config);
    try {
      await persistPinCloud(config);
    } catch (error) {
      console.warn("NoteSeen: could not sync secret PIN to cloud", error);
      toast.error("PIN saved on this device only", {
        description: "Cloud sync failed — other devices will need setup again.",
      });
    }

    set({ pinConfig: config, sessionPin: pin, unlocked: true });
  },

  async unlock(pin) {
    const config = get().pinConfig;
    if (!config) return false;
    const ok = await verifySecretPin(pin, config.salt, config.pinHash);
    if (!ok) return false;
    set({ sessionPin: pin, unlocked: true });
    return true;
  },

  lock() {
    set({ sessionPin: null, unlocked: false });
  },

  async addEntry(draft, workspaceId = DEFAULT_WORKSPACE_ID) {
    const { sessionPin, pinConfig, entries } = get();
    if (!sessionPin || !pinConfig) {
      toast.error("Unlock the secret vault first");
      return null;
    }
    const title = draft.title.trim();
    const value = draft.value.trim();
    if (!title || !value) {
      toast.error("Title and secret value are required");
      return null;
    }

    const { cipherHex, ivHex } = await encryptSecretValue(value, sessionPin, pinConfig.salt);
    const now = Date.now();
    const entry: SecretEntry = {
      id: nanoid(12),
      workspaceId,
      title,
      category: draft.category,
      username: draft.username.trim(),
      valueCipher: cipherHex,
      valueIv: ivHex,
      notes: draft.notes.trim().slice(0, 20_000),
      createdAt: now,
      updatedAt: now,
    };

    const next = [entry, ...entries];
    await persistEntriesLocal(next);
    set({ entries: next });
    try {
      await upsertEntryCloud(entry);
    } catch (error) {
      console.warn("NoteSeen: secret cloud save failed", error);
    }
    toast.success("Saved to secret vault");
    return entry;
  },

  async updateEntry(id, draft) {
    const { sessionPin, pinConfig, entries } = get();
    if (!sessionPin || !pinConfig) {
      toast.error("Unlock the secret vault first");
      return false;
    }
    const existing = entries.find((row) => row.id === id);
    if (!existing) return false;

    const title = draft.title.trim();
    if (!title) {
      toast.error("Title is required");
      return false;
    }

    let valueCipher = existing.valueCipher;
    let valueIv = existing.valueIv;
    if (draft.value.trim()) {
      const encrypted = await encryptSecretValue(draft.value.trim(), sessionPin, pinConfig.salt);
      valueCipher = encrypted.cipherHex;
      valueIv = encrypted.ivHex;
    }

    const updated: SecretEntry = {
      ...existing,
      title,
      category: draft.category,
      username: draft.username.trim(),
      valueCipher,
      valueIv,
      notes: draft.notes.trim().slice(0, 20_000),
      updatedAt: Date.now(),
    };

    const next = entries.map((row) => (row.id === id ? updated : row));
    await persistEntriesLocal(next);
    set({ entries: next });
    try {
      await upsertEntryCloud(updated);
    } catch (error) {
      console.warn("NoteSeen: secret cloud update failed", error);
    }
    toast.success("Secret updated");
    return true;
  },

  async removeEntry(id) {
    const next = get().entries.filter((row) => row.id !== id);
    await persistEntriesLocal(next);
    set({ entries: next });
    try {
      await deleteEntryCloud(id);
    } catch (error) {
      console.warn("NoteSeen: secret cloud delete failed", error);
    }
    toast.success("Secret deleted");
    return true;
  },

  async revealValue(id) {
    const { sessionPin, pinConfig, entries } = get();
    if (!sessionPin || !pinConfig) return null;
    const entry = entries.find((row) => row.id === id);
    if (!entry) return null;
    try {
      return await decryptSecretValue(entry.valueCipher, entry.valueIv, sessionPin, pinConfig.salt);
    } catch (error) {
      console.error("NoteSeen: decrypt failed", error);
      toast.error("Could not decrypt — try unlocking again");
      set({ sessionPin: null, unlocked: false });
      return null;
    }
  },

  async moveSecretsToWorkspace(fromWorkspaceId, toWorkspaceId) {
    if (fromWorkspaceId === toWorkspaceId) return;
    const stamp = Date.now();
    const next = get().entries.map((entry) =>
      entry.workspaceId === fromWorkspaceId
        ? { ...entry, workspaceId: toWorkspaceId, updatedAt: stamp }
        : entry,
    );
    if (next.every((entry, index) => entry === get().entries[index])) return;
    await persistEntriesLocal(next);
    set({ entries: next });
    const touched = next.filter(
      (entry) => entry.workspaceId === toWorkspaceId && entry.updatedAt === stamp,
    );
    for (const entry of touched) {
      try {
        await upsertEntryCloud(entry);
      } catch (error) {
        console.warn("NoteSeen: secret workspace move cloud sync failed", error);
      }
    }
  },
}));
