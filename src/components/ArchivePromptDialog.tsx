import { Archive, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ArchivePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteTitle: string;
  onArchive: () => void;
  onKeep: () => void;
}

export function ArchivePromptDialog({
  open,
  onOpenChange,
  noteTitle,
  onArchive,
  onKeep,
}: ArchivePromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 ring-8 ring-emerald-500/10">
            <CheckCircle2 className="size-6" />
          </div>
          <DialogTitle className="text-center text-lg font-semibold text-ink">
            100% Checked &amp; Covered!
          </DialogTitle>
          <DialogDescription className="text-center text-body-muted text-[13.5px] leading-relaxed pt-1">
            <span className="font-medium text-ink">
              &quot;{noteTitle || "Untitled note"}&quot;
            </span>{" "}
            is now marked as 100% finished. Would you like to put it in your{" "}
            <span className="font-medium text-ink">Archive Space</span> to keep your workspace clean?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => {
              onKeep();
              onOpenChange(false);
            }}
            className="w-full sm:w-auto"
          >
            Keep in Notes
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onArchive();
              onOpenChange(false);
            }}
            className="w-full gap-1.5 sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Archive className="size-4" />
            <span>Put in Archive Space</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
