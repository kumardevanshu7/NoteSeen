import { Save, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotes } from "@/store/notes";

export function SharedView() {
  const activeId = useNotes((state) => state.activeId);
  const saveToFile = useNotes((state) => state.saveToFile);

  return (
    <div className="ns-scroll min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="ns-display text-ink">Shared Notes</h1>
        <p className="ns-body-lg mt-4 max-w-xl text-body-muted">
          Account-based sharing is not wired up yet — it arrives with the sync backend.
        </p>

        <div className="mt-10 rounded-lg border border-hairline bg-pale-green p-8">
          <Share2 className="size-5 text-deep-green" />
          <h2 className="ns-feature mt-4 text-ink">Sign in, then share a file</h2>
          <p className="ns-caption mt-2 max-w-xl text-body-muted">
            Google sign-in syncs your notes to Firestore across devices. Sharing with someone else
            still works by saving a{" "}
            <code className="font-mono text-[13px]">.noteseen</code> file and sending it to them.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-6"
            disabled={!activeId}
            onClick={() => activeId && void saveToFile(activeId, { forcePicker: true })}
          >
            <Save className="size-3.5" />
            Save the current note as a file
          </Button>
        </div>
      </div>
    </div>
  );
}
