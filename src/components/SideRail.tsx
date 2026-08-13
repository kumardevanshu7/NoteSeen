import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Images,
  KeyRound,
  Lightbulb,
  NotebookPen,
  Pin,
  Search,
  Sparkles,
  Tags,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";
import { Kbd } from "@/components/ui/kbd";
import { NewItemDialog } from "@/components/NewItemDialog";
import { ArigatoMark, LogoMark } from "@/components/Logo";
import { useNotes } from "@/store/notes";
import { collectLabels, editorNotes, liveNotes, noteLabel, searchNotes, trashedNotes } from "@/lib/selectors";
import type { NoteKind, View } from "@/lib/types";
import { cn, excerpt, formatRelative, modKeyLabel } from "@/lib/utils";
import { navigate } from "@/lib/nav";

const NAV: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "suggestions", label: "Suggestions", icon: Lightbulb },
  { id: "editor", label: "Notes Editor", icon: NotebookPen },
  { id: "all", label: "My Notes", icon: FileText },
  { id: "cards", label: "Prompt Cards", icon: Images },
  { id: "labels", label: "Labels", icon: Tags },
  { id: "secrets", label: "Secret Vault", icon: KeyRound },
  { id: "shared", label: "Shared Notes", icon: Users },
];

const LABELS_EXPANDED_KEY = "noteseen.sidebar-labels";

function readLabelsExpanded(): boolean {
  try {
    const raw = localStorage.getItem(LABELS_EXPANDED_KEY);
    if (raw === null) return false;
    return raw === "true";
  } catch {
    return false;
  }
}

