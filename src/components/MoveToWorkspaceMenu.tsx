import { FolderInput } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotes } from "@/store/notes";
import { workspaceList } from "@/lib/selectors";
import { WORKSPACE_COLOR_OPTIONS, workspaceColorTheme } from "@/lib/workspace-colors";
import { cn } from "@/lib/utils";

interface MoveToWorkspaceMenuProps {
  noteId: string;
  currentWorkspaceId: string;
  trigger?: "icon" | "item";
  onMoved?: () => void;
}

export function MoveToWorkspaceMenu({
  noteId,
  currentWorkspaceId,
  trigger = "icon",
  onMoved,
}: MoveToWorkspaceMenuProps) {
  const workspaces = useNotes((state) => state.workspaces);
  const moveNotesToWorkspace = useNotes((state) => state.moveNotesToWorkspace);
  const list = workspaceList(workspaces).filter((ws) => ws.id !== currentWorkspaceId);

  if (list.length === 0) return null;

  const move = (workspaceId: string) => {
    const name = workspaces[workspaceId]?.name ?? "workspace";
    const count = moveNotesToWorkspace([noteId], workspaceId);
    if (count > 0) {
      toast.success(`Moved to ${name}`);
      onMoved?.();
    }
  };

  if (trigger === "item") {
    return (
      <>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Move to workspace</DropdownMenuLabel>
        {list.map((ws) => {
          const theme = workspaceColorTheme(ws.color);
          return (
            <DropdownMenuItem key={ws.id} onSelect={() => move(ws.id)}>
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: theme.swatch }}
              />
              {ws.name}
            </DropdownMenuItem>
          );
        })}
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Move to workspace"
          className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface/70 hover:text-ink"
          onClick={(event) => event.stopPropagation()}
        >
          <FolderInput className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>Move to workspace</DropdownMenuLabel>
        {list.map((ws) => {
          const theme = workspaceColorTheme(ws.color);
          return (
            <DropdownMenuItem key={ws.id} onSelect={() => move(ws.id)}>
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: theme.swatch }}
              />
              {ws.name}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorkspaceColorPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="ns-caption text-ink">Theme color</span>
      <div className="flex flex-wrap gap-2">
        {WORKSPACE_COLOR_OPTIONS.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              title={option.label}
              aria-label={option.label}
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className={cn(
                "size-8 rounded-full border-2 transition-transform hover:scale-105",
                active ? "border-ink ring-2 ring-ink/20" : "border-transparent",
              )}
              style={{ background: option.swatch }}
            />
          );
        })}
      </div>
    </div>
  );
}
