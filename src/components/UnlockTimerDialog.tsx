import { useEffect, useState, type FormEvent } from "react";
import { Clock, Lock, ShieldCheck, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useVault } from "@/store/vault";

interface UnlockTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_DURATIONS = [
  { label: "5 min", minutes: 5 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "Custom", minutes: -1 },
];

function formatRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

export function UnlockTimerDialog({ open, onOpenChange }: UnlockTimerDialogProps) {
  const config = useVault((state) => state.config);
  const editUnlockExpiresAt = useVault((state) => state.editUnlockExpiresAt);
  const extendEditUnlockTimer = useVault((state) => state.extendEditUnlockTimer);
  const lockEditNow = useVault((state) => state.lockEditNow);
  const verifyAndStartTimer = useVault((state) => state.verifyAndStartTimer);

  const isTimerActive = editUnlockExpiresAt !== null && editUnlockExpiresAt > Date.now();

  const [selectedPreset, setSelectedPreset] = useState<number>(15);
  const [customMinutes, setCustomMinutes] = useState<string>("45");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!editUnlockExpiresAt) {
      setSecondsLeft(0);
      return;
    }
    const update = () => {
      setSecondsLeft(Math.max(0, Math.floor((editUnlockExpiresAt - Date.now()) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [editUnlockExpiresAt]);

  const resetForm = () => {
    setAnswer("");
    setError(null);
    setBusy(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const getEffectiveMinutes = (): number => {
    if (selectedPreset === -1) {
      const parsed = Number.parseInt(customMinutes, 10);
      return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1440) : 15;
    }
    return selectedPreset;
  };

  const onStartTimerSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!config) {
      toast.error("Set up your vault security question first.");
      return;
    }

    setBusy(true);
    setError(null);

    const minutes = getEffectiveMinutes();
    try {
      const ok = await verifyAndStartTimer(answer, minutes);
      if (!ok) {
        setError("Wrong answer. Try again.");
        setBusy(false);
        return;
      }
      toast.success(`Unlocked for ${minutes} minutes`, {
        description: "Freely edit notes across all tabs. Deletions still require your password.",
      });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock");
    } finally {
      setBusy(false);
    }
  };

  const handleExtend = (minutes: number) => {
    extendEditUnlockTimer(minutes);
    toast.success(`Extended by ${minutes} minutes`);
  };

  const handleLockNow = () => {
    lockEditNow();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="size-5 text-focus" />
            Long-time Unlock Timer
          </DialogTitle>
          <DialogDescription>
            {isTimerActive
              ? "Edit unlock timer is currently active for notes and prompts."
              : "Unlock editing across all notes and tabs for a chosen duration."}
          </DialogDescription>
        </DialogHeader>

        {isTimerActive ? (
          <div className="space-y-5 py-2">
            {/* Active Countdown Card */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-hairline bg-surface/50 p-6 text-center shadow-xs">
              <span className="ns-micro uppercase tracking-wider text-muted">Time Remaining</span>
              <div className="mt-2 font-mono text-4xl font-bold tracking-tight text-ink">
                {formatRemaining(secondsLeft)}
              </div>
              <p className="ns-caption mt-2 text-muted">
                You can switch between tabs and edit all notes without entering your password.
              </p>
            </div>

            {/* Quick Extension Buttons */}
            <div className="space-y-2">
              <span className="ns-caption block text-ink">Add more time</span>
              <div className="grid grid-cols-4 gap-2">
                {[5, 15, 30, 60].map((mins) => (
                  <Button
                    key={mins}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 font-mono text-xs"
                    onClick={() => handleExtend(mins)}
                  >
                    <Clock className="size-3" />
                    +{mins}m
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-hairline bg-stone/50 px-3 py-2 text-xs text-muted">
              <span className="font-semibold text-ink">Note:</span> Delete actions (moving to trash,
              emptying trash, purging) will always ask for your security question.
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-error hover:bg-error/10 hover:text-error border-error/30"
                onClick={handleLockNow}
              >
                <Lock className="size-3.5" />
                Lock notes now
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={(e) => void onStartTimerSubmit(e)} className="space-y-4 py-1">
            {/* Duration Selector */}
            <div className="space-y-2">
              <span className="ns-caption text-ink">Select unlock duration</span>
              <div className="grid grid-cols-5 gap-1.5">
                {PRESET_DURATIONS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSelectedPreset(preset.minutes)}
                    className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-all ${
                      selectedPreset === preset.minutes
                        ? "border-focus bg-focus/10 text-focus shadow-xs"
                        : "border-hairline bg-surface text-muted hover:border-ink/20 hover:text-ink"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {selectedPreset === -1 ? (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    placeholder="Minutes"
                    className="w-28 text-sm font-mono"
                    required
                  />
                  <span className="ns-caption text-muted">minutes (max 24 hours)</span>
                </div>
              ) : null}
            </div>

            {/* Vault Security Question & Answer */}
            {config ? (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <span className="ns-caption text-muted">Security question</span>
                  <p className="rounded-sm border border-hairline bg-stone px-3 py-2.5 text-sm text-ink font-medium">
                    {config.question}
                  </p>
                </div>

                <label className="block space-y-1.5">
                  <span className="ns-caption text-ink">Your answer</span>
                  <Input
                    type="password"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type the answer to unlock"
                    autoFocus
                    required
                    autoComplete="off"
                  />
                </label>
              </div>
            ) : (
              <div className="rounded-sm border border-hairline bg-stone p-3 text-sm text-muted">
                Please set up your vault password first before using the timer.
              </div>
            )}

            {error ? <p className="ns-caption text-error">{error}</p> : null}

            <div className="rounded-md border border-hairline bg-stone/40 px-3 py-2 text-xs text-muted">
              <span className="font-semibold text-ink">Protected:</span> Deletion operations will
              still require your security answer even while the timer is active.
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={busy || !config}>
                <ShieldCheck className="size-3.5" />
                Start Unlock Timer ({getEffectiveMinutes()}m)
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
