import { Cloud, CloudCheck, HardDriveDownload, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useNotes } from "@/store/notes";
import { useAuth, syncNow } from "@/store/auth";
import { cn, formatRelative } from "@/lib/utils";

export function SaveIndicator({ fileName }: { fileName?: string | null }) {
  const status = useNotes((state) => state.status);
  const lastSavedAt = useNotes((state) => state.lastSavedAt);
  const cloudUserId = useNotes((state) => state.cloudUserId);
  const syncing = useAuth((state) => state.syncing);

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
        Saving locally…
      </span>
    );
  }

  if (syncing) {
    return (
      <span className="ns-micro flex items-center gap-1.5 text-accent animate-pulse">
        <RefreshCw className="size-3.5 animate-spin" />
        Syncing…
      </span>
    );
  }

  const Icon = fileName ? HardDriveDownload : cloudUserId ? CloudCheck : Cloud;
  const label = fileName
    ? `Saved to ${fileName}`
    : cloudUserId
      ? "Synced · click to refresh"
      : "Saved on this device";

  return (
    <button
      type="button"
      onClick={() => {
        if (cloudUserId) void syncNow(true);
      }}
      title={cloudUserId ? "Click to sync now with cloud" : undefined}
      className={cn(
        "ns-micro flex items-center gap-1.5 text-muted transition-colors",
        cloudUserId && "cursor-pointer hover:text-ink",
      )}
    >
      <Icon className="size-3.5" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">Saved</span>
      {lastSavedAt ? (
        <span className="hidden text-muted/70 md:inline">· {formatRelative(lastSavedAt)}</span>
      ) : null}
    </button>
  );
}
