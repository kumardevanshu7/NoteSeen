import { useMemo, useState } from "react";
import { Check, ChevronDown, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { WorkspaceColorPicker } from "@/components/MoveToWorkspaceMenu";
import { useNotes } from "@/store/notes";
import { noteCountInWorkspace, workspaceList } from "@/lib/selectors";
import type { WorkspaceColor } from "@/lib/types";
import { DEFAULT_WORKSPACE_ID } from "@/lib/types";
import { workspaceColorTheme } from "@/lib/workspace-colors";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({ className }: { className?: string }) {
  const notes = useNotes((state) => state.notes);
  const workspaces = useNotes((state) => state.workspaces);
  const activeWorkspaceId = useNotes((state) => state.activeWorkspaceId);
  const setActiveWorkspace = useNotes((state) => state.setActiveWorkspace);
  const createWorkspace = useNotes((state) => state.createWorkspace);
  const renameWorkspace = useNotes((state) => state.renameWorkspace);
  const deleteWorkspace = useNotes((state) => state.deleteWorkspace);

  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState<WorkspaceColor>("azure");
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const list = useMemo(() => workspaceList(workspaces), [workspaces]);
  const active = workspaces[activeWorkspaceId] ?? list[0];
  const activeTheme = active ? workspaceColorTheme(active.color) : workspaceColorTheme("azure");

  const openRename = (id: string, name: string, wsColor: WorkspaceColor) => {
    setRenamingId(id);
    setDraft(name);
    setColor(wsColor);
    setRenameOpen(true);
  };

  const submitCreate = () => {
    const name = draft.trim();
    if (!name) {
      toast.error("Give the workspace a name");
      return;
    }
    createWorkspace(name, color);
    setCreateOpen(false);
    setDraft("");
    setColor("azure");
    toast.success(`Workspace “${name}” created`);
  };

  const submitRename = () => {
    if (!renamingId) return;
    const name = draft.trim();
    if (!name) {
      toast.error("Name cannot be empty");
      return;
    }
    renameWorkspace(renamingId, name, color);
    setRenameOpen(false);
    setRenamingId(null);
    setDraft("");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-sm border px-2.5 py-2 text-left transition-colors hover:bg-stone/60",
              className,
            )}
            style={{
              borderColor: activeTheme.line,
              background: `color-mix(in oklab, ${activeTheme.wash} 35%, var(--surface))`,
            }}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: activeTheme.swatch }}
            />
            <FolderKanban className="size-4 shrink-0 text-slate" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
              {active?.name ?? "Workspace"}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[15rem]">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {list.map((ws) => {
            const count = noteCountInWorkspace(notes, ws.id);
            const selected = ws.id === activeWorkspaceId;
            const theme = workspaceColorTheme(ws.color);
            return (
              <DropdownMenuItem
                key={ws.id}
                onSelect={() => setActiveWorkspace(ws.id)}
                className="justify-between gap-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {selected ? (
                    <Check className="size-3.5 shrink-0" />
                  ) : (
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: theme.swatch }}
                    />
                  )}
                  <span className="truncate">{ws.name}</span>
                </span>
                <span className="ns-mono shrink-0 text-muted">{count}</span>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setDraft("");
              setColor("azure");
              setCreateOpen(true);
            }}
          >
            <Plus />
            New workspace
          </DropdownMenuItem>
          {active && active.id !== DEFAULT_WORKSPACE_ID ? (
            <>
              <DropdownMenuItem onSelect={() => openRename(active.id, active.name, active.color)}>
                <Pencil />
                Edit workspace
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-error focus:text-error"
                onSelect={() => void deleteWorkspace(active.id)}
              >
                <Trash2 />
                Delete workspace
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>
              Fresh notes, prompt cards, and a separate secret vault.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="e.g. Arigato Site, Client X, Personal"
              maxLength={80}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") submitCreate();
              }}
            />
            <WorkspaceColorPicker value={color} onChange={(next) => setColor(next as WorkspaceColor)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={submitCreate}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={80}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") submitRename();
              }}
            />
            <WorkspaceColorPicker value={color} onChange={(next) => setColor(next as WorkspaceColor)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={submitRename}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