export function SideRail({ onClose }: { onClose?: () => void }) {
  const dismiss = () => onClose?.();
  const notes = useNotes((state) => state.notes);
  const activeId = useNotes((state) => state.activeId);
  const view = useNotes((state) => state.view);
  const query = useNotes((state) => state.query);
  const setView = useNotes((state) => state.setView);
  const setQuery = useNotes((state) => state.setQuery);
  const setActive = useNotes((state) => state.setActive);
  const createItem = useNotes((state) => state.createItem);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [labelsExpanded, setLabelsExpanded] = useState(readLabelsExpanded);

  useEffect(() => {
    try {
      localStorage.setItem(LABELS_EXPANDED_KEY, String(labelsExpanded));
    } catch {
      // ignore
    }
  }, [labelsExpanded]);

  const live = useMemo(() => liveNotes(notes), [notes]);
  const recent = useMemo(() => editorNotes(notes), [notes]);
  const trashed = useMemo(() => trashedNotes(notes), [notes]);
  const visible = useMemo(
    () => searchNotes(query.trim() ? live : recent, query),
    [live, recent, query],
  );
  const allLabels = useMemo(() => collectLabels(notes), [notes]);

  return (
    <div className="flex h-full min-h-0 w-[268px] shrink-0 flex-col overflow-hidden border-r border-hairline bg-canvas">
      <nav className="shrink-0 px-4 pt-5">
        {onClose ? (
          <div className="mb-3 flex justify-end lg:hidden">
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close navigation">
              <X />
            </Button>
          </div>
        ) : null}

        <div className="mb-4 flex items-center gap-2 px-1">
          <LogoMark />
          <span className="font-display text-[15px] tracking-[-0.02em] text-ink">NoteSeen</span>
        </div>

        <ul className="space-y-0.5">
          {NAV.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setView(item.id);
                  dismiss();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xs px-2.5 py-2 text-left text-sm transition-colors",
                  view === item.id
                    ? "bg-stone font-medium text-ink"
                    : "text-body-muted hover:bg-stone/60 hover:text-ink",
                )}
              >
                <item.icon className="size-4 shrink-0 text-slate" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.id === "all" ? (
                  <span className="ns-mono text-muted">{live.length}</span>
                ) : null}
                {item.id === "labels" && allLabels.length > 0 ? (
                  <span className="ns-mono text-muted">{allLabels.length}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        {allLabels.length > 0 ? (
          <div className="mt-3 px-1">
            <button
              type="button"
              onClick={() => setLabelsExpanded((open) => !open)}
              aria-expanded={labelsExpanded}
              className="flex w-full items-center gap-1.5 rounded-xs px-1.5 py-1 text-left transition-colors hover:bg-stone/55"
            >
              {labelsExpanded ? (
                <ChevronDown className="size-3.5 shrink-0 text-muted" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0 text-muted" />
              )}
              <span className="ns-mono flex-1 text-muted">Your labels</span>
              <span className="ns-mono text-muted">{allLabels.length}</span>
            </button>
            {labelsExpanded ? (
              <div className="ns-scroll mt-1.5 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                {allLabels.slice(0, 12).map(({ label, count }) => (
                  <button
                    key={label.toLowerCase()}
                    type="button"
                    title={`${count} note${count === 1 ? "" : "s"}`}
                    onClick={() => {
                      setQuery(label);
                      setView("all");
                      dismiss();
                    }}
                    className="max-w-full truncate rounded-full border border-hairline bg-surface px-2.5 py-0.5 text-[11px] text-slate transition-colors hover:border-ink/20 hover:text-ink"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="my-3 h-px bg-hairline" />

        <button
          type="button"
          onClick={() => {
            setView("trash");
            dismiss();
          }}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xs px-2.5 py-2 text-left text-sm transition-colors",
            view === "trash"
              ? "bg-stone font-medium text-ink"
              : "text-body-muted hover:bg-stone/60 hover:text-ink",
          )}
        >
          <Trash2 className="size-4 shrink-0 text-slate" />
          <span className="flex-1">Trash</span>
          {trashed.length > 0 ? <span className="ns-mono text-muted">{trashed.length}</span> : null}
        </button>

        <button
          type="button"
          onClick={() => {
            navigate("/explore");
            dismiss();
          }}
          className="mt-0.5 flex w-full items-center gap-2.5 rounded-xs px-2.5 py-2 text-left text-sm text-body-muted transition-colors hover:bg-stone/60 hover:text-ink"
        >
          <ArigatoMark size={16} className="shrink-0" />
          <span className="flex-1 truncate">Explore Arigato Labs</span>
        </button>
      </nav>

      <div className="shrink-0 px-4 pt-3 pb-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
            className="h-9 w-full rounded-full border border-hairline bg-surface pr-3 pl-8.5 text-[13px] text-ink outline-none placeholder:text-muted focus-visible:border-focus"
          />
        </label>
      </div>

      <div className="ns-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <p className="ns-mono px-2.5 pb-2 text-muted">
          {query ? `${visible.length} result${visible.length === 1 ? "" : "s"}` : "Recent"}
        </p>

        {visible.length === 0 ? (
          <div className="px-2.5 py-6">
            <p className="text-[13px] text-body-muted">
              {query ? "Nothing matches that search." : "No notes yet."}
            </p>
            <Button
              variant="link"
              size="inline"
              className="mt-2 text-[13px]"
              onClick={() => setChooserOpen(true)}
            >
              Start something
            </Button>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {visible.map((note) => {
              const active = note.id === activeId && view === "editor";
              return (
                <li key={note.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (note.kind === "promptCard") setView("cards");
                      else setActive(note.id);
                      dismiss();
                    }}
                    className={cn(
                      "w-full rounded-sm px-2.5 py-2.5 pr-10 text-left transition-colors",
                      active ? "bg-stone" : "hover:bg-stone/55",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {note.kind === "promptCard" ? (
                        <Images className="size-3 shrink-0 text-slate" />
                      ) : note.kind === "prompt" ? (
                        <Sparkles className="size-3 shrink-0 text-slate" />
                      ) : note.pinned ? (
                        <Pin className="size-3 shrink-0 text-coral" />
                      ) : null}
                      <span className="flex-1 truncate text-[13.5px] font-medium text-ink">
                        {noteLabel(note)}
                      </span>
                    </span>
                    {note.tags.length > 0 ? (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="max-w-[7rem] truncate rounded-full border border-hairline bg-surface/80 px-1.5 py-px text-[10px] text-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="mt-0.5 flex items-baseline gap-2">
                        <span className="ns-micro flex-1 truncate text-muted">
                          {excerpt(note.text) ||
                            (note.kind === "prompt" ? "Empty prompt" : "Empty note")}
                        </span>
                        <span className="ns-micro shrink-0 text-muted">
                          {formatRelative(note.updatedAt)}
                        </span>
                      </span>
                    )}
                  </button>
                  <div className="absolute top-2 right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <CopyButton note={note} size="icon-sm" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="ns-micro shrink-0 border-t border-hairline px-4 py-3 text-muted">
        <span className="flex items-center gap-1.5">
          <Kbd>{modKeyLabel()}</Kbd>
          <Kbd>K</Kbd>
          <span>to jump anywhere</span>
        </span>
        <span className="mt-2 flex items-center gap-1.5">
          <ArigatoMark size={14} />
          Arigato Labs
        </span>
      </div>

      <NewItemDialog
        open={chooserOpen}
        onOpenChange={setChooserOpen}
        onChoose={(kind: NoteKind) => {
          createItem(kind);
          dismiss();
        }}
      />
    </div>
  );
}
