import { useCallback, useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
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
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";
import { useEditorStore } from "@/store/editor";
import { useNotes } from "@/store/notes";
import { requireVault, useVault } from "@/store/vault";
import type { Note } from "@/lib/types";
import { countWords, formatClock, readingMinutes } from "@/lib/utils";
import { SelectionMenu } from "./SelectionMenu";

const CONTENT_DEBOUNCE_MS = 320;

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function NoteEditor({ note }: { note: Note }) {
  const patchNote = useNotes((state) => state.patchNote);
  const setEditor = useEditorStore((state) => state.setEditor);
  const unlocked = useVault((state) => {
    const until = state.unlockedUntil;
    return typeof until === "number" && until > Date.now();
  });
  const isNew = !note.title && !note.text;
  const canEdit = unlocked || isNew;

  const noteIdRef = useRef(note.id);
  const loadedIdRef = useRef<string | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ id: string; html: string } | null>(null);

  noteIdRef.current = note.id;

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
      Image.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder: "Start typing. It saves itself." }),
      CharacterCount,
    ],
    content: note.html,
    editorProps: {
      attributes: {
        class: "tiptap",
        spellcheck: "true",
        "aria-label": "Note body",
      },
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
          file.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        void Promise.all(files.map(readImageAsDataUrl)).then((sources) => {
          const { schema } = view.state;
          const nodes = sources
            .map((src) => schema.nodes.image?.create({ src }))
            .filter((node) => node !== undefined);
          if (nodes.length === 0) return;
          view.dispatch(view.state.tr.replaceSelectionWith(nodes[0]!));
        });
        return true;
      },
    },
    onUpdate({ editor: instance }) {
      pending.current = { id: noteIdRef.current, html: instance.getHTML() };
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(commit, CONTENT_DEBOUNCE_MS);
    },
    onBlur() {
      commit();
    },
  });

  useEffect(() => {
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
    editor.commands.setContent(note.html, false);
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

  return (
    <div className="ns-editor flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <CopyButton note={note} label="Copy note" />
        {!canEdit ? (
          <Button variant="outline" size="sm" onClick={() => void requireVault("edit")}>
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
  );
}
