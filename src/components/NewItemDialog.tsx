import { FileText, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NoteKind } from "@/lib/types";

interface NewItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (kind: NoteKind) => void;
}

export function NewItemDialog({ open, onOpenChange, onChoose }: NewItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create new</DialogTitle>
          <DialogDescription>Pick what you want to save.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              onChoose("note");
              onOpenChange(false);
            }}
            className="flex flex-col items-start gap-3 rounded-sm border border-hairline bg-surface p-4 text-left transition-colors hover:bg-stone"
          >
            <FileText className="size-5 text-ink" />
            <span>
              <span className="block text-[15px] font-medium text-ink">Note</span>
              <span className="ns-caption mt-1 block text-body-muted">
                Freeform notepad — type and it saves itself.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onChoose("prompt");
              onOpenChange(false);
            }}
            className="flex flex-col items-start gap-3 rounded-sm border border-hairline bg-surface p-4 text-left transition-colors hover:bg-stone"
          >
            <Sparkles className="size-5 text-ink" />
            <span>
              <span className="block text-[15px] font-medium text-ink">Prompt</span>
              <span className="ns-caption mt-1 block text-body-muted">
                Title, tags, and a prompt you can copy in one tap.
              </span>
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
