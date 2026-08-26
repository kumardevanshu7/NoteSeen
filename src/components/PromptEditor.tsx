import { useEffect, useRef, useState } from "react";
import { Lock, Maximize2, Minimize2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/CopyButton";
import { NoteLabelsField } from "@/components/NoteLabelsField";
import { plainTextToHtmlFriendly } from "@/lib/prompt-utils";
import type { Note } from "@/lib/types";
import { formatClock } from "@/lib/utils";
import { useFullscreen } from "@/store/fullscreen";
import { useNotes } from "@/store/notes";
import { requireVault, useVault } from "@/store/vault";

export function PromptEditor({ note }: { note: Note }) {
  const patchNote = useNotes((state) => state.patchNote);
  const isFullscreen = useFullscreen((state) => state.isFullscreen);
  const toggleFullscreen = useFullscreen((state) => state.toggleFullscreen);
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const editUnlockExpiresAt = useVault((state) => state.editUnlockExpiresAt);
  const isTimerUnlocked = editUnlockExpiresAt !== null && Date.now() < editUnlockExpiresAt;

  /** Empty at open means it is brand new, so the first write stays unlocked. */
  const openedEmpty = useRef({
    id: note.id,
    empty: !note.title.trim() && !note.text.trim(),
  });
  if (openedEmpty.current.id !== note.id) {
    openedEmpty.current = {
      id: note.id,
      empty: !note.title.trim() && !note.text.trim(),
    };
  }
  const canEdit = openedEmpty.current.empty || sessionUnlocked || isTimerUnlocked;

  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState(note.tags);
  const [body, setBody] = useState(note.text);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSessionUnlocked(false);
  }, [note.id]);

  useEffect(() => {
    setTitle(note.title);
    setTags(note.tags);
    setBody(note.text);
  }, [note.id, note.title, note.tags, note.text]);

  const unlockForEdit = async () => {
    const ok = await requireVault("edit");
    if (ok) setSessionUnlocked(true);
    return ok;
  };

  const save = async () => {
    if (!canEdit) {
      const ok = await unlockForEdit();
      if (!ok) return;
    }
    setSaving(true);
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
            note={{ ...note, title, text: body, tags }}
            label="Copy prompt"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Exit full screen" : "Full screen window"}
              >
                {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFullscreen ? "Exit full screen · Esc" : "Full screen window · F11"}
            </TooltipContent>
          </Tooltip>
          {canEdit ? (
            <Button variant="primary" size="sm" onClick={() => void save()} disabled={saving}>
              <Save className="size-3.5" />
              Save
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => void unlockForEdit()}>
              <Lock className="size-3.5" />
              Confirm to edit
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

      <NoteLabelsField
        tags={tags}
        disabled={!canEdit}
        onChange={setTags}
        placeholder="coding, rewrite, email"
      />

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
