import { Cloud, HardDriveDownload, Loader2, TriangleAlert } from "lucide-react";
import { useNotes } from "@/store/notes";
import { cn, formatRelative } from "@/lib/utils";

export function SaveIndicator({ fileName }: { fileName?: string | null }) {
  const status = useNotes((state) => state.status);
  const lastSavedAt = useNotes((state) => state.lastSavedAt);
  const cloudUserId = useNotes((state) => state.cloudUserId);

  if (status === "error") {
    return (
      <span className="ns-micro flex items-center gap-1.5 text-error">
        <TriangleAlert className="size-3.5" />
        Not saved
      </span>
    );
  }

  if (status === "saving") {
    return (
      <span className="ns-micro flex items-center gap-1.5 text-muted">
        <Loader2 className="size-3.5 animate-spin" />
        Saving
      </span>
    );
  }

  const Icon = fileName ? HardDriveDownload : Cloud;
  const label = fileName
    ? `Saved to ${fileName}`
    : cloudUserId
      ? "Saved · syncing to cloud"
      : "Saved on this device";

  return (
    <span className={cn("ns-micro flex items-center gap-1.5 text-muted")}>
      <Icon className="size-3.5" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">Saved</span>
      {lastSavedAt ? (
        <span className="hidden text-muted/70 md:inline">· {formatRelative(lastSavedAt)}</span>
      ) : null}
    </span>
  );
}
