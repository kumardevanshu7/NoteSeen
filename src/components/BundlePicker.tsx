import { useMemo, useState } from "react";
import { Check, Folder, FolderPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotes } from "@/store/notes";
import { collectBundles, normalizeBundleName, notesForWorkspace } from "@/lib/selectors";
import { cn } from "@/lib/utils";

interface BundlePickerProps {
  currentBundle?: string | null;
  onSelect: (bundle: string | null) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function BundlePicker({
  currentBundle,
  onSelect,
  disabled = false,
  size = "md",
  className,
}: BundlePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const notes = useNotes((state) => state.notes);
  const bundles = useNotes((state) => state.bundles);
  const activeWorkspaceId = useNotes((state) => state.activeWorkspaceId);
  const createBundle = useNotes((state) => state.createBundle);

  const scopedNotes = useMemo(
    () => notesForWorkspace(notes, activeWorkspaceId),
    [notes, activeWorkspaceId],
  );

  const allBundles = useMemo(
    () => collectBundles(scopedNotes, bundles, activeWorkspaceId),
    [scopedNotes, bundles, activeWorkspaceId],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allBundles;
    return allBundles.filter((b) => b.name.toLowerCase().includes(needle));
  }, [allBundles, query]);

  const cleanQuery = normalizeBundleName(query);
  const exactMatch = allBundles.some(
    (b) => b.name.toLowerCase() === cleanQuery.toLowerCase(),
  );

  const handleChoose = (name: string | null) => {
    onSelect(name);
    setOpen(false);
    setQuery("");
    if (name) {
      toast.success(`Assigned to bundle "${name}"`);
    } else {
      toast.info("Removed from bundle");
    }
  };

  const handleCreateNew = () => {
    if (!cleanQuery) return;
    const created = createBundle(cleanQuery);
    handleChoose(created.name);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {currentBundle ? (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 font-medium text-primary transition-colors hover:bg-primary/20 cursor-pointer shadow-2xs",
              size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
              className,
            )}
          >
            <Folder className={size === "sm" ? "size-3" : "size-3.5"} />
            <span className="max-w-[140px] truncate">{currentBundle}</span>
            {!disabled && (
              <button
                type="button"
                aria-label="Remove from bundle"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChoose(null);
                }}
                className="flex size-3.5 items-center justify-center rounded-full hover:bg-primary/20 text-primary/70 hover:text-primary transition-colors"
              >
                <X className="size-2.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-dashed border-hairline/80 bg-stone/40 text-slate transition-colors hover:border-hairline hover:bg-stone/80 hover:text-ink cursor-pointer",
              size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
              className,
            )}
          >
            <Folder className={size === "sm" ? "size-3 text-muted" : "size-3.5 text-muted"} />
            <span>+ Bundle</span>
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-1.5 shadow-md">
        <div className="mb-1 px-1 pt-0.5">
          <input
            type="text"
            placeholder="Search or new bundle..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && cleanQuery && !exactMatch) {
                e.preventDefault();
                handleCreateNew();
              }
            }}
            className="w-full rounded-md border border-hairline bg-surface px-2.5 py-1 text-xs text-ink outline-none placeholder:text-muted focus:border-primary"
            autoFocus
          />
        </div>

        <div className="max-h-48 overflow-y-auto space-y-0.5 py-1">
          {currentBundle ? (
            <button
              type="button"
              onClick={() => handleChoose(null)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-error hover:bg-error/10 transition-colors"
            >
              <X className="size-3.5" />
              <span>Remove from bundle</span>
            </button>
          ) : null}

          {filtered.map((b) => {
            const isSelected = currentBundle?.toLowerCase() === b.name.toLowerCase();
            return (
              <button
                key={b.name}
                type="button"
                onClick={() => handleChoose(b.name)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                  isSelected
                    ? "bg-primary/15 font-semibold text-primary"
                    : "text-ink hover:bg-stone/80",
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <Folder className="size-3.5 shrink-0 text-slate" />
                  <span className="truncate">{b.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="ns-mono text-[10px] text-muted">{b.count}</span>
                  {isSelected ? <Check className="size-3 text-primary" /> : null}
                </div>
              </button>
            );
          })}

          {cleanQuery && !exactMatch ? (
            <button
              type="button"
              onClick={handleCreateNew}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <FolderPlus className="size-3.5" />
              <span className="truncate">Create &ldquo;{cleanQuery}&rdquo;</span>
            </button>
          ) : null}

          {filtered.length === 0 && !cleanQuery ? (
            <p className="px-2 py-3 text-center text-[11px] text-body-muted">
              No bundles yet. Type a subject name to create one!
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
