import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightToLine,
  Copy,
  FolderInput,
  Pin,
  PinOff,
  Plus,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useNotes } from "@/store/notes";
import { noteLabel, workspaceList } from "@/lib/selectors";
import { workspaceColorTheme } from "@/lib/workspace-colors";
import { cn, modKeyLabel } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export function NoteTabs() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const notes = useNotes((state) => state.notes);
  const workspaces = useNotes((state) => state.workspaces);
  const activeWorkspaceId = useNotes((state) => state.activeWorkspaceId);
  const openTabs = useNotes((state) => state.openTabs);
  const activeId = useNotes((state) => state.activeId);
  const view = useNotes((state) => state.view);
  const setActive = useNotes((state) => state.setActive);
  const closeTab = useNotes((state) => state.closeTab);
  const closeOtherTabs = useNotes((state) => state.closeOtherTabs);
  const closeTabsToRight = useNotes((state) => state.closeTabsToRight);
  const reorderTab = useNotes((state) => state.reorderTab);
  const createNote = useNotes((state) => state.createNote);
  const duplicateNote = useNotes((state) => state.duplicateNote);
  const togglePin = useNotes((state) => state.togglePin);
  const moveNotesToWorkspace = useNotes((state) => state.moveNotesToWorkspace);
  const trashNote = useNotes((state) => state.trashNote);

  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; edge: "left" | "right" } | null>(null);

  const mod = modKeyLabel();
  const allWorkspaces = workspaceList(workspaces);

  const tabs = openTabs
    .map((id) => notes[id])
    .filter(
      (note): note is NonNullable<typeof note> =>
        Boolean(note) &&
        !note.deletedAt &&
        note.kind !== "promptCard" &&
        note.workspaceId === activeWorkspaceId,
    );

  useEffect(() => {
    if (!activeId) return;
    const activeEl = containerRef.current?.querySelector<HTMLElement>(`[data-tab-id="${activeId}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [activeId]);

  if (tabs.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="ns-no-print ns-note-tabs flex h-11 shrink-0 items-end gap-1.5 overflow-x-auto border-b border-hairline px-3.5 pb-[2px] pt-1.5"
      onWheel={(event) => {
        if (event.deltaY === 0 || event.shiftKey) return;
        event.currentTarget.scrollLeft += event.deltaY;
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        // Auto-scroll when dragging near container edges
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const leftEdgeDist = event.clientX - rect.left;
        const rightEdgeDist = rect.right - event.clientX;
        if (leftEdgeDist < 60 && leftEdgeDist > 0) {
          container.scrollLeft -= 10;
        } else if (rightEdgeDist < 60 && rightEdgeDist > 0) {
          container.scrollLeft += 10;
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (draggedTabId && dropTarget) {
          reorderTab(draggedTabId, dropTarget.id, dropTarget.edge === "left" ? "before" : "after");
        }
        setDraggedTabId(null);
        setDropTarget(null);
      }}
      role="tablist"
      aria-label="Open notes"
    >
      {tabs.map((note, index) => {
        const active = note.id === activeId && view === "editor";
        const isDragging = draggedTabId === note.id;
        const isTarget = dropTarget?.id === note.id && draggedTabId !== note.id;

        return (
          <ContextMenu key={note.id}>
            <ContextMenuTrigger asChild>
              <div
                data-tab-id={note.id}
                role="tab"
                aria-selected={active}
                tabIndex={0}
                title={noteLabel(note)}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", note.id);
                  event.dataTransfer.effectAllowed = "move";
                  setDraggedTabId(note.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = "move";
                  if (!draggedTabId || draggedTabId === note.id) {
                    if (dropTarget) setDropTarget(null);
                    return;
                  }
                  const rect = event.currentTarget.getBoundingClientRect();
                  const midX = rect.left + rect.width / 2;
                  const edge = event.clientX < midX ? "left" : "right";
                  if (dropTarget?.id !== note.id || dropTarget?.edge !== edge) {
                    setDropTarget({ id: note.id, edge });
                  }
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    if (dropTarget?.id === note.id) {
                      setDropTarget(null);
                    }
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (draggedTabId && draggedTabId !== note.id) {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const midX = rect.left + rect.width / 2;
                    const edge = event.clientX < midX ? "left" : "right";
                    reorderTab(draggedTabId, note.id, edge === "left" ? "before" : "after");
                  }
                  setDraggedTabId(null);
                  setDropTarget(null);
                }}
                onDragEnd={() => {
                  setDraggedTabId(null);
                  setDropTarget(null);
                }}
                onClick={() => {
                  setActive(note.id);
                }}
                onAuxClick={(event) => {
                  if (event.button === 1) {
                    event.preventDefault();
                    closeTab(note.id);
                  }
                }}
                onMouseDown={(event) => {
                  if (event.button === 1) event.preventDefault();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActive(note.id);
                  }
                }}
                className={cn(
                  "ns-note-tab group relative mb-[-1px] flex h-8 max-w-[13.5rem] min-w-[7.5rem] shrink-0 cursor-grab select-none items-center gap-1.5 rounded-t-md border border-b-0 px-2.5 text-left transition-colors active:cursor-grabbing",
                  active && "is-active",
                  isDragging && "is-dragging",
                )}
              >
                {/* Visual insertion indicator bar */}
                {isTarget ? (
                  <div
                    className={cn(
                      "ns-note-tab-indicator",
                      dropTarget.edge === "left" ? "is-left" : "is-right",
                    )}
                  />
                ) : null}

                {note.pinned ? (
                  <Pin className="size-3 shrink-0 text-accent rotate-45" />
                ) : note.kind === "prompt" ? (
                  <Sparkles className="size-3 shrink-0 text-slate" />
                ) : null}
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium pointer-events-none">
                  {noteLabel(note)}
                </span>
                <button
                  type="button"
                  draggable={false}
                  aria-label={`Close ${noteLabel(note)}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTab(note.id);
                  }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                  }}
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm text-muted transition-opacity hover:bg-black/15 hover:text-ink dark:hover:bg-white/10",
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                >
                  <X className="size-3 pointer-events-none" />
                </button>
              </div>
            </ContextMenuTrigger>

            <ContextMenuContent className="min-w-56">
              <ContextMenuItem
                onSelect={() => {
                  createNote({ workspaceId: note.workspaceId });
                }}
              >
                <Plus />
                <span>New tab</span>
                <ContextMenuShortcut>{mod} N</ContextMenuShortcut>
              </ContextMenuItem>

              <ContextMenuItem
                onSelect={() => {
                  const copyId = duplicateNote(note.id);
                  if (copyId) toast.success("Tab duplicated");
                }}
              >
                <Copy />
                <span>Duplicate tab</span>
              </ContextMenuItem>

              <ContextMenuItem
                onSelect={() => {
                  togglePin(note.id);
                  toast.success(note.pinned ? "Tab unpinned" : "Tab pinned to top");
                }}
              >
                {note.pinned ? <PinOff /> : <Pin />}
                <span>{note.pinned ? "Unpin tab" : "Pin tab"}</span>
              </ContextMenuItem>

              <ContextMenuSeparator />

              <ContextMenuItem
                disabled={index === 0}
                onSelect={() => {
                  const prevTab = tabs[index - 1];
                  if (prevTab) {
                    reorderTab(note.id, prevTab.id, "before");
                  }
                }}
              >
                <ArrowLeft />
                <span>Move tab left</span>
              </ContextMenuItem>

              <ContextMenuItem
                disabled={index >= tabs.length - 1}
                onSelect={() => {
                  const nextTab = tabs[index + 1];
                  if (nextTab) {
                    reorderTab(note.id, nextTab.id, "after");
                  }
                }}
              >
                <ArrowRight />
                <span>Move tab right</span>
              </ContextMenuItem>

              <ContextMenuSeparator />

              {allWorkspaces.length > 1 ? (
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <FolderInput />
                    <span>Change workspace</span>
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="min-w-48">
                    <ContextMenuLabel>Move to workspace</ContextMenuLabel>
                    {allWorkspaces.map((ws) => {
                      const theme = workspaceColorTheme(ws.color);
                      const isCurrent = ws.id === note.workspaceId;
                      return (
                        <ContextMenuItem
                          key={ws.id}
                          disabled={isCurrent}
                          onSelect={() => {
                            if (!isCurrent) {
                              const count = moveNotesToWorkspace([note.id], ws.id);
                              if (count > 0) toast.success(`Moved to ${ws.name}`);
                            }
                          }}
                        >
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: theme.swatch }}
                          />
                          <span className="flex-1 truncate">{ws.name}</span>
                          {isCurrent ? (
                            <span className="text-[11px] text-muted">(current)</span>
                          ) : null}
                        </ContextMenuItem>
                      );
                    })}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              ) : null}

              <ContextMenuSeparator />

              <ContextMenuItem onSelect={() => closeTab(note.id)}>
                <X />
                <span>Close tab</span>
              </ContextMenuItem>

              <ContextMenuItem
                disabled={tabs.length <= 1}
                onSelect={() => closeOtherTabs(note.id)}
              >
                <XCircle />
                <span>Close other tabs</span>
              </ContextMenuItem>

              <ContextMenuItem
                disabled={index >= tabs.length - 1}
                onSelect={() => closeTabsToRight(note.id)}
              >
                <ArrowRightToLine />
                <span>Close tabs to the right</span>
              </ContextMenuItem>

              <ContextMenuSeparator />

              <ContextMenuItem
                className="text-error data-[highlighted]:bg-error/10 [&_svg]:text-error"
                onSelect={() => void trashNote(note.id)}
              >
                <Trash2 />
                <span>Move to Trash</span>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}

      {/* Quick new tab button at the end of tabs list */}
      <button
        type="button"
        title="New tab"
        aria-label="New tab"
        onClick={() => createNote({ workspaceId: activeWorkspaceId })}
        className="mb-1 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted transition-colors hover:bg-stone hover:text-ink"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
