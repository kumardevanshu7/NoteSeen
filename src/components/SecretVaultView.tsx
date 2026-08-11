import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Shield,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSecrets } from "@/store/secrets";
import type { SecretCategory, SecretEntry } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";

const CATEGORIES: { id: SecretCategory; label: string }[] = [
  { id: "api", label: "API key" },
  { id: "password", label: "Password" },
  { id: "other", label: "Other" },
];

export function SecretVaultView() {
  const ready = useSecrets((state) => state.ready);
  const pinConfig = useSecrets((state) => state.pinConfig);
  const unlocked = useSecrets((state) => state.unlocked);
  const entries = useSecrets((state) => state.entries);
  const initSecrets = useSecrets((state) => state.initSecrets);
  const setupPin = useSecrets((state) => state.setupPin);
  const unlock = useSecrets((state) => state.unlock);
  const lock = useSecrets((state) => state.lock);
  const addEntry = useSecrets((state) => state.addEntry);
  const updateEntry = useSecrets((state) => state.updateEntry);
  const removeEntry = useSecrets((state) => state.removeEntry);
  const revealValue = useSecrets((state) => state.revealValue);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SecretEntry | null>(null);
  const [filter, setFilter] = useState<SecretCategory | "all">("all");

  useEffect(() => {
    void initSecrets();
  }, [initSecrets]);

  const visible = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((entry) => entry.category === filter);
  }, [entries, filter]);

  const onSetup = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await setupPin(pin, confirmPin);
      setPin("");
      setConfirmPin("");
      toast.success("Secret vault ready", {
        description: "Your 4-digit PIN unlocks API keys and passwords.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set PIN");
    } finally {
      setBusy(false);
    }
  };

  const onUnlock = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ok = await unlock(pin);
      if (!ok) {
        setError("Wrong PIN. Try again.");
        setBusy(false);
        return;
      }
      setPin("");
      toast.success("Vault unlocked");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="ns-mono text-muted">Opening secret vault…</span>
      </div>
    );
  }

  if (!pinConfig) {
    return (
      <div className="ns-scroll flex-1 overflow-y-auto px-5 py-10 sm:px-10">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <KeyRound className="mx-auto size-8 text-deep-green" />
            <h1 className="ns-display mt-4 text-ink">Secret vault</h1>
            <p className="ns-caption mt-3 text-body-muted">
              Set a separate 4-digit PIN for API keys and passwords. This is not the same as your
              note edit question.
            </p>
          </div>
          <form onSubmit={(event) => void onSetup(event)} className="space-y-4">
            <PinField label="Create 4-digit PIN" value={pin} onChange={setPin} autoFocus />
            <PinField label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} />
            {error ? <p className="ns-caption text-error">{error}</p> : null}
            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              Create vault
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="ns-scroll flex-1 overflow-y-auto px-5 py-10 sm:px-10">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <Lock className="mx-auto size-8 text-deep-green" />
            <h1 className="ns-display mt-4 text-ink">Enter PIN</h1>
            <p className="ns-caption mt-3 text-body-muted">
              Unlock to view or add secrets. Values stay encrypted until you unlock.
            </p>
          </div>
          <form onSubmit={(event) => void onUnlock(event)} className="space-y-4">
            <PinField label="4-digit PIN" value={pin} onChange={setPin} autoFocus />
            {error ? <p className="ns-caption text-error">{error}</p> : null}
            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              Unlock
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="ns-scroll flex-1 overflow-y-auto px-5 py-8 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="ns-display text-ink">Secret vault</h1>
            <p className="ns-caption mt-2 text-body-muted">
              {entries.length} {entries.length === 1 ? "secret" : "secrets"} · PIN protected
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={lock}>
              <Lock className="size-3.5" />
              Lock
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="size-3.5" />
              Add secret
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full border px-3 py-1 text-[12px] transition-colors",
              filter === "all"
                ? "border-primary bg-primary text-primary-ink"
                : "border-hairline bg-surface text-slate hover:bg-stone",
            )}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] transition-colors",
                filter === cat.id
                  ? "border-primary bg-primary text-primary-ink"
                  : "border-hairline bg-surface text-slate hover:bg-stone",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="mt-14 rounded-lg border border-dashed border-hairline px-8 py-16 text-center">
            <Shield className="mx-auto size-5 text-muted" />
            <p className="ns-feature mt-4 text-ink">No secrets yet</p>
            <p className="ns-caption mx-auto mt-2 max-w-sm text-body-muted">
              Store API keys, account passwords, and tokens here. Only the secret value is encrypted.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-6"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="size-3.5" />
              Add your first secret
            </Button>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {visible.map((entry) => (
              <SecretCard
                key={entry.id}
                entry={entry}
                onEdit={() => {
                  setEditing(entry);
                  setEditorOpen(true);
                }}
                onDelete={() => void removeEntry(entry.id)}
                onReveal={() => revealValue(entry.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <SecretEditorDialog
        open={editorOpen}
        entry={editing}
        onOpenChange={setEditorOpen}
        onSave={async (draft) => {
          if (editing) {
            const ok = await updateEntry(editing.id, draft);
            if (ok) setEditorOpen(false);
            return ok;
          }
          const created = await addEntry(draft);
          if (created) setEditorOpen(false);
          return Boolean(created);
        }}
      />
    </div>
  );
}

function PinField({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="ns-caption text-ink">{label}</span>
      <Input
        type="password"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        autoComplete="one-time-code"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="••••"
        className="text-center text-2xl tracking-[0.4em]"
        required
      />
    </label>
  );
}

function SecretCard({
  entry,
  onEdit,
  onDelete,
  onReveal,
}: {
  entry: SecretEntry;
  onEdit: () => void;
  onDelete: () => void;
  onReveal: () => Promise<string | null>;
}) {
  const [shown, setShown] = useState(false);
  const [value, setValue] = useState<string | null>(null);

  const toggleReveal = async () => {
    if (shown) {
      setShown(false);
      setValue(null);
      return;
    }
    const plain = await onReveal();
    if (plain == null) return;
    setValue(plain);
    setShown(true);
  };

  const copyValue = async () => {
    const plain = value ?? (await onReveal());
    if (!plain) return;
    try {
      await navigator.clipboard.writeText(plain);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const categoryLabel =
    CATEGORIES.find((cat) => cat.id === entry.category)?.label ?? entry.category;

  return (
    <li className="rounded-sm border border-hairline bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-[15px] font-medium text-ink">{entry.title}</h2>
            <span className="ns-mono rounded-full border border-hairline px-2 py-px text-muted">
              {categoryLabel}
            </span>
          </div>
          {entry.username ? (
            <p className="ns-caption mt-1 truncate text-body-muted">{entry.username}</p>
          ) : null}
          <p className="ns-mono mt-2 break-all text-[13px] text-ink">
            {shown && value ? value : "••••••••••••••••"}
          </p>
          {entry.notes ? (
            <p className="ns-caption mt-2 line-clamp-2 text-body-muted">{entry.notes}</p>
          ) : null}
          <p className="ns-mono mt-2 text-muted">{formatRelative(entry.updatedAt)}</p>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" aria-label="Show or hide" onClick={() => void toggleReveal()}>
            {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Copy secret" onClick={() => void copyValue()}>
            <Copy className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete"
            className="text-muted hover:text-error"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
}

function SecretEditorDialog({
  open,
  entry,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  entry: SecretEntry | null;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: {
    title: string;
    category: SecretCategory;
    username: string;
    value: string;
    notes: string;
  }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<SecretCategory>("api");
  const [username, setUsername] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(entry?.title ?? "");
    setCategory(entry?.category ?? "api");
    setUsername(entry?.username ?? "");
    setValue("");
    setNotes(entry?.notes ?? "");
    setBusy(false);
  }, [open, entry]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const ok = await onSave({ title, category, username, value, notes });
    if (!ok) setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit secret" : "Add secret"}</DialogTitle>
          <DialogDescription>
            {entry
              ? "Leave the secret value blank to keep the current one."
              : "Only the secret value is encrypted with your PIN."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="space-y-3.5">
          <label className="block space-y-1.5">
            <span className="ns-caption text-ink">Title</span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="OpenAI API / GitHub token"
              required
              autoFocus
            />
          </label>

          <label className="block space-y-1.5">
            <span className="ns-caption text-ink">Type</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as SecretCategory)}
              className="h-10 w-full rounded-sm border border-hairline bg-surface px-3 text-sm text-ink outline-none focus-visible:border-focus"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="ns-caption text-ink">Username / account (optional)</span>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="email or handle"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="ns-caption text-ink">
              {entry ? "New secret value (optional)" : "Secret value"}
            </span>
            <Input
              type="password"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={entry ? "Leave blank to keep current" : "sk-… or password"}
              required={!entry}
              autoComplete="off"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="ns-caption text-ink">Notes (optional)</span>
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Where this is used"
            />
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {entry ? "Save changes" : "Save secret"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
