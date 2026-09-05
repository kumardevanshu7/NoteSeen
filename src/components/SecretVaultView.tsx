import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import {
  AlignLeft,
  Check,
  Columns3,
  Copy,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  LayoutGrid,
  List,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotes } from "@/store/notes";
import { useSecrets } from "@/store/secrets";
import { requireVault } from "@/store/vault";
import { nanoid } from "nanoid";
import type { SecretCategory, SecretEntry, SecretField } from "@/lib/types";
import { parseSecretValues, serializeSecretValues } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";

const CATEGORIES: { id: SecretCategory; label: string }[] = [
  { id: "api", label: "API key" },
  { id: "password", label: "Password" },
  { id: "other", label: "Other" },
];

type VaultViewMode = "list" | "details" | "grid";
const COLUMN_CHOICES = [4, 5, 6, 7] as const;
const PREFS_KEY = "noteseen.secrets-view";
const IDLE_MS = 60_000;

interface VaultPrefs {
  view: VaultViewMode;
  cols: number;
}

function readPrefs(): VaultPrefs {
  const fallback: VaultPrefs = { view: "list", cols: 4 };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<VaultPrefs>;
    return {
      view:
        parsed.view === "details" || parsed.view === "grid" || parsed.view === "list"
          ? parsed.view
          : "list",
      cols: COLUMN_CHOICES.includes(parsed.cols as (typeof COLUMN_CHOICES)[number])
        ? (parsed.cols as number)
        : 4,
    };
  } catch {
    return fallback;
  }
}

function columnCeiling(width: number): number {
  if (width < 640) return 1;
  if (width < 900) return 2;
  if (width < 1200) return 3;
  if (width < 1500) return 4;
  return COLUMN_CHOICES[COLUMN_CHOICES.length - 1];
}

