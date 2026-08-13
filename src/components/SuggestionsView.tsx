import { useMemo } from "react";
import { FileText, Lightbulb, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";
import { useNotes } from "@/store/notes";
import { NOTE_THEMES } from "@/lib/note-themes";
import {
  inactiveNotes,
  noteLabel,
  quietDays,
  searchNotes,
  suggestionTheme,
} from "@/lib/selectors";
import { excerpt } from "@/lib/utils";

export function SuggestionsView() {
  const notes = useNotes((state) => state.notes);
  const query = useNotes((state) => state.query);
  const setActive = useNotes((state) => state.setActive);
  const setView = useNotes((state) => state.setView);

  const quiet = useMemo(() => inactiveNotes(notes), [notes]);
  const visible = useMemo(() => searchNotes(quiet, query), [quiet, query]);

  return (
    <div className="ns-scroll min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="ns-mono text-muted">Home</p>
            <h1 className="ns-display mt-1 text-ink">Suggestions</h1>
            <p className="ns-caption mt-2 max-w-lg text-body-muted">
              Notes and prompts sitting untouched for a week or more. Each one gets a different
              color so the quiet ones stand out.
            </p>
          </div>
          <span className="ns-mono text-muted">
            {visible.length} quiet {visible.length === 1 ? "item" : "items"}
          </span>
        </div>

        {visible.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <Lightbulb className="size-8 text-muted" />
            <p className="mt-4 text-[15px] font-medium text-ink">
              {query ? "Nothing matches." : "Nothing’s gone quiet yet."}
            </p>
            <p className="ns-caption mt-1 max-w-sm text-body-muted">
              {query
                ? "Try a different search."
                : "After seven days without opening or editing, a note shows up here."}
            </p>
            {!query ? (
              <Button variant="outline" size="sm" className="mt-6" onClick={() => setView("all")}>
                Go to My Notes
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((note) => {
              const themeId = suggestionTheme(note);
              const theme = NOTE_THEMES.find((option) => option.id === themeId) ?? NOTE_THEMES[1];
              const days = quietDays(note);
              return (
                <li key={note.id}>
                  <div
                    className="group flex h-56 flex-col overflow-hidden rounded-sm border p-4 transition-transform hover:-translate-y-0.5"
                    style={{ background: theme.wash, borderColor: theme.line }}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="ns-mono flex items-center gap-1.5 text-muted">
                        {note.kind === "prompt" ? (
                          <Sparkles className="size-3" />
                        ) : (
                          <FileText className="size-3" />
                        )}
                        {note.kind}
                      </span>
                      <span
                        className="rounded-full px-2 py-px text-[11px] font-medium"
                        style={{ color: theme.ink, background: "color-mix(in oklab, var(--surface) 55%, transparent)" }}
                      >
                        {days}d quiet
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActive(note.id)}
                      className="min-h-0 flex-1 overflow-hidden text-left"
                    >
                      <span className="line-clamp-2 block text-[15px] font-medium text-ink">
                        {noteLabel(note)}
                      </span>
                      <span className="ns-caption mt-2 line-clamp-3 block text-body-muted">
                        {excerpt(note.text, 140) ||
                          (note.kind === "prompt" ? "Empty prompt" : "Empty note")}
                      </span>
                    </button>

                    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                      <CopyButton note={note} size="icon-sm" />
                      <Button variant="outline" size="sm" onClick={() => setActive(note.id)}>
                        Open
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
