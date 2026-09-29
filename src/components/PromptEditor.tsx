import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Lock, Maximize2, Minimize2, Save } from "lucide-react";
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

const AUTOSAVE_DELAY_MS = 400;

export function PromptEditor({ note }: { note: Note }) {
  const patchNote = useNotes((state) => state.patchNote);
  const isFullscreen = useFullscreen((state) => state.isFullscreen);
  const toggleFullscreen = useFullscreen((state) => state.toggleFullscreen);
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const editUnlockExpiresAt = useVault((state) => state.editUnlockExpiresAt);
  const isTimerUnlocked = editUnlockExpiresAt !== null && Date.now() < editUnlockExpiresAt;

  const isInitialEmpty = useRef(!note.title.trim() && !note.text.trim());
  const canEdit = isInitialEmpty.current || sessionUnlocked || isTimerUnlocked;
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;

  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState(note.tags);
  const [body, setBody] = useState(note.text);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  const noteIdRef = useRef(note.id);
  noteIdRef.current = note.id;

  const titleRef = useRef(title);
  titleRef.current = title;
  const tagsRef = useRef(tags);
  tagsRef.current = tags;
  const bodyRef = useRef(body);
  bodyRef.current = body;

  const isDirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Commit current in-memory edits to the store
  const commit = useCallback(() => {
    if (!isDirtyRef.current || !canEditRef.current) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const currentText = bodyRef.current;
    patchNote(noteIdRef.current, {
      title: titleRef.current.trim(),
      tags: tagsRef.current,
      text: currentText,
      html: plainTextToHtmlFriendly(currentText),
    });
    isDirtyRef.current = false;
    setSaveStatus("saved");
  }, [patchNote]);

  const scheduleAutosave = useCallback(() => {
    if (!canEditRef.current) return;
    isDirtyRef.current = true;
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(commit, AUTOSAVE_DELAY_MS);
  }, [commit]);

  // When active note changes, flush pending and reload state
  useEffect(() => {
    setSessionUnlocked(false);
    isInitialEmpty.current = !note.title.trim() && !note.text.trim();
    setTitle(note.title);
    setTags(note.tags);
    setBody(note.text);
    isDirtyRef.current = false;
    setSaveStatus("saved");
  }, [note.id]);

  // If remote sync updates note and user has no unsaved local changes, sync safely
  useEffect(() => {
    if (!isDirtyRef.current) {
      setTitle(note.title);
      setTags(note.tags);
      setBody(note.text);
    }
  }, [note.title, note.tags, note.text]);

  // Save on blur, unmount or page hide
  useEffect(() => {
    const onFlush = () => commit();
    window.addEventListener("beforeunload", onFlush);
    window.addEventListener("pagehide", onFlush);
    return () => {
      commit();
      window.removeEventListener("beforeunload", onFlush);
      window.removeEventListener("pagehide", onFlush);
    };
  }, [commit]);

  const unlockForEdit = async () => {
    const ok = await requireVault("edit");
    if (ok) setSessionUnlocked(true);
    return ok;
  };

  const handleManualSave = async () => {
    if (!canEdit) {
      const ok = await unlockForEdit();
      if (!ok) return;
    }
    commit();
    toast.success("Prompt saved");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="ns-mono text-muted">Prompt</p>
            {canEdit && (
              <span className="ns-micro text-muted">
                {saveStatus === "saving" ? "Saving…" : "Auto-saved"}
              </span>
            )}
          </div>
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
            <Button variant="primary" size="sm" onClick={() => void handleManualSave()}>
              {saveStatus === "saving" ? (
                <Save className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              {saveStatus === "saving" ? "Saving" : "Saved"}
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
          onChange={(event) => {
            setTitle(event.target.value);
            scheduleAutosave();
          }}
          onBlur={commit}
          placeholder="Prompt title"
          readOnly={!canEdit}
          maxLength={500}
        />
      </label>

      <NoteLabelsField
        tags={tags}
        disabled={!canEdit}
        onChange={(newTags) => {
          setTags(newTags);
          tagsRef.current = newTags;
          scheduleAutosave();
        }}
        placeholder="coding, rewrite, email"
      />

      <label className="flex min-h-0 flex-1 flex-col space-y-1.5">
        <span className="ns-caption flex items-center justify-between gap-2 text-ink">
          <span>Prompt</span>
          <span className="ns-mono font-normal text-muted">.txt</span>
        </span>
        <textarea
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            scheduleAutosave();
          }}
          onBlur={commit}
          placeholder="Plain text prompt you can copy and reuse…"
          readOnly={!canEdit}
          className="ns-scroll min-h-[40vh] w-full flex-1 resize-y rounded-sm border border-hairline bg-surface px-3 py-3 font-mono text-sm leading-relaxed text-ink outline-none placeholder:text-muted focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/20 disabled:opacity-60"
        />
      </label>
    </div>
  );
}
