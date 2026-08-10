import { useState, type FormEvent } from "react";
import { Shield } from "lucide-react";
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

export function VaultGateDialog() {
  const pendingReason = useVault((state) => state.pendingReason);
  const config = useVault((state) => state.config);
  const setupVault = useVault((state) => state.setupVault);
  const unlockWithAnswer = useVault((state) => state.unlockWithAnswer);
  const cancelGate = useVault((state) => state.cancelGate);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = pendingReason !== null;
  const isSetup = pendingReason === "setup" || !config;

  const reset = () => {
    setQuestion("");
    setAnswer("");
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
          description: "Every edit and delete will ask for this answer.",
        });
        reset();
      } else {
        const reason = pendingReason;
        const ok = await unlockWithAnswer(answer);
        if (!ok) {
          setError("Wrong answer. Try again.");
          setBusy(false);
          return;
        }
        toast.success("Verified", {
          description:
            reason === "delete" ? "You can delete now." : "You can edit this item now.",
        });
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
            {isSetup ? "Set your vault" : "Unlock to continue"}
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

          {error ? <p className="ns-caption text-error">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {isSetup ? "Save vault" : "Unlock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
