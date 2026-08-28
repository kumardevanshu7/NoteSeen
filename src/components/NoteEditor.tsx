import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import { ResizableImage } from "@/lib/resizable-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Lock, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/CopyButton";
import { EditorErrorBoundary } from "@/components/EditorErrorBoundary";
import { NoteLabelsField } from "@/components/NoteLabelsField";
import { imageFilesFromData, insertPastedImages } from "@/lib/note-images";
import {
  clipboardHasImageFile,
  hasMarkdownTable,
  isMarkdownContent,
  parseMarkdownToHtml,
  sanitizePastedHtml,
} from "@/lib/paste-html";
import { useEditorStore } from "@/store/editor";
import { useFullscreen } from "@/store/fullscreen";
import { useNotes } from "@/store/notes";
import { requireVault, useVault } from "@/store/vault";
import { syncAdapter } from "@/lib/sync/adapter";
import type { Note } from "@/lib/types";
import { countWords, formatClock, readingMinutes } from "@/lib/utils";
import { SelectionMenu } from "./SelectionMenu";

const CONTENT_DEBOUNCE_MS = 320;
const MAX_NOTE_HTML = 15_000_000;

function isEmptyNote(note: Note): boolean {
  return !note.title.trim() && !note.text.trim();
}

export function NoteEditor({ note }: { note: Note }) {
  const patchNote = useNotes((state) => state.patchNote);
  const setEditor = useEditorStore((state) => state.setEditor);
  const isFullscreen = useFullscreen((state) => state.isFullscreen);
  const toggleFullscreen = useFullscreen((state) => state.toggleFullscreen);
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const editUnlockExpiresAt = useVault((state) => state.editUnlockExpiresAt);
  const isTimerUnlocked = editUnlockExpiresAt !== null && Date.now() < editUnlockExpiresAt;

  /**
   * Whether the note was empty when it was opened. Deriving this from the
   * current text would re-lock the note mid-sentence, the moment the first
   * word made it non-empty; the vault should only guard a revisit.
   */
  const openedEmpty = useRef({ id: note.id, empty: isEmptyNote(note) });
  if (openedEmpty.current.id !== note.id) {
    openedEmpty.current = { id: note.id, empty: isEmptyNote(note) };
  }
  const canEdit = openedEmpty.current.empty || sessionUnlocked || isTimerUnlocked;

  useEffect(() => {
    setSessionUnlocked(false);
  }, [note.id]);

  const unlockForEdit = async () => {
    const ok = await requireVault("edit");
    if (ok) setSessionUnlocked(true);
  };

  const noteIdRef = useRef(note.id);
  const canEditRef = useRef(canEdit);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const loadedIdRef = useRef<string | null>(null);
  const lastHtmlRef = useRef(note.html);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ id: string; html: string } | null>(null);
  noteIdRef.current = note.id;
  canEditRef.current = canEdit;

  const commit = useCallback(() => {
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    const edit = pending.current;
    pending.current = null;
    if (edit) {
      lastHtmlRef.current = edit.html;
      patchNote(edit.id, { html: edit.html });
    } else if (editorRef.current && noteIdRef.current) {
      const currentHtml = editorRef.current.getHTML();
      if (currentHtml && currentHtml !== note.html) {
        lastHtmlRef.current = currentHtml;
        patchNote(noteIdRef.current, { html: currentHtml });
      }
    }
  }, [patchNote, note.html]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        dropcursor: { color: "var(--focus-blue)", width: 2 },
      }),
      Underline,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      ResizableImage,
      Table.configure({ resizable: false, handleWidth: 3, cellMinWidth: 60 }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "Start typing. It saves itself." }),
      CharacterCount,
    ],
    [],
  );

  const editor = useEditor({
    // ProseMirror owns this subtree. Rendering it during React's first pass made
    // React and PM disagree on ownership, which surfaced as removeChild crashes.
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editable: canEdit,
    extensions,
    content: note.html || "<p></p>",
    onCreate({ editor: instance }) {
      editorRef.current = instance;
    },
    onDestroy() {
      editorRef.current = null;
    },
    editorProps: {
      attributes: {
        class: "tiptap",
        spellcheck: "true",
        "aria-label": "Note body",
      },
      transformPastedHTML(html) {
        return sanitizePastedHtml(html);
      },
      handlePaste(_view, event) {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;

        const html = clipboard.getData("text/html");
        const text = clipboard.getData("text/plain");
        const images = imageFilesFromData(clipboard);

        if (images.length > 0) {
          event.preventDefault();
          const ed = editorRef.current;
          if (!ed || !canEditRef.current) {
            toast("Unlock the note to add images");
            return true;
          }
          void insertPastedImages(ed, images, noteIdRef.current);
          return true;
        }

        if (clipboardHasImageFile(clipboard) && !html.trim() && !text.trim()) {
          event.preventDefault();
          toast("Could not read that image");
          return true;
        }

        const hasTable = hasMarkdownTable(text);
        const hasHtmlTable = /<table\b/i.test(html);
        const hasRichHtmlStructure = /<(?:table|h[1-6]|ul|ol|blockquote|hr)\b/i.test(html);
        const isMarkdown = isMarkdownContent(text);

        let clean = "";

        // If text has a markdown table but HTML doesn't have a real <table>,
        // or if text has markdown structures (headings, lists, hr) and HTML lacks rich tags,
        // parse the markdown into proper TipTap HTML so tables and headings render formatted!
        if (hasTable && !hasHtmlTable) {
          clean = parseMarkdownToHtml(text);
        } else if (isMarkdown && !hasRichHtmlStructure) {
          clean = parseMarkdownToHtml(text);
        } else if (html.trim()) {
          clean = sanitizePastedHtml(html, text);
        } else if (isMarkdown) {
          clean = parseMarkdownToHtml(text);
        }

        if (!clean.trim()) return false;

        event.preventDefault();
        const ed = editorRef.current;
        if (!ed) return true;

        try {
          ed.chain().focus().insertContent(clean).run();
        } catch (error) {
          console.error("NoteSeen: rich paste failed", error);
          try {
            if (text) ed.chain().focus().insertContent(`<p>${escapeBasic(text)}</p>`).run();
            else toast.error("Could not paste that content");
          } catch {
            toast.error("Could not paste that content");
          }
        }
        return true;
      },
      handleDrop(_view, event) {
        const images = imageFilesFromData(event.dataTransfer);
        if (images.length === 0) return false;
        event.preventDefault();
        const ed = editorRef.current;
        if (!ed || !canEditRef.current) {
          toast("Unlock the note to add images");
          return true;
        }
        void insertPastedImages(ed, images, noteIdRef.current);
        return true;
      },
    },
    onUpdate({ editor: instance }) {
      const html = instance.getHTML();
      if (html.length > MAX_NOTE_HTML) {
        toast.error("Content too large", { description: "Paste in smaller chunks." });
        return;
      }
      lastHtmlRef.current = html;
      pending.current = { id: noteIdRef.current, html };
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(commit, CONTENT_DEBOUNCE_MS);
    },
    onBlur() {
      commit();
    },
  });

  useEffect(() => {
    editorRef.current = editor ?? null;
    setEditor(editor ?? null);
    return () => setEditor(null);
  }, [editor, setEditor]);

  useEffect(() => {
    editor?.setEditable(canEdit);
  }, [editor, canEdit]);

  useEffect(() => {
    if (!editor) return;

    // Case 1: Switched to a different note tab
    if (loadedIdRef.current !== note.id) {
      commit();
      loadedIdRef.current = note.id;
      lastHtmlRef.current = note.html;
      try {
        editor.commands.setContent(note.html || "<p></p>", false);
      } catch (error) {
        console.error("NoteSeen: setContent failed", error);
        editor.commands.setContent("<p></p>", false);
      }
      if (!note.title && !note.text && canEdit) {
        editor.commands.focus("end");
      }
      return;
    }

    // Case 2: Same note, but remote sync updated note.html from cloud!
    if (note.html !== lastHtmlRef.current) {
      const currentEditorHtml = editor.getHTML();
      // If remote HTML differs from editor's current DOM
      if (note.html !== currentEditorHtml) {
        // If user on THIS device is not currently typing in the editor, update immediately!
        if (!editor.isFocused) {
          lastHtmlRef.current = note.html;
          try {
            editor.commands.setContent(note.html || "<p></p>", false);
          } catch (error) {
            console.error("NoteSeen: remote sync setContent failed", error);
          }
        }
      }
    }
  }, [editor, note.id, note.html, note.title, note.text, commit, canEdit]);

  useEffect(() => {
    const onHide = () => {
      commit();
      void useNotes.getState().flush({ toDisk: true });
      void syncAdapter().flushCloud?.();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, [commit]);

  // Auto-resize title textarea and guarantee it never collapses to 0 height
  const adjustTitleHeight = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.max(el.scrollHeight, 40);
    el.style.height = `${nextHeight}px`;
  }, []);

  useEffect(() => {
    adjustTitleHeight();
  }, [note.title, note.id, note.typeface, note.size, isFullscreen, adjustTitleHeight]);

  useEffect(() => {
    const handleResize = () => adjustTitleHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustTitleHeight]);

  const words = countWords(note.text);

  return (
    <EditorErrorBoundary>
      <div className="ns-editor">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <CopyButton note={note} label="Copy note" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? "Exit full screen" : "Full screen window"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="size-3.5" />
                  ) : (
                    <Maximize2 className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullscreen ? "Exit full screen · Esc" : "Full screen window · F11"}
              </TooltipContent>
            </Tooltip>
          </div>
          {!canEdit ? (
            <Button variant="outline" size="sm" onClick={() => void unlockForEdit()}>
              <Lock className="size-3.5" />
              Confirm to edit
            </Button>
          ) : null}
        </div>

        <textarea
          ref={titleRef}
          rows={1}
          className="ns-title ns-card-heading w-full resize-none overflow-hidden bg-transparent break-words outline-none disabled:opacity-70"
          value={note.title}
          placeholder="Untitled note"
          aria-label="Note title"
          spellCheck
          disabled={!canEdit}
          onChange={(event) => patchNote(note.id, { title: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "ArrowDown") {
              event.preventDefault();
              editor?.commands.focus("start");
            }
          }}
        />

        <div className="mt-4">
          <NoteLabelsField
            tags={note.tags}
            disabled={!canEdit}
            onChange={(tags) => patchNote(note.id, { tags })}
          />
        </div>

        <div className="ns-mono mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
          <span>{formatClock(note.updatedAt)}</span>
          <span aria-hidden>·</span>
          <span>
            {words} {words === 1 ? "word" : "words"}
          </span>
          {words > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{readingMinutes(words)} min read</span>
            </>
          ) : null}
          {note.fileName ? (
            <>
              <span aria-hidden>·</span>
              <span className="text-accent-ink normal-case tracking-normal">{note.fileName}</span>
            </>
          ) : null}
        </div>

        <div
          className="mt-7 min-h-[50vh] cursor-text"
          onClick={() => {
            if (editor && !editor.isFocused && canEdit) {
              editor.commands.focus("end");
            }
          }}
        >
          <EditorContent editor={editor} />
        </div>

        {editor && canEdit ? <SelectionMenu editor={editor} /> : null}
      </div>
    </EditorErrorBoundary>
  );
}

function escapeBasic(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "<br>");
}
