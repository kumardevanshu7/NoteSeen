import { useState } from "react";
import { Folder, FolderPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotes } from "@/store/notes";
import { normalizeBundleName } from "@/lib/selectors";

interface BundleManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "rename" | "delete";
  bundleName?: string;
  onSuccess?: (newBundleName?: string) => void;
}

export function BundleManageDialog({
  open,
  onOpenChange,
  mode,
  bundleName = "",
  onSuccess,
}: BundleManageDialogProps) {
  const [name, setName] = useState(bundleName);
  const createBundle = useNotes((state) => state.createBundle);
  const renameBundle = useNotes((state) => state.renameBundle);
  const deleteBundle = useNotes((state) => state.deleteBundle);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeBundleName(name);
    if (!clean) {
      toast.error("Please enter a bundle name");
      return;
    }
    const created = createBundle(clean);
    toast.success(`Bundle "${created.name}" created`);
    onSuccess?.(created.name);
    onOpenChange(false);
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeBundleName(name);
    if (!clean) {
      toast.error("Please enter a valid bundle name");
      return;
    }
    if (clean.toLowerCase() === bundleName.toLowerCase()) {
      onOpenChange(false);
      return;
    }
    const count = renameBundle(bundleName, clean);
    toast.success(`Renamed bundle to "${clean}" (${count} notes updated)`);
    onSuccess?.(clean);
    onOpenChange(false);
  };

  const handleDelete = () => {
    const count = deleteBundle(bundleName);
    toast.success(`Disbanded bundle "${bundleName}" (${count} notes kept in notes)`);
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {mode === "create" ? (
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FolderPlus className="size-5" />
              </div>
              <DialogTitle className="text-center text-lg font-semibold text-ink">
                Create Note Bundle
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-body-muted">
                Group related subject notes, study modules, or project topics together into a bundle.
              </DialogDescription>
            </DialogHeader>

            <div className="my-5 space-y-2">
              <label htmlFor="bundle-name-input" className="text-xs font-medium text-slate">
                Bundle Name
              </label>
              <Input
                id="bundle-name-input"
                autoFocus
                placeholder="e.g. Physics, Calculus, React Masterclass, Client Work"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="h-10 text-sm"
              />
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Create Bundle
              </Button>
            </DialogFooter>
          </form>
        ) : mode === "rename" ? (
          <form onSubmit={handleRename}>
            <DialogHeader>
              <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Folder className="size-5" />
              </div>
              <DialogTitle className="text-center text-lg font-semibold text-ink">
                Rename Bundle
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-body-muted">
                Update the name of this bundle for all associated notes.
              </DialogDescription>
            </DialogHeader>

            <div className="my-5 space-y-2">
              <label htmlFor="rename-bundle-input" className="text-xs font-medium text-slate">
                New Bundle Name
              </label>
              <Input
                id="rename-bundle-input"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="h-10 text-sm"
              />
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div>
            <DialogHeader>
              <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-2xl bg-error/10 text-error">
                <Trash2 className="size-5" />
              </div>
              <DialogTitle className="text-center text-lg font-semibold text-ink">
                Disband Bundle?
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-body-muted leading-relaxed">
                Are you sure you want to disband the bundle{" "}
                <span className="font-semibold text-ink">&ldquo;{bundleName}&rdquo;</span>? All notes
                inside will remain in your notes workspace, but will no longer be bundled.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-6 gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={handleDelete}>
                Disband Bundle
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