function useColumnCeiling(): number {
  const [ceiling, setCeiling] = useState(() =>
    typeof window === "undefined" ? 4 : columnCeiling(window.innerWidth),
  );
  useEffect(() => {
    const onResize = () => setCeiling(columnCeiling(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return ceiling;
}

export function SecretVaultView() {
  const ready = useSecrets((state) => state.ready);
  const pinConfig = useSecrets((state) => state.pinConfig);
  const unlocked = useSecrets((state) => state.unlocked);
  const entries = useSecrets((state) => state.entries);
  const activeWorkspaceId = useNotes((state) => state.activeWorkspaceId);
  const initSecrets = useSecrets((state) => state.initSecrets);
  const setupPin = useSecrets((state) => state.setupPin);
  const unlock = useSecrets((state) => state.unlock);
  const lock = useSecrets((state) => state.lock);
  const addEntry = useSecrets((state) => state.addEntry);
  const updateEntry = useSecrets((state) => state.updateEntry);
  const removeEntry = useSecrets((state) => state.removeEntry);
  const revealValue = useSecrets((state) => state.revealValue);
  const setView = useNotes((state) => state.setView);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SecretEntry | null>(null);
  const [viewing, setViewing] = useState<SecretEntry | null>(null);
  const [filter, setFilter] = useState<SecretCategory | "all">("all");
  const [prefs, setPrefs] = useState<VaultPrefs>(readPrefs);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const ceiling = useColumnCeiling();
  const effectiveCols =
    prefs.view === "grid" ? Math.min(prefs.cols, ceiling) : prefs.view === "list" ? 1 : 1;

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void initSecrets();
  }, [initSecrets]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs]);

  /** 1 minute of no activity while unlocked → lock + leave vault. */
  const bumpIdle = useCallback(() => {
    if (!unlocked) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      lock();
      setView("all");
      toast("Secret vault locked", {
        description: "No activity for 1 minute — sent you back to My Notes.",
      });
    }, IDLE_MS);
  }, [unlocked, lock, setView]);

  useEffect(() => {
    if (!unlocked) {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      return;
    }

    bumpIdle();
    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "mousemove",
      "touchstart",
      "scroll",
      "wheel",
    ];
    const onActivity = () => bumpIdle();
    for (const event of events) window.addEventListener(event, onActivity, { passive: true });
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      for (const event of events) window.removeEventListener(event, onActivity);
    };
  }, [unlocked, bumpIdle]);

  const workspaceEntries = useMemo(
    () => entries.filter((entry) => entry.workspaceId === activeWorkspaceId),
    [entries, activeWorkspaceId],
  );

  const visible = useMemo(() => {
    if (filter === "all") return workspaceEntries;
    return workspaceEntries.filter((entry) => entry.category === filter);
  }, [workspaceEntries, filter]);

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

  const openEditor = async (entry: SecretEntry | null): Promise<boolean> => {
    if (entry) {
      const ok = await requireVault("edit");
      if (!ok) return false;
    }
    setEditing(entry);
    setEditorOpen(true);
    return true;
  };

  const openDetail = (entry: SecretEntry) => {
    setViewing(entry);
  };

  const deleteSecret = async (id: string): Promise<boolean> => {
    const ok = await requireVault("delete");
    if (!ok) return false;
    return removeEntry(id);
  };

  // Keep the open detail card in sync after edits/deletes.
  const viewingLive = viewing
    ? (workspaceEntries.find((entry) => entry.id === viewing.id) ?? null)
    : null;

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="ns-mono text-muted">Opening secret vault…</span>
      </div>
    );
  }

  if (!pinConfig) {
    return (
      <div className="ns-scroll min-h-0 flex-1 overflow-y-auto px-5 py-10 sm:px-10">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <KeyRound className="mx-auto size-8 text-deep-green" />
            <h1 className="ns-display mt-4 text-ink">Secret vault</h1>
            <p className="ns-caption mt-3 text-body-muted">
              Set a separate 4-digit PIN for API keys and passwords. This is not the same as your
              note edit question.
            </p>
            <button
              type="button"
              onClick={() => setSafetyOpen(true)}
              className="ns-caption mt-3 inline-flex items-center gap-1.5 text-slate underline-offset-2 hover:text-ink hover:underline"
            >
              <Info className="size-3.5" />
              How is this safe?
            </button>
          </div>
          <form onSubmit={(event) => void onSetup(event)} className="space-y-4">
            <PinField label="Create 4-digit PIN" value={pin} onChange={setPin} autoFocus />
            <PinField label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} />
            {error ? <p className="ns-caption text-error">{error}</p> : null}
            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              Create vault
            </Button>
          </form>
          <SafetyInfoDialog open={safetyOpen} onOpenChange={setSafetyOpen} />
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="ns-scroll min-h-0 flex-1 overflow-y-auto px-5 py-10 sm:px-10">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <Lock className="mx-auto size-8 text-deep-green" />
            <h1 className="ns-display mt-4 text-ink">Enter PIN</h1>
            <p className="ns-caption mt-3 text-body-muted">
              Unlock to view or add secrets. Values stay encrypted until you unlock.
            </p>
            <button
              type="button"
              onClick={() => setSafetyOpen(true)}
              className="ns-caption mt-3 inline-flex items-center gap-1.5 text-slate underline-offset-2 hover:text-ink hover:underline"
            >
              <Info className="size-3.5" />
              How is this safe?
            </button>
          </div>
          <form onSubmit={(event) => void onUnlock(event)} className="space-y-4">
            <PinField label="4-digit PIN" value={pin} onChange={setPin} autoFocus />
            {error ? <p className="ns-caption text-error">{error}</p> : null}
            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              Unlock
            </Button>
          </form>
          <SafetyInfoDialog open={safetyOpen} onOpenChange={setSafetyOpen} />
        </div>
      </div>
    );
  }

  return (
    <div className="ns-scroll min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10">
      <div className={cn("mx-auto", prefs.view === "grid" ? "max-w-[110rem]" : "max-w-3xl")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="ns-display text-ink">Secret vault</h1>
            <p className="ns-caption mt-2 text-body-muted">
              {workspaceEntries.length}{" "}
              {workspaceEntries.length === 1 ? "secret" : "secrets"} in this workspace · PIN protected · locks
              after 1 min idle
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="How is this safe?"
              onClick={() => setSafetyOpen(true)}
            >
              <Info className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                lock();
                setView("all");
              }}
            >
              <Lock className="size-3.5" />
              Lock
            </Button>
            <Button variant="primary" size="sm" onClick={() => openEditor(null)}>
              <Plus className="size-3.5" />
              Add secret
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
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

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-hairline p-1">
              {(
                [
                  { id: "list", label: "List view", icon: List },
                  { id: "details", label: "Details view", icon: AlignLeft },
                  { id: "grid", label: "Grid view", icon: LayoutGrid },
                ] as { id: VaultViewMode; label: string; icon: typeof List }[]
              ).map((option) => {
                const active = prefs.view === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={active}
                    onClick={() => setPrefs((prev) => ({ ...prev, view: option.id }))}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full transition-colors",
                      active
                        ? "bg-primary text-primary-ink"
                        : "text-slate hover:bg-stone hover:text-ink",
                    )}
                  >
                    <option.icon className="size-4" />
                  </button>
                );
              })}
            </div>

            {prefs.view === "grid" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns3 className="size-3.5" />
                    {prefs.cols} cols
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Columns</DropdownMenuLabel>
                  {COLUMN_CHOICES.map((count) => (
                    <DropdownMenuItem
                      key={count}
                      onSelect={() => setPrefs((prev) => ({ ...prev, cols: count }))}
                    >
                      <span className="flex-1">{count} columns</span>
                      {prefs.cols === count ? <Check className="size-3.5" /> : null}
                    </DropdownMenuItem>
                  ))}
                  {ceiling < prefs.cols ? (
                    <p className="ns-micro px-2.5 pt-2 pb-1 text-muted">
                      Showing {ceiling} — screen is too narrow for {prefs.cols}.
                    </p>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="mt-14 rounded-lg border border-dashed border-hairline px-8 py-16 text-center">
            <Shield className="mx-auto size-5 text-muted" />
            <p className="ns-feature mt-4 text-ink">No secrets yet</p>
            <p className="ns-caption mx-auto mt-2 max-w-sm text-body-muted">
              Store API keys, account passwords, and tokens here. Only the secret value is encrypted.
            </p>
            <Button variant="primary" size="sm" className="mt-6" onClick={() => openEditor(null)}>
              <Plus className="size-3.5" />
              Add your first secret
            </Button>
          </div>
        ) : prefs.view === "list" ? (
          <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
            {visible.map((entry) => (
              <SecretCard
                key={entry.id}
                entry={entry}
                variant="list"
                onOpen={() => openDetail(entry)}
                onEdit={() => void openEditor(entry)}
                onDelete={() => void deleteSecret(entry.id)}
                onReveal={() => revealValue(entry.id)}
              />
            ))}
          </ul>
        ) : prefs.view === "details" ? (
          <ul className="mt-8 space-y-3">
            {visible.map((entry) => (
              <SecretCard
                key={entry.id}
                entry={entry}
                variant="details"
                onOpen={() => openDetail(entry)}
                onEdit={() => void openEditor(entry)}
                onDelete={() => void deleteSecret(entry.id)}
                onReveal={() => revealValue(entry.id)}
              />
            ))}
          </ul>
        ) : (
          <ul
            className="mt-8 grid gap-3"
            style={{ gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))` }}
          >
            {visible.map((entry) => (
              <SecretCard
                key={entry.id}
                entry={entry}
                variant="grid"
                onOpen={() => openDetail(entry)}
                onEdit={() => void openEditor(entry)}
                onDelete={() => void deleteSecret(entry.id)}
                onReveal={() => revealValue(entry.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <SecretDetailDialog
        entry={viewingLive}
        open={Boolean(viewingLive)}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        onEdit={() => {
          if (!viewingLive) return;
          void openEditor(viewingLive).then((ok) => {
            if (ok) setViewing(null);
          });
        }}
        onDelete={() => {
          if (!viewingLive) return;
          void deleteSecret(viewingLive.id).then((ok) => {
            if (ok) setViewing(null);
          });
        }}
        onReveal={() => (viewingLive ? revealValue(viewingLive.id) : Promise.resolve(null))}
      />

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
          const created = await addEntry(draft, activeWorkspaceId);
          if (created) setEditorOpen(false);
          return Boolean(created);
        }}
      />
      <SafetyInfoDialog open={safetyOpen} onOpenChange={setSafetyOpen} />
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
  variant,
  onOpen,
  onEdit,
  onDelete,
  onReveal,
}: {
  entry: SecretEntry;
  variant: "list" | "details" | "grid";
  onOpen: () => void;
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

  const fields = useMemo(() => {
    if (!value) return [];
    return parseSecretValues(value);
  }, [value]);

  const copyValue = async () => {
    const plain = value ?? (await onReveal());
    if (!plain) return;
    const parsed = parseSecretValues(plain);
    if (parsed.length > 1) {
      const primary = parsed[0];
      await navigator.clipboard.writeText(primary.value);
      toast.success(primary.label ? `Copied ${primary.label}` : "Primary secret copied", {
        description: `This card has ${parsed.length} keys. Open details to view and copy all.`,
      });
    } else {
      await navigator.clipboard.writeText(parsed[0]?.value ?? plain);
      toast.success("Copied");
    }
  };

  const stop = (event: MouseEvent) => {
    event.stopPropagation();
  };

  const categoryLabel =
    CATEGORIES.find((cat) => cat.id === entry.category)?.label ?? entry.category;

  const actions = (
    <div className="flex items-center gap-0.5" onClick={stop} onKeyDown={(e) => e.stopPropagation()}>
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
  );

  if (variant === "list") {
    return (
      <li>
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-center gap-3 px-2 py-3 text-left transition-colors hover:bg-stone/50"
        >
          <KeyRound className="size-3.5 shrink-0 text-slate" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[14px] font-medium text-ink">{entry.title}</p>
              {shown && fields.length > 1 && (
                <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {fields.length} keys
                </span>
              )}
            </div>
            <p className="ns-caption truncate text-body-muted">
              {entry.username || categoryLabel}
              {entry.notes ? ` · ${entry.notes.split("\n")[0]}` : ""}
            </p>
          </div>
          <span className="ns-mono hidden w-20 shrink-0 text-right text-muted sm:block">
            {formatRelative(entry.updatedAt)}
          </span>
          <div onClick={stop}>{actions}</div>
        </button>
      </li>
    );
  }

  if (variant === "grid") {
    return (
      <li>
        <button
          type="button"
          onClick={onOpen}
          className="flex h-44 w-full flex-col rounded-sm border border-hairline bg-surface p-3 text-left transition-colors hover:border-ink/20"
        >
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium text-ink">{entry.title}</p>
            <span className="ns-mono mt-1 inline-block rounded-full border border-hairline px-2 py-px text-muted">
              {categoryLabel}
            </span>
          </div>
          {entry.username ? (
            <p className="ns-caption mt-2 truncate text-body-muted">{entry.username}</p>
          ) : null}
          {entry.notes ? (
            <p className="ns-caption mt-2 line-clamp-2 whitespace-pre-wrap text-body-muted">
              {entry.notes}
            </p>
          ) : (
            <div className="ns-mono mt-auto flex items-center justify-between gap-1 text-[12px] text-ink">
              <span className="truncate">
                {shown && fields.length > 0
                  ? fields[0].label
                    ? `${fields[0].label}: ${fields[0].value}`
                    : fields[0].value
                  : "••••••••••••"}
              </span>
              {shown && fields.length > 1 && (
                <span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[10px] font-semibold text-primary">
                  +{fields.length - 1} more
                </span>
              )}
            </div>
          )}
          <div className="mt-auto flex items-center justify-between gap-1 pt-2">
            <span className="ns-mono text-muted">{formatRelative(entry.updatedAt)}</span>
            <div onClick={stop}>{actions}</div>
          </div>
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-sm border border-hairline bg-surface p-4 text-left transition-colors hover:border-ink/20"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[15px] font-medium text-ink">{entry.title}</h2>
              <span className="ns-mono rounded-full border border-hairline px-2 py-px text-muted">
                {categoryLabel}
              </span>
              {shown && fields.length > 1 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {fields.length} keys
                </span>
              )}
            </div>
            {entry.username ? (
              <p className="ns-caption mt-1 truncate text-body-muted">{entry.username}</p>
            ) : null}
            {shown && fields.length > 0 ? (
              <div className="mt-2 space-y-1">
                {fields.map((f, idx) => (
                  <p key={f.id || idx} className="ns-mono break-all text-[13px] text-ink">
                    {f.label ? (
                      <span className="mr-1.5 text-xs text-body-muted">{f.label}:</span>
                    ) : null}
                    {f.value}
                  </p>
                ))}
              </div>
            ) : (
              <p className="ns-mono mt-2 break-all text-[13px] text-ink">
                ••••••••••••••••
              </p>
            )}
            {entry.notes ? (
              <p className="ns-caption mt-2 line-clamp-4 whitespace-pre-wrap text-body-muted">
                {entry.notes}
              </p>
            ) : null}
            <p className="ns-mono mt-2 text-muted">{formatRelative(entry.updatedAt)}</p>
          </div>
          <div onClick={stop}>{actions}</div>
        </div>
      </button>
    </li>
  );
}

async function copyText(text: string, label = "Copied") {
  if (!text.trim()) {
    toast("Nothing to copy");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Could not copy");
  }
}

function SecretDetailDialog({
  entry,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onReveal,
}: {
  entry: SecretEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onReveal: () => Promise<string | null>;
}) {
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<SecretField[]>([]);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !entry) {
      setFields([]);
      setRevealedIds({});
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void onReveal()
      .then((plain) => {
        if (!active) return;
        if (plain != null) {
          const parsed = parseSecretValues(plain);
          setFields(parsed);
        } else {
          setFields([]);
          setError("Could not decrypt secrets. Please re-enter your PIN.");
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to decrypt secrets.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, entry?.id, entry?.updatedAt, onReveal]);

  if (!entry) return null;

  const categoryLabel =
    CATEGORIES.find((cat) => cat.id === entry.category)?.label ?? entry.category;
  const isApi = entry.category === "api";

  const allRevealed = fields.length > 0 && fields.every((f) => revealedIds[f.id]);

  const toggleRevealAll = () => {
    const nextState = !allRevealed;
    const nextMap: Record<string, boolean> = {};
    for (const f of fields) {
      nextMap[f.id] = nextState;
    }
    setRevealedIds(nextMap);
  };

  const toggleFieldReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyAllKeys = async () => {
    if (fields.length === 0) return;
    const allText = fields
      .map((f, i) => `${f.label || (isApi ? `API Key ${i + 1}` : `Key ${i + 1}`)}: ${f.value}`)
      .join("\n");
    await copyText(allText, `All ${fields.length} keys copied`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6">{entry.title}</DialogTitle>
          <DialogDescription>
            Full secret details — description is plain text so you can remember context.
          </DialogDescription>
        </DialogHeader>

        <div className="ns-scroll max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="ns-mono rounded-full border border-hairline px-2.5 py-0.5 text-muted">
              {categoryLabel}
            </span>
            <span className="ns-mono text-muted">{formatRelative(entry.updatedAt)}</span>
          </div>

          {entry.username ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="ns-caption text-ink">Username / account</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Copy username"
                  onClick={() => void copyText(entry.username, "Username copied")}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
              <p className="rounded-sm border border-hairline bg-stone/50 px-3 py-2 text-sm text-ink">
                {entry.username}
              </p>
            </div>
          ) : null}

          {/* Secret keys section */}
          {loading ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="ns-caption text-ink font-medium">
                  {isApi ? "API Keys" : `${categoryLabel} values`}
                </span>
              </div>
              <div className="flex items-center justify-center rounded-sm border border-hairline bg-stone/30 py-6 text-xs text-body-muted">
                <span className="animate-pulse">Decrypting keys…</span>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-sm border border-error/30 bg-error/5 p-3 text-xs text-error">
              {error}
            </div>
          ) : fields.length > 1 ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="ns-caption font-medium text-ink">
                  {isApi
                    ? `API Keys (${fields.length})`
                    : `${categoryLabel} values (${fields.length})`}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-slate hover:text-ink hover:bg-stone/80"
                    onClick={toggleRevealAll}
                  >
                    {allRevealed ? (
                      <>
                        <EyeOff className="mr-1 size-3.5" />
                        Hide all
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1 size-3.5" />
                        Show all
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                    onClick={() => void copyAllKeys()}
                  >
                    <Copy className="mr-1 size-3" />
                    Copy all
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {fields.map((f, i) => {
                  const isShown = Boolean(revealedIds[f.id]);
                  return (
                    <div
                      key={f.id || i}
                      className="rounded-sm border border-hairline bg-stone/50 p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-hairline/50 pb-1">
                        <span className="ns-mono text-[11px] font-semibold text-primary uppercase tracking-wider">
                          {isApi ? `API Key #${i + 1}` : `Key #${i + 1}`}
                          {f.label ? ` · ${f.label}` : ""}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={isShown ? "Hide key" : "Show key"}
                            title={isShown ? "Hide key" : "Show key"}
                            onClick={() => toggleFieldReveal(f.id)}
                          >
                            {isShown ? (
                              <EyeOff className="size-3.5" />
                            ) : (
                              <Eye className="size-3.5" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Copy ${f.label || "key"}`}
                            title={`Copy ${f.label || "key"}`}
                            onClick={() =>
                              void copyText(
                                f.value,
                                `${f.label || `Key #${i + 1}`} copied`,
                              )
                            }
                          >
                            <Copy className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="break-all font-mono text-[13px] text-ink select-all">
                        {isShown ? f.value : "••••••••••••••••••••"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : fields.length === 1 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="ns-caption font-medium text-ink">
                  {isApi ? "API key value" : `${categoryLabel} value`}
                  {fields[0].label ? ` · ${fields[0].label}` : ""}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      revealedIds[fields[0].id] ? "Hide secret" : "Show secret"
                    }
                    title={
                      revealedIds[fields[0].id] ? "Hide secret" : "Show secret"
                    }
                    onClick={() => toggleFieldReveal(fields[0].id)}
                  >
                    {revealedIds[fields[0].id] ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Copy secret"
                    title="Copy secret"
                    onClick={() =>
                      void copyText(
                        fields[0].value,
                        `${fields[0].label || "Secret"} copied`,
                      )
                    }
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
              <p className="break-all rounded-sm border border-hairline bg-stone/50 px-3 py-2 font-mono text-[13px] text-ink select-all">
                {revealedIds[fields[0].id]
                  ? fields[0].value
                  : "••••••••••••••••••••"}
              </p>
            </div>
          ) : (
            <div className="rounded-sm border border-hairline bg-stone/30 p-3 text-xs text-body-muted text-center">
              No secret values saved yet. Click Edit to add keys.
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="ns-caption text-ink">Description</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Copy description"
                disabled={!entry.notes.trim()}
                onClick={() => void copyText(entry.notes, "Description copied")}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
            {entry.notes.trim() ? (
              <div className="whitespace-pre-wrap rounded-sm border border-hairline bg-stone/50 px-3 py-3 text-sm leading-relaxed text-ink">
                {entry.notes}
              </div>
            ) : (
              <p className="ns-caption text-muted">No description yet.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" className="text-error" onClick={onDelete}>
            <Trash2 className="size-3.5" />
            Delete
          </Button>
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button type="button" variant="primary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [fields, setFields] = useState<
    Array<{ id: string; label: string; value: string; show?: boolean }>
  >([{ id: "1", label: "", value: "", show: false }]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingValues, setLoadingValues] = useState(false);
  const revealValue = useSecrets((state) => state.revealValue);

  useEffect(() => {
    if (!open) return;
    setTitle(entry?.title ?? "");
    setCategory(entry?.category ?? "api");
    setUsername(entry?.username ?? "");
    setNotes(entry?.notes ?? "");
    setBusy(false);

    if (entry) {
      setLoadingValues(true);
      void revealValue(entry.id)
        .then((plain) => {
          if (plain) {
            const parsed = parseSecretValues(plain);
            if (parsed.length > 0) {
              setFields(parsed.map((p) => ({ ...p, show: false })));
              return;
            }
          }
          setFields([{ id: nanoid(6), label: "", value: "", show: false }]);
        })
        .finally(() => {
          setLoadingValues(false);
        });
    } else {
      setLoadingValues(false);
      setFields([{ id: nanoid(6), label: "", value: "", show: false }]);
    }
  }, [open, entry, revealValue]);

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { id: nanoid(6), label: "", value: "", show: false },
    ]);
  };

  const removeField = (id: string) => {
    setFields((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((f) => f.id !== id);
    });
  };

  const updateField = (
    id: string,
    patch: Partial<{ label: string; value: string; show: boolean }>,
  ) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const serialized = serializeSecretValues(fields);
    if (!serialized && !entry) {
      toast.error("Please enter at least one secret value");
      return;
    }
    setBusy(true);
    const ok = await onSave({ title, category, username, value: serialized, notes });
    if (!ok) setBusy(false);
  };

  const isApi = category === "api";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto ns-scroll">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit secret" : "Add secret"}</DialogTitle>
          <DialogDescription>
            {entry
              ? "Edit your keys, or click + to add more keys to this card."
              : "Secret values are securely encrypted on your device with your PIN."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="space-y-3.5">
          <label className="block space-y-1.5">
            <span className="ns-caption text-ink">Title</span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={isApi ? "OpenAI API / GitHub token" : "Account / Service name"}
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

          {/* Secret values / multiple keys section */}
          <div className="space-y-2 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="ns-caption text-ink font-medium">
                {isApi
                  ? fields.length > 1
                    ? `API Keys (${fields.length})`
                    : "API key"
                  : fields.length > 1
                    ? `Secret Values (${fields.length})`
                    : "Secret value"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addField}
                className="h-7 px-2 text-xs font-medium text-primary hover:bg-primary/10"
              >
                <Plus className="mr-1 size-3.5" />
                <span>{isApi ? "Add another API key" : "Add another secret"}</span>
              </Button>
            </div>

            {loadingValues ? (
              <div className="rounded-md border border-hairline bg-stone/30 p-3 text-center text-xs text-body-muted">
                Decrypting existing secrets...
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="rounded-md border border-hairline bg-stone/30 p-3 space-y-2.5 transition-colors focus-within:border-primary/40 focus-within:bg-stone/40"
                  >
                    <div className="flex items-center justify-between border-b border-hairline/60 pb-1.5">
                      <span className="ns-mono text-[11px] font-semibold text-primary uppercase tracking-wider">
                        {isApi ? `API Key #${idx + 1}` : `Secret #${idx + 1}`}
                        {field.label.trim() ? ` · ${field.label.trim()}` : ""}
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeField(field.id)}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-error/10 hover:text-error transition-colors"
                          title="Remove this key"
                        >
                          <Trash2 className="size-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Key title / name input */}
                    <div className="space-y-1">
                      <label className="text-[11.5px] font-medium text-slate flex items-center justify-between">
                        <span>{isApi ? "Key Title / Name" : "Secret Title / Name"}</span>
                        <span className="text-[10px] text-muted font-normal">optional</span>
                      </label>
                      <Input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        placeholder={
                          isApi
                            ? idx === 0
                              ? "e.g. Primary Key, Public ID, Production Key"
                              : `e.g. Secret Key, Backup Key #${idx + 1}, Webhook Token`
                            : "e.g. Master Password, Pin, Recovery Code"
                        }
                        className="h-8.5 text-xs bg-surface"
                      />
                    </div>

                    {/* Key secret value input */}
                    <div className="space-y-1">
                      <label className="text-[11.5px] font-medium text-slate">
                        {isApi ? "API Key / Token Value" : "Secret Value"}
                      </label>
                      <div className="relative flex items-center">
                        <Input
                          type={field.show ? "text" : "password"}
                          value={field.value}
                          onChange={(e) => updateField(field.id, { value: e.target.value })}
                          placeholder={isApi ? "sk-… or API token" : "password or secret"}
                          required={idx === 0 && !entry}
                          autoComplete="off"
                          className="h-9 pr-9 font-mono text-xs bg-surface"
                        />
                        <button
                          type="button"
                          onClick={() => updateField(field.id, { show: !field.show })}
                          className="absolute right-2.5 text-muted hover:text-ink transition-colors"
                          tabIndex={-1}
                          title={field.show ? "Hide key" : "Show key"}
                        >
                          {field.show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addField}
                  className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-hairline py-2 text-xs font-medium text-slate hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
                >
                  <Plus className="size-3.5" />
                  <span>
                    {isApi
                      ? "Add another API key to this card"
                      : "Add another secret to this card"}
                  </span>
                </button>
              </div>
            )}
          </div>

          <label className="block space-y-1.5">
            <span className="ns-caption text-ink">Description (optional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value.slice(0, 20_000))}
              placeholder={
                "Write as many lines as you need — press Enter for a new line.\nPortal URL, employee id, how to use this key…"
              }
              rows={5}
              className="ns-scroll min-h-[7rem] w-full resize-y rounded-sm border border-hairline bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink outline-none placeholder:text-muted focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/20"
            />
            <span className="ns-micro text-muted">{notes.length.toLocaleString()} / 20,000</span>
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy || loadingValues}>
              {loadingValues ? "Decrypting…" : entry ? "Save changes" : "Save secret"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SafetyInfoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5 text-deep-green" />
            How your secrets stay safe
          </DialogTitle>
          <DialogDescription>
            Short version: Firebase never stores your real password or API key — only gibberish.
          </DialogDescription>
        </DialogHeader>

        <div className="ns-scroll max-h-[60vh] space-y-4 overflow-y-auto pr-1 text-sm leading-relaxed text-body-muted">
          <section className="space-y-1.5">
            <h3 className="font-medium text-ink">What you see vs what the database sees</h3>
            <p>
              When you save a secret, NoteSeen encrypts it <strong className="text-ink">on your
              device</strong> before upload. In Firestore you only see fields like{" "}
              <code className="rounded bg-stone px-1 text-[12px] text-ink">valueCipher</code> and{" "}
              <code className="rounded bg-stone px-1 text-[12px] text-ink">valueIv</code> — random
              looking hex, not <code className="rounded bg-stone px-1 text-[12px] text-ink">sk-…</code>{" "}
              or your password.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium text-ink">Your 4-digit PIN</h3>
            <p>
              The PIN is never stored as plain digits. We keep a salted hash so NoteSeen can check
              “is this the right PIN?” without remembering the PIN itself. The real PIN stays in
              memory only while the vault is unlocked, then clears on Lock, idle timeout, or sign-out.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium text-ink">AES-GCM — the lock we use</h3>
            <p>
              Secrets are encrypted with <strong className="text-ink">AES-GCM</strong> (Advanced
              Encryption Standard in Galois/Counter Mode). In plain words:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-ink">AES</strong> turns your text into ciphertext that looks
                like nonsense without the key.
              </li>
              <li>
                <strong className="text-ink">GCM</strong> also adds an integrity check — if someone
                tampers with the gibberish in the database, decrypt fails instead of showing wrong
                data quietly.
              </li>
              <li>
                Each secret gets a fresh random <strong className="text-ink">IV</strong> (like a
                one-time salt for that encryption), so two identical passwords still look different
                in the database.
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium text-ink">Where the encryption key comes from</h3>
            <p>
              Your PIN + a random salt go through <strong className="text-ink">PBKDF2</strong>{" "}
              (120,000 rounds) to stretch a short PIN into a strong AES-256 key. That key never
              leaves the browser; Firestore only gets ciphertext.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium text-ink">What is still plain?</h3>
            <p>
              Title, category, username, and description are readable so you can find secrets. Only
              the secret <em>value</em> is encrypted. Don’t put the actual key inside the title or
              description.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium text-ink">Honest limits</h3>
            <p>
              A 4-digit PIN is convenient, not bank-grade. Anyone with your unlocked session (or
              your PIN) can reveal secrets. Keep the PIN private, use Lock when you step away, and
              remember the vault auto-locks after 1 minute of no activity.
            </p>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="primary" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

