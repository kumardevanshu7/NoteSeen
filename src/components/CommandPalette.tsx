import { useMemo, useState } from "react";
import {
  FileDown,
  FileText,
  FolderOpen,
  Images,
  KeyRound,
  Lightbulb,
  Lock,
  Moon,
  Plus,
  Save,
  Sun,
  Timer,
  Trash2,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { useAppearance } from "@/hooks/use-appearance";
import { useNotes } from "@/store/notes";
import { useVault } from "@/store/vault";
import { downloadMarkdown } from "@/lib/note-file";
import { liveNotes, noteLabel, notesForWorkspace } from "@/lib/selectors";
import { excerpt, formatRelative, modKeyLabel } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFiles: () => void;
  onCreate?: () => void;
  onOpenUnlockTimer?: () => void;
}

export function CommandPalette({ open, onOpenChange, onOpenFiles, onCreate, onOpenUnlockTimer }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const notes = useNotes((state) => state.notes);
  const activeWorkspaceId = useNotes((state) => state.activeWorkspaceId);
  const activeId = useNotes((state) => state.activeId);
  const setActive = useNotes((state) => state.setActive);
  const setView = useNotes((state) => state.setView);
  const saveToFile = useNotes((state) => state.saveToFile);
  const editUnlockExpiresAt = useVault((state) => state.editUnlockExpiresAt);
  const lockEditNow = useVault((state) => state.lockEditNow);
  const isTimerActive = editUnlockExpiresAt !== null && Date.now() < editUnlockExpiresAt;
  const { toggle, isDark } = useAppearance();

  const list = useMemo(
    () =>
      liveNotes(notesForWorkspace(notes, activeWorkspaceId))
        .filter((note) => note.kind !== "promptCard")
        .slice(0, 60),
    [notes, activeWorkspaceId],
  );
  const activeNote = activeId ? notes[activeId] : null;
  const mod = modKeyLabel();

  const run = (action: () => void) => {
    onOpenChange(false);
    setSearch("");
    action();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false} className="max-w-xl p-0">
        <DialogTitle className="sr-only">Search notes and commands</DialogTitle>
        <Command loop shouldFilter>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search notes or run a command…"
          />
          <CommandList>
            <CommandEmpty>Nothing found.</CommandEmpty>

            <CommandGroup heading="Notes">
              {list.map((note) => (
                <CommandItem
                  key={note.id}
                  value={`${noteLabel(note)} ${note.text.slice(0, 400)}`}
                  onSelect={() => run(() => setActive(note.id))}
                >
                  <FileText />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ink">{noteLabel(note)}</span>
                    <span className="ns-micro block truncate text-muted">
                      {excerpt(note.text, 70) || "Empty note"}
                    </span>
                  </span>
                  <span className="ns-mono shrink-0 text-muted">
                    {formatRelative(note.updatedAt)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Actions">
              <CommandItem
                value="new note create prompt"
                onSelect={() => run(() => onCreate?.())}
              >
                <Plus />
                <span className="flex-1">New note, prompt, or card</span>
                <span className="flex items-center gap-1">
                  <Kbd>{mod}</Kbd>
                  <Kbd>N</Kbd>
                </span>
              </CommandItem>
              <CommandItem value="open file disk noteseen" onSelect={() => run(onOpenFiles)}>
                <FolderOpen />
                <span className="flex-1">Open a file from disk</span>
                <span className="flex items-center gap-1">
                  <Kbd>{mod}</Kbd>
                  <Kbd>O</Kbd>
                </span>
              </CommandItem>
              <CommandItem
                value="save file noteseen export"
                disabled={!activeId}
                onSelect={() => run(() => activeId && void saveToFile(activeId))}
              >
                <Save />
                <span className="flex-1">Save this note as a .noteseen file</span>
                <span className="flex items-center gap-1">
                  <Kbd>{mod}</Kbd>
                  <Kbd>S</Kbd>
                </span>
              </CommandItem>
              <CommandItem
                value="export markdown"
                disabled={!activeNote}
                onSelect={() => run(() => activeNote && downloadMarkdown(activeNote))}
              >
                <FileDown />
                Export as Markdown
              </CommandItem>
              <CommandItem value="appearance theme dark light" onSelect={() => run(toggle)}>
                {isDark ? <Sun /> : <Moon />}
                {isDark ? "Switch to light" : "Switch to dark"}
              </CommandItem>
              {onOpenUnlockTimer ? (
                <CommandItem
                  value="unlock timer edit long time duration lock notes"
                  onSelect={() => run(onOpenUnlockTimer)}
                >
                  <Timer />
                  <span className="flex-1">
                    {isTimerActive ? "Manage edit unlock timer" : "Long-time unlock timer…"}
                  </span>
                </CommandItem>
              ) : null}
              {isTimerActive ? (
                <CommandItem
                  value="lock notes now end timer security"
                  onSelect={() => run(() => lockEditNow())}
                >
                  <Lock />
                  <span className="flex-1">Lock notes now</span>
                </CommandItem>
              ) : null}
            </CommandGroup>

            <CommandGroup heading="Go to">
              <CommandItem value="suggestions quiet inactive" onSelect={() => run(() => setView("suggestions"))}>
                <Lightbulb />
                Suggestions
              </CommandItem>
              <CommandItem value="my notes all" onSelect={() => run(() => setView("all"))}>
                <FileText />
                My Notes
              </CommandItem>
              <CommandItem value="prompt cards gallery pinterest" onSelect={() => run(() => setView("cards"))}>
                <Images />
                Prompt Cards
              </CommandItem>
              <CommandItem
                value="secret vault pin api password"
                onSelect={() => run(() => setView("secrets"))}
              >
                <KeyRound />
                Secret Vault
              </CommandItem>
              <CommandItem value="shared notes" onSelect={() => run(() => setView("shared"))}>
                <Users />
                Shared Notes
              </CommandItem>
              <CommandItem value="trash deleted" onSelect={() => run(() => setView("trash"))}>
                <Trash2 />
                Trash
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
