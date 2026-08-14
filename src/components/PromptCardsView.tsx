import { useMemo, useState } from "react";
import { Images, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";
import { PromptCardForm } from "@/components/PromptCardForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoveToWorkspaceMenu } from "@/components/MoveToWorkspaceMenu";
import { useNotes } from "@/store/notes";
import { noteLabel, promptCards, searchNotes, trashedNotes } from "@/lib/selectors";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PromptCardsView() {
  const notes = useNotes((state) => state.notes);
  const workspaces = useNotes((state) => state.workspaces);
  const activeWorkspaceId = useNotes((state) => state.activeWorkspaceId);
  const query = useNotes((state) => state.query);
  const trashNote = useNotes((state) => state.trashNote);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [viewing, setViewing] = useState<Note | null>(null);
  const [labelFilter, setLabelFilter] = useState<string | null>(null);

  const allCards = useMemo(() => promptCards(notes), [notes]);
  const trashedCards = useMemo(
    () => trashedNotes(notes).filter((note) => note.kind === "promptCard"),
    [notes],
  );
  const viewingLive = viewing ? (notes[viewing.id] ?? null) : null;

  const allLabels = useMemo(() => {
    const set = new Map<string, string>();
    for (const card of allCards) {
      for (const tag of card.tags) {
        const key = tag.toLowerCase();
        if (!set.has(key)) set.set(key, tag);
      }
    }
    return [...set.values()].sort((a, b) => a.localeCompare(b));
  }, [allCards]);

  const visible = useMemo(() => {
    let list = searchNotes(allCards, query);
    if (labelFilter) {
      const needle = labelFilter.toLowerCase();
      list = list.filter((card) => card.tags.some((tag) => tag.toLowerCase() === needle));
    }
    return list;
  }, [allCards, query, labelFilter]);

  const openEdit = (card: Note) => {
    setViewing(null);
    setEditing(card);
  };

  return (
    <div className="ns-scroll min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10">
      <div className="mx-auto max-w-[110rem]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="ns-display text-ink">Prompt Cards</h1>
            <p className="ns-caption mt-2 text-body-muted">
              {visible.length} {visible.length === 1 ? "card" : "cards"}
              {labelFilter ? ` labeled “${labelFilter}”` : ""}
              {query ? ` matching “${query}”` : ""}
            </p>
          </div>
          <Button variant="primary" size="sm" className="gap-1.5 pl-3" onClick={() => setComposerOpen(true)}>
            <Plus className="size-3.5" />
            New card
          </Button>
        </div>

        {allLabels.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {allLabels.map((label) => {
              const active = labelFilter?.toLowerCase() === label.toLowerCase();
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setLabelFilter(active ? null : label)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[12px] transition-colors",
                    active
                      ? "border-ink/30 bg-stone text-ink"
                      : "border-hairline bg-surface text-slate hover:text-ink",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        {visible.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <Images className="size-8 text-muted" />
            <p className="mt-4 text-[15px] font-medium text-ink">
              {query || labelFilter ? "Nothing matches." : "No prompt cards yet."}
            </p>
            <p className="ns-caption mt-1 max-w-sm text-body-muted">
              Upload any-ratio images with a short detail and the prompt itself. They show up here as a gallery.
            </p>
            {trashedCards.length > 0 ? (
              <p className="ns-caption mt-3 max-w-sm text-body-muted">
                {trashedCards.length} prompt {trashedCards.length === 1 ? "card is" : "cards are"} in Trash — open Trash
                in the sidebar to restore them.
              </p>
            ) : null}
            {!query && !labelFilter ? (
              <Button variant="primary" size="sm" className="mt-6" onClick={() => setComposerOpen(true)}>
                <Plus className="size-3.5" />
                Create a card
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="ns-masonry mt-8">
            {visible.map((card) => (
              <div key={card.id} className="ns-masonry-item">
                <button
                  type="button"
                  onClick={() => setViewing(card)}
                  className="group w-full overflow-hidden rounded-sm border border-hairline bg-surface text-left transition-colors hover:border-ink/20"
                >
                  {card.coverUrl ? (
                    <img
                      src={card.coverUrl}
                      alt=""
                      className="block w-full"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-stone text-muted">
                      <Images className="size-6" />
                    </div>
                  )}
                  <span className="block px-3 py-3">
                    <span className="block text-[14px] font-medium text-ink">{noteLabel(card)}</span>
                    {card.subtitle.trim() ? (
                      <span className="ns-caption mt-1 block text-body-muted">{card.subtitle.trim()}</span>
                    ) : null}
                    {card.workspaceId !== activeWorkspaceId ? (
                      <span className="ns-caption mt-1 block text-muted">
                        {workspaces[card.workspaceId]?.name ?? "Workspace"}
                      </span>
                    ) : null}
                    {card.tags.length > 0 ? (
                      <span className="mt-2 flex flex-wrap gap-1">
                        {card.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="max-w-[8rem] truncate rounded-full border border-hairline bg-canvas px-1.5 py-px text-[10px] text-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="ns-scroll max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New prompt card</DialogTitle>
            <DialogDescription>Upload an image as-is. No crop, no edit.</DialogDescription>
          </DialogHeader>
          <PromptCardForm onCancel={() => setComposerOpen(false)} onSaved={() => setComposerOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="ns-scroll max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit prompt card</DialogTitle>
            <DialogDescription>Replace the image or update the prompt.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <PromptCardForm
              note={editing}
              onCancel={() => setEditing(null)}
              onSaved={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(viewingLive)}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      >
        <DialogContent className="ns-scroll max-h-[92vh] max-w-2xl overflow-y-auto">
          {viewingLive ? (
            <>
              <DialogHeader>
                <DialogTitle>{noteLabel(viewingLive)}</DialogTitle>
                <DialogDescription>
                  {[viewingLive.subtitle.trim(), viewingLive.tags.join(" · ")].filter(Boolean).join(" · ") ||
                    "Prompt card"}
                </DialogDescription>
              </DialogHeader>

              {viewingLive.coverUrl ? (
                <img
                  src={viewingLive.coverUrl}
                  alt=""
                  className="mb-4 max-h-[52vh] w-full rounded-sm object-contain bg-stone"
                />
              ) : null}

              <pre className="ns-scroll max-h-[28vh] overflow-auto whitespace-pre-wrap rounded-sm border border-hairline bg-canvas px-3 py-3 font-mono text-[13px] leading-relaxed text-ink">
                {viewingLive.text.trim() || "Empty prompt"}
              </pre>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mr-auto text-error"
                  onClick={() => {
                    void trashNote(viewingLive.id).then((ok) => {
                      if (ok) setViewing(null);
                    });
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => openEdit(viewingLive)}>
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                <MoveToWorkspaceMenu
                  noteId={viewingLive.id}
                  currentWorkspaceId={viewingLive.workspaceId}
                  onMoved={() => setViewing(null)}
                />
                <CopyButton note={viewingLive} label="Copy prompt" />
                <Button type="button" variant="ghost" size="sm" onClick={() => setViewing(null)}>
                  <X className="size-3.5" />
                  Close
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
