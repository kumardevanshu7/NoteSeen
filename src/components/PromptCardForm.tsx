import { useEffect, useRef, useState } from "react";
import { ImagePlus, Save, X } from "lucide-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteLabelsField } from "@/components/NoteLabelsField";
import { uploadPublicImage } from "@/lib/note-images";
import { plainTextToHtmlFriendly } from "@/lib/prompt-utils";
import { isImageStorageConfigured } from "@/lib/supabase";
import type { Note } from "@/lib/types";
import { useNotes } from "@/store/notes";
import { requireVault } from "@/store/vault";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/gif,image/webp";

interface PromptCardFormProps {
  note?: Note;
  onCancel: () => void;
  onSaved: () => void;
}

export function PromptCardForm({ note, onCancel, onSaved }: PromptCardFormProps) {
  const createNote = useNotes((state) => state.createNote);
  const patchNote = useNotes((state) => state.patchNote);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(note?.coverUrl ?? null);
  const [title, setTitle] = useState(note?.title ?? "");
  const [detail, setDetail] = useState(note?.subtitle ?? "");
  const [body, setBody] = useState(note?.text ?? "");
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const pickFile = (next: File | undefined) => {
    if (!next || !next.type.startsWith("image/")) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const save = async () => {
    if (!isImageStorageConfigured()) {
      toast.error("Image hosting is not configured.");
      return;
    }
    if (!file && !preview) {
      toast.error("Add an image first.");
      return;
    }
    if (!title.trim()) {
      toast.error("Add a card title.");
      return;
    }
    if (!body.trim()) {
      toast.error("Add the prompt.");
      return;
    }

    setSaving(true);
    try {
      const text = body.trim();
      const html = plainTextToHtmlFriendly(text);
      const nextTitle = title.trim();
      const subtitle = detail.trim().slice(0, 160);

      if (note) {
        const ok = await requireVault("edit");
        if (!ok) return;
        const coverUrl = file ? await uploadPublicImage(file, note.id) : note.coverUrl;
        patchNote(note.id, { title: nextTitle, subtitle, tags, text, html, coverUrl });
        toast.success("Prompt card saved");
      } else {
        if (!file) {
          toast.error("Add an image first.");
          return;
        }
        const id = nanoid(12);
        const coverUrl = await uploadPublicImage(file, id);
        createNote({
          id,
          kind: "promptCard",
          title: nextTitle,
          subtitle,
          tags,
          text,
          html,
          coverUrl,
        });
        toast.success("Prompt card saved");
      }
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          pickFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          pickFile(event.dataTransfer.files[0]);
        }}
        className={cn(
          "relative flex min-h-40 w-full items-center justify-center overflow-hidden rounded-sm border border-dashed border-hairline bg-stone/40 text-left transition-colors",
          dragOver ? "border-ink/40 bg-stone" : "hover:bg-stone/70",
        )}
      >
        {preview ? (
          <img
            src={preview}
            alt=""
            className="max-h-64 w-full object-contain"
          />
        ) : (
          <span className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <ImagePlus className="size-6 text-slate" />
            <span className="text-[14px] font-medium text-ink">Drop or pick an image</span>
            <span className="ns-caption text-muted">Any ratio · JPG, PNG, GIF, WebP · 5 MB</span>
          </span>
        )}
      </button>
      {preview ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="ns-caption self-start text-slate underline-offset-2 hover:text-ink hover:underline"
        >
          Replace image
        </button>
      ) : null}

      <label className="block space-y-1.5">
        <span className="ns-caption text-ink">Card title</span>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value.slice(0, 80))}
          placeholder="Name this card"
          maxLength={80}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="ns-caption text-ink">Short detail</span>
        <Input
          value={detail}
          onChange={(event) => setDetail(event.target.value.slice(0, 160))}
          placeholder="What this prompt does"
          maxLength={160}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="ns-caption text-ink">Prompt</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="The full prompt you want to copy later…"
          rows={6}
          className="ns-scroll w-full resize-y rounded-sm border border-hairline bg-surface px-3 py-3 font-mono text-sm leading-relaxed text-ink outline-none placeholder:text-muted focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/20"
        />
      </label>

      <NoteLabelsField
        tags={tags}
        onChange={setTags}
        placeholder="Type a label, Enter to add"
      />

      <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="size-3.5" />
          Cancel
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={() => void save()} disabled={saving}>
          <Save className="size-3.5" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
