import { useMemo, useRef, useState } from "react";
import { Plus, Tag, X } from "lucide-react";
import { collectLabels, normalizeLabelName, notesForWorkspace } from "@/lib/selectors";
import { useNotes } from "@/store/notes";

function uniqueLabels(tags: string[]): string[] {
  return tags
    .map((tag) => normalizeLabelName(tag))
    .filter(Boolean)
    .filter((tag, index, all) => all.findIndex((t) => t.toLowerCase() === tag.toLowerCase()) === index)
    .slice(0, 24);
}

interface NoteLabelsFieldProps {
  tags: string[];
  disabled?: boolean;
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function NoteLabelsField({
  tags,
  disabled,
  onChange,
  placeholder = "Add label...",
}: NoteLabelsFieldProps) {
  const notes = useNotes((state) => state.notes);
  const activeWorkspaceId = useNotes((state) => state.activeWorkspaceId);
  const [draft, setDraft] = useState("");
  const [isInputOpen, setIsInputOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => uniqueLabels(tags), [tags]);
  const selectedKeys = useMemo(
    () => new Set(selected.map((tag) => tag.toLowerCase())),
    [selected],
  );

  const catalog = useMemo(
    () => collectLabels(notesForWorkspace(notes, activeWorkspaceId)),
    [notes, activeWorkspaceId],
  );

  const suggestions = useMemo(() => {
    const needle = draft.trim().toLowerCase();
    return catalog
      .filter(({ label }) => !selectedKeys.has(label.toLowerCase()))
      .filter(({ label }) => !needle || label.toLowerCase().includes(needle))
      .slice(0, 10);
  }, [catalog, selectedKeys, draft]);

  const commitDraft = () => {
    const next = normalizeLabelName(draft);
    if (next && !selectedKeys.has(next.toLowerCase())) {
      onChange([...selected, next]);
    }
    setDraft("");
  };

  const removeTag = (tag: string) => {
    if (disabled) return;
    const key = tag.toLowerCase();
    onChange(selected.filter((t) => t.toLowerCase() !== key));
  };

  const addTag = (tag: string) => {
    if (disabled) return;
    const next = normalizeLabelName(tag);
    if (next && !selectedKeys.has(next.toLowerCase())) {
      onChange([...selected, next]);
    }
    setDraft("");
  };

  return (
    <div className="relative flex flex-wrap items-center gap-1.5 py-1">
      <div className="flex items-center gap-1 text-muted/70 mr-1">
        <Tag className="size-3.5" />
      </div>

      {/* Selected Tag Chips */}
      {selected.map((tag) => (
        <span
          key={tag.toLowerCase()}
          className="group inline-flex items-center gap-1 rounded-full border border-hairline/80 bg-stone/70 px-2.5 py-0.5 text-[12px] font-medium text-ink transition-colors hover:border-hairline hover:bg-stone"
        >
          <span>{tag}</span>
          {!disabled ? (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="flex size-3.5 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/10 hover:text-ink"
              aria-label={`Remove ${tag} label`}
            >
              <X className="size-2.5" />
            </button>
          ) : null}
        </span>
      ))}

      {/* Inline Add Button or Input */}
      {!disabled ? (
        <div className="relative inline-flex items-center">
          {isInputOpen ? (
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                  commitDraft();
                  setTimeout(() => setIsInputOpen(false), 150);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    commitDraft();
                  } else if (e.key === "Escape") {
                    setDraft("");
                    setIsInputOpen(false);
                  }
                }}
                placeholder={placeholder}
                className="h-6 w-28 rounded-full border border-accent/40 bg-surface px-2.5 text-[12px] text-ink placeholder:text-muted/60 focus:w-36 focus:border-accent focus:outline-none transition-all"
                spellCheck={false}
              />

              {/* Suggestions dropdown */}
              {isInputOpen && (suggestions.length > 0 || (draft.trim() && !catalog.some(c => c.label.toLowerCase() === draft.trim().toLowerCase()))) ? (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  className="ns-scroll absolute top-7 left-0 z-50 min-w-44 max-h-48 overflow-y-auto rounded-xl border border-hairline bg-popover/95 p-1 text-popover-foreground shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                >
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {draft.trim() ? "Suggested" : "Existing labels"}
                  </p>
                  {suggestions.map(({ label, count }) => (
                    <button
                      key={label.toLowerCase()}
                      type="button"
                      onClick={() => {
                        addTag(label);
                        setIsInputOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1 text-left text-[12px] text-slate transition-colors hover:bg-stone hover:text-ink"
                    >
                      <span className="truncate">{label}</span>
                      <span className="ns-micro text-muted/70">{count}</span>
                    </button>
                  ))}
                  {draft.trim() && !catalog.some(c => c.label.toLowerCase() === draft.trim().toLowerCase()) ? (
                    <button
                      type="button"
                      onClick={() => {
                        commitDraft();
                        setIsInputOpen(false);
                      }}
                      className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-left text-[12px] text-accent transition-colors hover:bg-accent/10"
                    >
                      <Plus className="size-3" />
                      <span className="truncate">Create &quot;{draft.trim()}&quot;</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsInputOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-hairline/80 px-2.5 py-0.5 text-[11.5px] text-muted transition-colors hover:border-ink/30 hover:bg-stone/50 hover:text-ink"
            >
              <Plus className="size-3" />
              <span>{selected.length === 0 ? "Add label" : "Add"}</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
