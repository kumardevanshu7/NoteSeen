import { useState, type FormEvent } from "react";
import { Clock, Shield } from "lucide-react";
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

const DURATION_PRESETS = [
  { label: "This note only", minutes: 0 },
  { label: "5 min", minutes: 5 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
];

export function VaultGateDialog() {
  const pendingReason = useVault((state) => state.pendingReason);
  const config = useVault((state) => state.config);
  const setupVault = useVault((state) => state.setupVault);
  const unlockWithAnswer = useVault((state) => state.unlockWithAnswer);
  const cancelGate = useVault((state) => state.cancelGate);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = pendingReason !== null;
  const isSetup = pendingReason === "setup" || !config;
  const isEdit = pendingReason === "edit";

  const reset = () => {
    setQuestion("");
    setAnswer("");
    setSelectedDuration(0);
    setError(null);
    setBusy(false);
  };

  const onOpenChange = (next: boolean) => {
    if (!next) {
      cancelGate();
      reset();
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isSetup) {
        await setupVault(question, answer);
        toast.success("Vault set", {
          description: "Synced to your Google account — same question on every device.",
        });
        reset();
      } else {
        const reason = pendingReason;
        const duration = isEdit && selectedDuration > 0 ? selectedDuration : undefined;
        const ok = await unlockWithAnswer(answer, duration);
        if (!ok) {
          setError("Wrong answer. Try again.");
          setBusy(false);
          return;
        }
        if (duration) {
          toast.success(`Ready to edit — unlocked for ${duration} minutes`, {
            description: "You can freely edit notes across all tabs.",
          });
        } else {
          toast.success(reason === "delete" ? "Ready to delete" : "Ready to edit");
        }
        reset();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5 text-deep-green" />
            {isSetup ? "Set your vault" : "Confirm to continue"}
          </DialogTitle>
          <DialogDescription>
            {isSetup
              ? "One security question for this device. Every edit and delete asks for the answer."
              : pendingReason === "delete"
                ? "Answer your vault question to delete."
                : "Answer your vault question to edit."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
          {isSetup ? (
            <label className="block space-y-1.5">
              <span className="ns-caption text-ink">Security question</span>
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="e.g. What is my notebook nickname?"
                autoFocus
                required
              />
            </label>
          ) : (
            <p className="rounded-sm border border-hairline bg-stone px-3 py-3 text-sm text-ink">
              {config?.question}
            </p>
          )}

          <label className="block space-y-1.5">
            <span className="ns-caption text-ink">{isSetup ? "Answer" : "Your answer"}</span>
            <Input
              type="password"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder={isSetup ? "Choose something only you know" : "Type the answer"}
              autoFocus={!isSetup}
              required
              autoComplete="off"
            />
          </label>

          {/* If unlocking for edit, give option to start a Long-time Unlock Timer */}
          {!isSetup && isEdit ? (
            <div className="space-y-1.5 pt-1">
              <span className="ns-caption flex items-center gap-1.5 text-ink">
                <Clock className="size-3 text-muted" />
                Unlock duration
              </span>
              <div className="grid grid-cols-5 gap-1">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSelectedDuration(preset.minutes)}
                    className={`rounded-sm border px-1.5 py-1 text-[11px] font-medium transition-all ${
                      selectedDuration === preset.minutes
                        ? "border-focus bg-focus/10 text-focus font-semibold"
                        : "border-hairline bg-surface text-muted hover:text-ink"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {selectedDuration > 0 ? (
                <p className="ns-micro text-muted">
                  Allows editing notes freely across tabs for {selectedDuration} minutes without asking
                  for password.
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="ns-caption text-error">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {isSetup ? "Save vault" : "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

