import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

export function copyNoteContent(note: Note): string {
  if (note.kind === "prompt") {
    return note.text.trim() || note.title.trim();
  }
  const body = note.text.trim();
  if (note.title.trim() && body) return `${note.title.trim()}\n\n${body}`;
  return note.title.trim() || body;
}

export async function copyNoteToClipboard(note: Note): Promise<boolean> {
  const text = copyNoteContent(note);
  if (!text) {
    toast("Nothing to copy", { description: "This item is still empty." });
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success(note.kind === "prompt" ? "Prompt copied" : "Note copied");
    return true;
  } catch {
    toast.error("Could not copy");
    return false;
  }
}

export function CopyButton({
  note,
  size = "sm",
  className,
  label,
}: {
  note: Note;
  size?: "sm" | "icon-sm";
  className?: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);

  return (
    <Button
      type="button"
      variant={size === "icon-sm" ? "ghost" : "outline"}
      size={size}
      className={cn(size !== "icon-sm" && "gap-1.5", className)}
      aria-label={label ?? "Copy"}
      onClick={(event) => {
        event.stopPropagation();
        void copyNoteToClipboard(note).then((ok) => {
          if (!ok) return;
          setDone(true);
          window.setTimeout(() => setDone(false), 1400);
        });
      }}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {size !== "icon-sm" ? <span>{done ? "Copied" : label ?? "Copy"}</span> : null}
    </Button>
  );
}
