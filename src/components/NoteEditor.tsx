import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/CopyButton";
import { EditorErrorBoundary } from "@/components/EditorErrorBoundary";
import { clipboardHasImageFile, sanitizePastedHtml } from "@/lib/paste-html";
import { useEditorStore } from "@/store/editor";
import { useNotes } from "@/store/notes";
import { requireVault } from "@/store/vault";
import type { Note } from "@/lib/types";
import { countWords, formatClock, readingMinutes } from "@/lib/utils";
import { SelectionMenu } from "./SelectionMenu";

const CONTENT_DEBOUNCE_MS = 320;
const MAX_NOTE_HTML = 500_000;

function parseLabels(raw: string): string[] {
  return raw
    .split(/[,#]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, all) => all.findIndex((t) => t.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, 24);
}

export function NoteEditor({ note }: { note: Note }) {
  const patchNote = useNotes((state) => state.patchNote);
  const setEditor = useEditorStore((state) => state.setEditor);
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const isNew = !note.title && !note.text;
  const canEdit = isNew || sessionUnlocked;

  useEffect(() => {
    setSessionUnlocked(false);
  }, [note.id]);

  const unlockForEdit = async () => {
    const ok = await requireVault("edit");
    if (ok) setSessionUnlocked(true);
  };

  const noteIdRef = useRef(note.id);
  const editorRef = useRef<Editor | null>(null);
  const loadedIdRef = useRef<string | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ id: string; html: string } | null>(null);
  const [labelsRaw, setLabelsRaw] = useState(note.tags.join(", "));

  noteIdRef.current = note.id;

  useEffect(() => {
    setLabelsRaw(note.tags.join(", "));
  }, [note.id, note.tags]);

  const commit = useCallback(() => {
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    const edit = pending.current;
    pending.current = null;
    if (edit) patchNote(edit.id, { html: edit.html });
  }, [patchNote]);

  const editor = useEditor({
    immediatelyRender: true,
    editable: canEdit,
    extensions: [
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
      Image.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder: "Start typing. It saves itself." }),
      CharacterCount,
    ],
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
        const hasImage = clipboardHasImageFile(clipboard);

        if (hasImage && !html.trim() && !text.trim()) {
          event.preventDefault();
          toast("Images are off for now", {
            description: "Copy text from ChatGPT — not a screenshot.",
          });
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
        if (!clipboardHasImageFile(event.dataTransfer)) return false;
        event.preventDefault();
        toast("Images are off for now");
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

  const words = countWords(note.text);
  const labels = parseLabels(labelsRaw);

  const commitLabels = () => {
    const next = parseLabels(labelsRaw);
    const same =
      next.length === note.tags.length &&
      next.every((tag, i) => tag.toLowerCase() === note.tags[i]?.toLowerCase());
    if (!same) patchNote(note.id, { tags: next });
  };

  return (
    <EditorErrorBoundary>
      <div className="ns-editor flex min-h-0 flex-1 flex-col">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <CopyButton note={note} label="Copy note" />
          {!canEdit ? (
            <Button variant="outline" size="sm" onClick={() => void unlockForEdit()}>
              <Lock className="size-3.5" />
              Unlock to edit
            </Button>
          ) : null}
        </div>

        <input
          className="ns-title ns-card-heading w-full bg-transparent outline-none disabled:opacity-70"
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

        <label className="mt-4 block space-y-1.5">
          <span className="ns-caption text-ink">Labels</span>
          <Input
            value={labelsRaw}
            onChange={(event) => setLabelsRaw(event.target.value)}
            onBlur={commitLabels}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitLabels();
              }
            }}
            placeholder="work, ideas, java — filter these on My Notes"
            disabled={!canEdit}
          />
          {labels.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {labels.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-hairline bg-stone px-2.5 py-0.5 text-[12px] text-ink"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </label>

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

        <div className="mt-7 flex-1">
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
