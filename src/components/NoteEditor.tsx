import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import { ResizableImage } from "@/lib/resizable-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
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
import { clipboardHasImageFile, sanitizePastedHtml } from "@/lib/paste-html";
import { useEditorStore } from "@/store/editor";
import { useFullscreen } from "@/store/fullscreen";
import { useNotes } from "@/store/notes";
import { requireVault, useVault } from "@/store/vault";
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
    if (edit) patchNote(edit.id, { html: edit.html });
  }, [patchNote]);

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

        if (!html.trim()) return false;

        event.preventDefault();
        const clean = sanitizePastedHtml(html, text);
        if (!clean.trim()) {
          toast("Nothing usable in that paste", {
            description: "Try Ctrl+Shift+V for plain text.",
          });
          return true;
        }

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
    if (loadedIdRef.current === note.id) return;
    commit();
    loadedIdRef.current = note.id;
    try {
      editor.commands.setContent(note.html || "<p></p>", false);
    } catch (error) {
      console.error("NoteSeen: setContent failed", error);
      editor.commands.setContent("<p></p>", false);
    }
    if (!note.title && !note.text && canEdit) {
      editor.commands.focus("end");
    }
  }, [editor, note.id, note.html, note.title, note.text, commit, canEdit]);

  useEffect(() => {
    const onHide = () => commit();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      commit();
    };
  }, [commit]);

  // Long titles wrap instead of scrolling out of view on narrow phones.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [note.title, note.id, note.typeface, note.size]);

  const words = countWords(note.text);

  return (
    <EditorErrorBoundary>
      <div className="ns-editor flex min-h-0 flex-1 flex-col">
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
          className="mt-7 flex-1 min-h-[50vh] cursor-text"
          onClick={() => {
            if (editor && !editor.isFocused && canEdit) {
              editor.commands.focus("end");
            }
          }}
        >
          <EditorContent editor={editor} className="min-h-full" />
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
