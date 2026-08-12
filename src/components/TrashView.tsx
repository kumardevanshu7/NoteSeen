import { useMemo } from "react";
import { RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotes } from "@/store/notes";
import { noteLabel, trashedNotes } from "@/lib/selectors";
import { excerpt, formatRelative } from "@/lib/utils";

export function TrashView() {
  const notes = useNotes((state) => state.notes);
  const restoreNote = useNotes((state) => state.restoreNote);
  const purgeNote = useNotes((state) => state.purgeNote);
  const emptyTrash = useNotes((state) => state.emptyTrash);

  const trashed = useMemo(() => trashedNotes(notes), [notes]);

  return (
    <div className="ns-scroll min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="ns-display text-ink">Trash</h1>
            <p className="ns-caption mt-2 text-body-muted">
              Deleted notes stay here until you remove them for good.
            </p>
          </div>
          {trashed.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => void emptyTrash()}>
              <Trash2 className="size-3.5" />
              Empty trash
            </Button>
          ) : null}
        </div>

        {trashed.length === 0 ? (
          <p className="ns-caption mt-14 rounded-lg border border-dashed border-hairline px-8 py-16 text-center text-body-muted">
            Trash is empty.
          </p>
        ) : (
          <ul className="mt-10">
            {trashed.map((note) => (
              <li
                key={note.id}
                className="flex items-center gap-4 border-b border-hairline py-4 first:border-t"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-ink">{noteLabel(note)}</p>
                  <p className="ns-micro mt-1 truncate text-muted">
                    {excerpt(note.text, 110) || "Empty note"}
                  </p>
                </div>
                <span className="ns-mono hidden shrink-0 text-muted sm:block">
                  {formatRelative(note.deletedAt ?? note.updatedAt)}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Restore note"
                    onClick={() => restoreNote(note.id)}
                  >
                    <RotateCcw />
                  </Button>
                  <Button
                    variant="danger"
                    size="icon-sm"
                    aria-label="Delete for good"
                    onClick={() => void purgeNote(note.id)}
                  >
                    <X />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
