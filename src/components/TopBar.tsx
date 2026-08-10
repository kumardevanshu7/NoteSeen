import { useState } from "react";
import {
  Copy,
  Download,
  EllipsisVertical,
  FileCode2,
  FileDown,
  FileType2,
  FolderOpen,
  Link2Off,
  Menu,
  MonitorSmartphone,
  Moon,
  PanelRightOpen,
  Pin,
  PinOff,
  Plus,
  Printer,
  Redo2,
  Save,
  Search,
  Sun,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NewItemDialog } from "@/components/NewItemDialog";
import { useAppearance } from "@/hooks/use-appearance";
import { useEditorTick } from "@/hooks/use-editor-tick";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useEditorStore } from "@/store/editor";
import { useNotes } from "@/store/notes";
import { downloadHtml, exportPdf } from "@/lib/export-note";
import { copyMarkdown, downloadMarkdown } from "@/lib/note-file";
import { noteLabel } from "@/lib/selectors";
import type { Note } from "@/lib/types";
import { modKeyLabel } from "@/lib/utils";
import { Wordmark } from "./Logo";
import { AuthButton } from "./AuthButton";
import { copyNoteToClipboard } from "./CopyButton";

interface TopBarProps {
  note: Note | null;
  onOpenNav: () => void;
  onOpenPalette: () => void;
  onOpenFiles: () => void;
}

export function TopBar({ note, onOpenNav, onOpenPalette, onOpenFiles }: TopBarProps) {
  const editor = useEditorStore((state) => state.editor);
  useEditorTick(editor);
  const createItem = useNotes((state) => state.createItem);
  const saveToFile = useNotes((state) => state.saveToFile);
  const unlinkFile = useNotes((state) => state.unlinkFile);
  const togglePin = useNotes((state) => state.togglePin);
  const trashNote = useNotes((state) => state.trashNote);
  const setView = useNotes((state) => state.setView);
  const { appearance, setAppearance, toggle, isDark } = useAppearance();
  const { canInstall, installed, install } = useInstallPrompt();
  const [chooserOpen, setChooserOpen] = useState(false);

  const mod = modKeyLabel();

  return (
    <header className="ns-no-print flex h-15 shrink-0 items-center gap-3 border-b border-hairline bg-canvas px-3 sm:px-5">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      <Wordmark className="hidden lg:flex" />

      <div className="ns-caption flex min-w-0 flex-1 items-center gap-1.5 lg:pl-6">
        <button
          type="button"
          onClick={() => setView("all")}
          className="hidden shrink-0 text-muted transition-colors hover:text-ink sm:block"
        >
          My Notes
        </button>
        <span className="hidden text-hairline sm:block" aria-hidden>
          /
        </span>
        <span className="truncate text-ink">{note ? noteLabel(note) : "No note open"}</span>
      </div>

      <div className="flex items-center gap-1 rounded-full border border-hairline p-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Undo"
              disabled={!editor?.can().undo()}
              onClick={() => editor?.chain().focus().undo().run()}
            >
              <Undo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo · {mod} Z</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Redo"
              disabled={!editor?.can().redo()}
              onClick={() => editor?.chain().focus().redo().run()}
            >
              <Redo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo · {mod} Shift Z</TooltipContent>
        </Tooltip>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Search notes" onClick={onOpenPalette}>
            <Search />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Find a note · {mod} K</TooltipContent>
      </Tooltip>

      <Button variant="primary" size="sm" className="gap-1.5 pl-3" onClick={() => setChooserOpen(true)}>
        <Plus className="size-3.5" />
        <span className="hidden sm:inline">New</span>
      </Button>

      <AuthButton />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="More actions">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-64">
          <DropdownMenuLabel>This {note?.kind === "prompt" ? "prompt" : "note"}</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={!note}
            onSelect={() => note && void copyNoteToClipboard(note)}
          >
            <Copy />
            Copy
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!note} onSelect={() => note && void saveToFile(note.id)}>
            <Save />
            Save as .noteseen file
            <DropdownMenuShortcut>{mod} S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!note}
            onSelect={() => note && void saveToFile(note.id, { forcePicker: true })}
          >
            <Download />
            Save a copy to…
          </DropdownMenuItem>
          {note?.fileName ? (
            <DropdownMenuItem onSelect={() => void unlinkFile(note.id)}>
              <Link2Off />
              Stop writing to {note.fileName}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            disabled={!note}
            onSelect={() => {
              if (!note) return;
              downloadHtml(note);
              toast.success("HTML downloaded");
            }}
          >
            <FileCode2 />
            Download HTML +
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!note}
            onSelect={() => {
              if (!note) return;
              const ok = exportPdf(note);
              if (ok) toast.message("Print dialog open — choose Save as PDF");
              else toast.error("Allow pop-ups to export PDF");
            }}
          >
            <FileType2 />
            Download PDF +
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!note} onSelect={() => note && downloadMarkdown(note)}>
            <FileDown />
            Export as Markdown
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!note}
            onSelect={() => {
              if (!note) return;
              void copyMarkdown(note).then(() => toast.success("Markdown copied"));
            }}
          >
            <Copy />
            Copy as Markdown
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!note} onSelect={() => note && togglePin(note.id)}>
            {note?.pinned ? <PinOff /> : <Pin />}
            {note?.pinned ? "Unpin" : "Pin to top"}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!note} onSelect={() => window.print()}>
            <Printer />
            Print
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!note}
            className="text-error data-[highlighted]:bg-error/10 [&_svg]:text-error"
            onSelect={() => note && void trashNote(note.id)}
          >
            <Trash2 />
            Move to Trash
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>App</DropdownMenuLabel>
          <DropdownMenuItem onSelect={onOpenFiles}>
            <FolderOpen />
            Open a file from disk
            <DropdownMenuShortcut>{mod} O</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggle}>
            {isDark ? <Sun /> : <Moon />}
            {isDark ? "Light appearance" : "Dark appearance"}
          </DropdownMenuItem>
          {appearance !== "system" ? (
            <DropdownMenuItem onSelect={() => setAppearance("system")}>
              <MonitorSmartphone />
              Match system
            </DropdownMenuItem>
          ) : null}
          {canInstall && !installed ? (
            <DropdownMenuItem onSelect={() => void install()}>
              <PanelRightOpen />
              Install NoteSeen
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <NewItemDialog
        open={chooserOpen}
        onOpenChange={setChooserOpen}
        onChoose={(kind) => createItem(kind)}
      />
    </header>
  );
}
