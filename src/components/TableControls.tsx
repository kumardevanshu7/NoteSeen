import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { Columns3, Plus, Rows3, Trash2, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TableControlsProps {
  editor: Editor;
}

interface TablePosition {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export function TableControls({ editor }: TableControlsProps) {
  const [tablePos, setTablePos] = useState<TablePosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateTablePosition = useCallback(() => {
    if (editor.isDestroyed || !editor.isEditable) {
      return setTablePos(null);
    }

    if (!editor.isActive("table")) {
      return setTablePos(null);
    }

    // Find the currently active table element in the editor DOM
    const { selection } = editor.state;
    const domAtPos = editor.view.domAtPos(selection.from);
    let node: Node | null = domAtPos.node;

    while (node && node !== editor.view.dom) {
      if (node.nodeName === "TABLE") break;
      node = node.parentNode;
    }

    if (!node || node.nodeName !== "TABLE") {
      // Fallback: find any table under editor if selection is near
      const tables = editor.view.dom.querySelectorAll("table");
      if (tables.length === 1) {
        node = tables[0];
      } else {
        return setTablePos(null);
      }
    }

    const tableEl = node as HTMLTableElement;
    const rect = tableEl.getBoundingClientRect();

    setTablePos({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right,
    });
  }, [editor]);

  useLayoutEffect(() => {
    updateTablePosition();

    const onUpdate = () => updateTablePosition();
    editor.on("selectionUpdate", onUpdate);
    editor.on("transaction", onUpdate);

    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);

    return () => {
      editor.off("selectionUpdate", onUpdate);
      editor.off("transaction", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
    };
  }, [editor, updateTablePosition]);

  if (!tablePos) return null;

  return createPortal(
    <div ref={containerRef} className="pointer-events-none fixed inset-0 z-40">
      {/* ── Top floating table action bar ─────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          top: Math.max(10, tablePos.top - 36),
          left: Math.max(10, tablePos.left),
        }}
        className="pointer-events-auto flex items-center gap-1 rounded-lg border border-hairline/80 bg-popover/95 px-1.5 py-1 text-popover-foreground shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      >
        <span className="ns-micro px-1.5 font-semibold uppercase tracking-wider text-muted">
          Table
        </span>
        <div className="h-3.5 w-px bg-hairline" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium text-slate transition-colors hover:bg-stone hover:text-ink"
            >
              <Plus className="size-3 text-accent" />
              <span>Row</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Add row below</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium text-slate transition-colors hover:bg-stone hover:text-ink"
            >
              <Plus className="size-3 text-accent" />
              <span>Column</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Add column to right</TooltipContent>
        </Tooltip>

        <div className="h-3.5 w-px bg-hairline" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-[11.5px] text-muted transition-colors hover:bg-error/10 hover:text-error"
            >
              <Rows3 className="size-3" />
              <X className="size-2.5 -ml-0.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Delete current row</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-[11.5px] text-muted transition-colors hover:bg-error/10 hover:text-error"
            >
              <Columns3 className="size-3" />
              <X className="size-2.5 -ml-0.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Delete current column</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-[11.5px] text-muted transition-colors hover:bg-error/10 hover:text-error"
            >
              <Trash2 className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Delete entire table</TooltipContent>
        </Tooltip>
      </div>

      {/* ── Right side "+ Add column" button ─────────────────────────────── */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            style={{
              position: "fixed",
              top: tablePos.top + tablePos.height / 2 - 14,
              left: tablePos.right + 6,
            }}
            aria-label="Add column to table"
            className="pointer-events-auto flex size-7 items-center justify-center rounded-md border border-hairline/80 bg-stone/90 text-slate shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:border-accent hover:bg-accent hover:text-white"
          >
            <Plus className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Add column</TooltipContent>
      </Tooltip>

      {/* ── Bottom side "+ Add row" button ───────────────────────────────── */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            style={{
              position: "fixed",
              top: tablePos.bottom + 6,
              left: tablePos.left + tablePos.width / 2 - 40,
            }}
            aria-label="Add row to table"
            className="pointer-events-auto flex items-center gap-1 rounded-md border border-hairline/80 bg-stone/90 px-3 py-1 text-[11px] font-medium text-slate shadow-md backdrop-blur-sm transition-all hover:border-accent hover:bg-accent hover:text-white"
          >
            <Plus className="size-3" />
            <span>Add row</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Add row</TooltipContent>
      </Tooltip>
    </div>,
    document.body,
  );
}
