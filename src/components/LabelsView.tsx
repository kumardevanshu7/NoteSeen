import { useMemo, useState } from "react";
import { Check, Pencil, Tags, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotes } from "@/store/notes";
import { requireVault } from "@/store/vault";
import { collectLabels, normalizeLabelName } from "@/lib/selectors";

export function LabelsView() {
  const notes = useNotes((state) => state.notes);
  const setView = useNotes((state) => state.setView);
  const setQuery = useNotes((state) => state.setQuery);
  const renameLabel = useNotes((state) => state.renameLabel);
  const removeLabel = useNotes((state) => state.removeLabel);

  const labels = useMemo(() => collectLabels(notes), [notes]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (label: string) => {
    setEditing(label);
    setDraft(label);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
  };

  const saveEdit = async (from: string) => {
    const next = normalizeLabelName(draft);
    if (!next) {
      toast.error("Label cannot be empty");
      return;
    }
    if (next.toLowerCase() === from.toLowerCase()) {
      cancelEdit();
      return;
    }
    const ok = await requireVault("edit");
    if (!ok) return;
    const touched = renameLabel(from, next);
    toast.success(
      touched === 1 ? `Renamed on 1 note` : `Renamed on ${touched} notes`,
    );
    cancelEdit();
  };

  const onDelete = async (label: string) => {
    const ok = await requireVault("delete");
    if (!ok) return;
    const touched = removeLabel(label);
    toast.success(
      touched === 1 ? `Removed from 1 note` : `Removed from ${touched} notes`,
    );
    if (editing?.toLowerCase() === label.toLowerCase()) cancelEdit();
  };

  const openFiltered = (label: string) => {
    setQuery(label);
    setView("all");
  };

  return (
    <div className="ns-scroll min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="ns-display text-ink">Labels</h1>
            <p className="ns-caption mt-2 text-body-muted">
              Rename or remove labels across your notes. Edit and delete ask for your vault answer.
            </p>
          </div>
          <span className="ns-mono text-muted">
            {labels.length} label{labels.length === 1 ? "" : "s"}
          </span>
        </div>

        {labels.length === 0 ? (
          <div className="mt-14 rounded-lg border border-dashed border-hairline px-8 py-16 text-center">
            <Tags className="mx-auto size-5 text-muted" />
            <p className="ns-feature mt-4 text-ink">No labels yet</p>
            <p className="ns-caption mx-auto mt-2 max-w-sm text-body-muted">
              Add labels on a note — they show up here so you can manage them in one place.
            </p>
          </div>
        ) : (
          <ul className="mt-10 divide-y divide-hairline border-y border-hairline">
            {labels.map(({ label, count }) => {
              const isEditing = editing?.toLowerCase() === label.toLowerCase();
              return (
                <li key={label.toLowerCase()} className="flex flex-wrap items-center gap-3 py-4">
                  {isEditing ? (
                    <>
                      <Input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="min-w-[12rem] flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveEdit(label);
                          }
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <Button
                        variant="primary"
                        size="icon-sm"
                        aria-label="Save label"
                        onClick={() => void saveEdit(label)}
                      >
                        <Check className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Cancel"
                        onClick={cancelEdit}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => openFiltered(label)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="inline-flex max-w-full items-center gap-2">
                          <span className="truncate rounded-full border border-hairline bg-stone px-3 py-1 text-[13px] text-ink">
                            {label}
                          </span>
                          <span className="ns-mono shrink-0 text-muted">
                            {count} note{count === 1 ? "" : "s"}
                          </span>
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${label}`}
                        onClick={() => startEdit(label)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-error hover:text-error"
                        aria-label={`Delete ${label}`}
                        onClick={() => void onDelete(label)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
