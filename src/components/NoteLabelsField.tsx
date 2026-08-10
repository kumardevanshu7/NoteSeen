import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { collectLabels, normalizeLabelName } from "@/lib/selectors";
import { useNotes } from "@/store/notes";
import { cn } from "@/lib/utils";

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

/** Current note tags + every label you already use — tap to add/remove. */
export function NoteLabelsField({
  tags,
  disabled,
  onChange,
  placeholder = "Type a label, Enter to add",
}: NoteLabelsFieldProps) {
  const notes = useNotes((state) => state.notes);
  const [draft, setDraft] = useState("");

  const selected = useMemo(() => uniqueLabels(tags), [tags]);
  const selectedKeys = useMemo(
    () => new Set(selected.map((tag) => tag.toLowerCase())),
    [selected],
  );

  const catalog = useMemo(() => collectLabels(notes), [notes]);

  const suggestions = useMemo(() => {
    const needle = draft.trim().toLowerCase();
    return catalog
      .filter(({ label }) => !selectedKeys.has(label.toLowerCase()))
      .filter(({ label }) => !needle || label.toLowerCase().includes(needle))
      .slice(0, 16);
  }, [catalog, selectedKeys, draft]);

  const commitDraft = () => {
    const next = normalizeLabelName(draft);
    if (!next) return;
    if (!selectedKeys.has(next.toLowerCase())) {
      onChange([...selected, next]);
    }
    setDraft("");
  };

  const toggle = (label: string) => {
    if (disabled) return;
    const key = label.toLowerCase();
    if (selectedKeys.has(key)) {
      onChange(selected.filter((tag) => tag.toLowerCase() !== key));
    } else {
      onChange([...selected, normalizeLabelName(label)]);
    }
  };

  return (
    <div className="space-y-2">
      <span className="ns-caption text-ink">Labels</span>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <button
              key={tag.toLowerCase()}
              type="button"
              disabled={disabled}
              onClick={() => toggle(tag)}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-ink/20 bg-stone px-2.5 py-0.5 text-[12px] text-ink transition-colors hover:border-ink/40 disabled:opacity-50"
              title="Remove label"
            >
              <span className="truncate">{tag}</span>
              <X className="size-3 shrink-0 opacity-60" />
            </button>
          ))}
        </div>
      ) : null}

      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commitDraft();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
      />

      {suggestions.length > 0 || catalog.length > 0 ? (
        <div className="space-y-1.5">
          <p className="ns-mono text-muted">
            {draft.trim() ? "Matching labels" : "Your labels — tap to add"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.length > 0 ? (
              suggestions.map(({ label, count }) => (
                <button
                  key={label.toLowerCase()}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(label)}
                  className={cn(
                    "max-w-full truncate rounded-full border border-hairline bg-surface px-2.5 py-0.5 text-[12px] text-slate transition-colors",
                    "hover:border-ink/25 hover:text-ink disabled:opacity-50",
                  )}
                  title={`${count} note${count === 1 ? "" : "s"}`}
                >
                  {label}
                </button>
              ))
            ) : draft.trim() ? (
              <p className="text-[12px] text-muted">No match — press Enter to create “{draft.trim()}”</p>
            ) : (
              <p className="text-[12px] text-muted">All your labels are already on this note.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-muted">
          Add a label above — it will show on My Notes and in the sidebar.
        </p>
      )}
    </div>
  );
}
