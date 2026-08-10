import { useEffect, useState } from "react";
import { Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/CopyButton";
import { plainTextToHtmlFriendly } from "@/lib/prompt-utils";
import type { Note } from "@/lib/types";
import { formatClock } from "@/lib/utils";
import { useNotes } from "@/store/notes";
import { requireVault, useVault } from "@/store/vault";

function parseTags(raw: string): string[] {
  return raw
    .split(/[,#]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, all) => all.findIndex((t) => t.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, 24);
}

export function PromptEditor({ note }: { note: Note }) {
  const patchNote = useNotes((state) => state.patchNote);
  const unlocked = useVault((state) => {
    const until = state.unlockedUntil;
    return typeof until === "number" && until > Date.now();
  });
  const isNew = !note.title && !note.text;
  const canEdit = unlocked || isNew;

  const [title, setTitle] = useState(note.title);
  const [tagsRaw, setTagsRaw] = useState(note.tags.join(", "));
  const [body, setBody] = useState(note.text);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(note.title);
    setTagsRaw(note.tags.join(", "));
    setBody(note.text);
  }, [note.id, note.title, note.tags, note.text]);

  const save = async () => {
    if (!canEdit) {
      const ok = await requireVault("edit");
      if (!ok) return;
    }
    setSaving(true);
    const tags = parseTags(tagsRaw);
    const text = body;
    patchNote(note.id, { title: title.trim(), tags, text, html: plainTextToHtmlFriendly(text) });
    setSaving(false);
    toast.success("Prompt saved");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ns-mono text-muted">Prompt</p>
          <p className="ns-caption mt-1 text-muted">{formatClock(note.updatedAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton
            note={{ ...note, title, text: body, tags: parseTags(tagsRaw) }}
            label="Copy prompt"
          />
          {canEdit ? (
            <Button variant="primary" size="sm" onClick={() => void save()} disabled={saving}>
              <Save className="size-3.5" />
              Save
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => void requireVault("edit")}>
              <Lock className="size-3.5" />
              Unlock to edit
            </Button>
          )}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="ns-caption text-ink">Title</span>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Prompt title"
          disabled={!canEdit}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="ns-caption text-ink">Labels</span>
        <Input
          value={tagsRaw}
          onChange={(event) => setTagsRaw(event.target.value)}
          placeholder="coding, rewrite, email — comma separated"
          disabled={!canEdit}
        />
        {parseTags(tagsRaw).length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {parseTags(tagsRaw).map((tag) => (
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

      <label className="flex min-h-0 flex-1 flex-col space-y-1.5">
        <span className="ns-caption flex items-center justify-between gap-2 text-ink">
          <span>Prompt</span>
          <span className="ns-mono font-normal text-muted">.txt</span>
        </span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Plain text prompt you can copy and reuse…"
          disabled={!canEdit}
          className="ns-scroll min-h-[40vh] w-full flex-1 resize-y rounded-sm border border-hairline bg-surface px-3 py-3 font-mono text-sm leading-relaxed text-ink outline-none placeholder:text-muted focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/20 disabled:opacity-60"
        />
      </label>
    </div>
  );
}
