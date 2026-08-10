import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { htmlToMarkdown } from "@/lib/markdown";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Plain-text flavour. Notes go through Markdown so bullets, numbers and
 * checklists survive a paste into apps that only accept text.
 */
export function copyNoteContent(note: Note): string {
  if (note.kind === "prompt") {
    return note.text.trim() || note.title.trim();
  }
  const body = (note.html ? htmlToMarkdown(note.html) : note.text).trim() || note.text.trim();
  const title = note.title.trim();
  if (title && body) return `${title}\n\n${body}`;
  return title || body;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Rich flavour, so lists stay real lists in Docs, Word, Gmail, Notion. */
function copyNoteHtml(note: Note): string {
  const title = note.title.trim();
  const heading = title ? `<h1>${escapeHtml(title)}</h1>` : "";
  const body = note.html?.trim() || `<p>${escapeHtml(note.text)}</p>`;
  return `<meta charset="utf-8">${heading}${body}`;
}

export async function copyNoteToClipboard(note: Note): Promise<boolean> {
  const text = copyNoteContent(note);
  if (!text) {
    toast("Nothing to copy", { description: "This item is still empty." });
    return false;
  }

  const done = () => {
    toast.success(note.kind === "prompt" ? "Prompt copied" : "Note copied");
    return true;
  };

  // Prompts are plain text by design; notes carry both flavours.
  if (note.kind !== "prompt" && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([copyNoteHtml(note)], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return done();
    } catch (error) {
      console.warn("NoteSeen: rich copy failed, falling back to text", error);
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return done();
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
