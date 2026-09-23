import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Columns3,
  Heading,
  Plus,
  Rows3,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableBadgeDialog } from "./TableBadgeDialog";
import {
  clearColumnBadges,
  fillColumnWithBadge,
  getActiveColumnInfo,
  setCellBadge,
  type ActiveColumnInfo,
} from "@/lib/table-badge";

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

interface ContextMenuPosition {
  x: number;
  y: number;
}

export function TableControls({ editor }: TableControlsProps) {
  const [tablePos, setTablePos] = useState<TablePosition | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [activeCol, setActiveCol] = useState<ActiveColumnInfo>({
    colIndex: 0,
    headerName: "Column",
    hasBadges: false,
    choices: [],
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const updateTablePosition = useCallback(() => {
    if (editor.isDestroyed || !editor.isEditable) {
      return setTablePos(null);
    }

    if (!editor.isActive("table")) {
      return setTablePos(null);
    }

    // Refresh active column metadata
    const colInfo = getActiveColumnInfo(editor);
    setActiveCol(colInfo);

    // Find the currently active table element in the editor DOM
    const { selection } = editor.state;
    const domAtPos = editor.view.domAtPos(selection.from);
    let node: Node | null = domAtPos.node;

    while (node && node !== editor.view.dom) {
      if (node.nodeName === "TABLE") break;
      node = node.parentNode;
    }

    if (!node || node.nodeName !== "TABLE") {
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

    // Right-click context menu listener for table elements
    const handleContextMenu = (e: MouseEvent) => {
      let el = e.target as HTMLElement | null;
      let insideTable = false;
      while (el && el !== editor.view.dom) {
        if (el.nodeName === "TABLE" || el.nodeName === "TD" || el.nodeName === "TH") {
          insideTable = true;
          break;
        }
        el = el.parentElement;
      }

      if (insideTable) {
        e.preventDefault();
        const colInfo = getActiveColumnInfo(editor);
        setActiveCol(colInfo);
        setContextMenuPos({ x: e.clientX, y: e.clientY });
      } else {
        setContextMenuPos(null);
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener("contextmenu", handleContextMenu);

    return () => {
      editor.off("selectionUpdate", onUpdate);
      editor.off("transaction", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
      dom.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [editor, updateTablePosition]);

  // Close context menu on outside click or escape
  useEffect(() => {
    if (!contextMenuPos) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuPos(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenuPos(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenuPos]);

  const insertYesNoCell = () => {
    setCellBadge(editor, {
      value: "Yes",
      variant: "yes",
      color: "green",
      options: JSON.stringify(["Yes", "No"]),
    });
    setContextMenuPos(null);
  };

  const fillYesNoColumn = () => {
    fillColumnWithBadge(
      editor,
      {
        value: "Yes",
        variant: "yes",
        color: "green",
        options: JSON.stringify(["Yes", "No"]),
      },
      true,
    );
    setContextMenuPos(null);
  };

  if (!tablePos) return null;

  return createPortal(
    <div ref={containerRef} className="pointer-events-none fixed inset-0 z-40">
      {/* ── Top floating table action bar ─────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          top: Math.max(10, tablePos.top - 38),
          left: Math.max(10, tablePos.left),
        }}
        className="pointer-events-auto flex items-center gap-1 rounded-lg border border-hairline/80 bg-popover/95 px-1.5 py-1 text-popover-foreground shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      >
        <span className="ns-micro px-1.5 font-semibold uppercase tracking-wider text-muted">
          Table
        </span>
        <div className="h-3.5 w-px bg-hairline" />

        {/* ── Add Row Dropdown (Above / Below) ────────────────────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium text-slate transition-colors hover:bg-stone hover:text-ink cursor-pointer"
            >
              <Plus className="size-3 text-accent" />
              <span>Row</span>
              <ChevronDown className="size-2.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-40 z-50">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addRowBefore().run()}
              className="gap-2 text-xs"
            >
              <ArrowUp className="size-3.5 text-accent" />
              <span>Insert row above</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="gap-2 text-xs"
            >
              <ArrowDown className="size-3.5 text-accent" />
              <span>Insert row below</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ── Add Column Dropdown (Left / Right) ─────────────────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium text-slate transition-colors hover:bg-stone hover:text-ink cursor-pointer"
            >
              <Plus className="size-3 text-accent" />
              <span>Column</span>
              <ChevronDown className="size-2.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-40 z-50">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              className="gap-2 text-xs"
            >
              <ArrowLeft className="size-3.5 text-accent" />
              <span>Insert column left</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="gap-2 text-xs"
            >
              <ArrowRight className="size-3.5 text-accent" />
              <span>Insert column right</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-3.5 w-px bg-hairline" />

        {/* ── Make 1st row as a header button ───────────────────────────── */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium text-slate transition-colors hover:bg-stone hover:text-ink cursor-pointer"
            >
              <Heading className="size-3 text-accent" />
              <span>Header</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Make 1st row as a header (toggle)</TooltipContent>
        </Tooltip>

        <div className="h-3.5 w-px bg-hairline" />

        {/* ── Badges / Options Dropdown (Isolated per Column) ────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium text-emerald-500 transition-colors hover:bg-emerald-500/10 cursor-pointer"
            >
              <Tag className="size-3" />
              <span>Options</span>
              <ChevronDown className="size-2.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56 z-50">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
              Column: {activeCol.headerName}
            </div>

            {/* If this column has defined choices, show them directly */}
            {activeCol.choices.length > 0 ? (
              <>
                <div className="px-2.5 py-0.5 text-[11px] text-slate">
                  Select option for this cell:
                </div>
                {activeCol.choices.map((choice, i) => (
                  <DropdownMenuItem
                    key={i}
                    onClick={() =>
                      setCellBadge(editor, {
                        value: choice.label,
                        variant:
                          choice.label.toLowerCase() === "no"
                            ? "no"
                            : choice.label.toLowerCase() === "yes"
                            ? "yes"
                            : "custom",
                        color: choice.color || "green",
                        options: JSON.stringify(activeCol.choices),
                      })
                    }
                    className="gap-2 text-xs cursor-pointer"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor:
                          choice.color === "green"
                            ? "#10b981"
                            : choice.color === "red"
                            ? "#f43f5e"
                            : choice.color === "blue"
                            ? "#3b82f6"
                            : choice.color === "amber"
                            ? "#f59e0b"
                            : choice.color === "purple"
                            ? "#8b5cf6"
                            : "#9ca3af",
                      }}
                    />
                    <span className="font-medium">{choice.label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    fillColumnWithBadge(
                      editor,
                      {
                        value: activeCol.choices[0].label,
                        variant:
                          activeCol.choices[0].label.toLowerCase() === "no"
                            ? "no"
                            : activeCol.choices[0].label.toLowerCase() === "yes"
                            ? "yes"
                            : "custom",
                        color: activeCol.choices[0].color || "green",
                        options: JSON.stringify(activeCol.choices),
                      },
                      true,
                    )
                  }
                  className="gap-2 text-xs"
                >
                  <Check className="size-3.5 text-emerald-500" />
                  <span>Fill column with "{activeCol.choices[0].label}"</span>
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={insertYesNoCell} className="gap-2 text-xs">
                  <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] text-emerald-500">
                    ✓
                  </span>
                  <span>Insert Yes / No (Cell)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={fillYesNoColumn} className="gap-2 text-xs">
                  <Check className="size-3.5 text-emerald-500" />
                  <span>Fill column with Yes / No</span>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => setCustomDialogOpen(true)}
              className="gap-2 text-xs font-medium text-ink cursor-pointer"
            >
              <Sparkles className="size-3.5 text-emerald-500" />
              <span>Configure Column Options (2-5)...</span>
            </DropdownMenuItem>

            {activeCol.hasBadges && (
              <DropdownMenuItem
                onClick={() => clearColumnBadges(editor)}
                className="gap-2 text-xs text-muted hover:text-error cursor-pointer"
              >
                <X className="size-3.5" />
                <span>Clear Column Badges</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-3.5 w-px bg-hairline" />

        {/* ── Delete Row ─────────────────────────────────────────────────── */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-[11.5px] text-muted transition-colors hover:bg-error/10 hover:text-error cursor-pointer"
            >
              <Rows3 className="size-3" />
              <X className="size-2.5 -ml-0.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Delete current row</TooltipContent>
        </Tooltip>

        {/* ── Delete Column ──────────────────────────────────────────────── */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-[11.5px] text-muted transition-colors hover:bg-error/10 hover:text-error cursor-pointer"
            >
              <Columns3 className="size-3" />
              <X className="size-2.5 -ml-0.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Delete current column</TooltipContent>
        </Tooltip>

        {/* ── Delete Entire Table ────────────────────────────────────────── */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-[11.5px] text-muted transition-colors hover:bg-error/10 hover:text-error cursor-pointer"
            >
              <Trash2 className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Delete entire table</TooltipContent>
        </Tooltip>
      </div>

      {/* ── Right-Click Table Context Menu ──────────────────────────────── */}
      {contextMenuPos && (
        <div
          ref={contextMenuRef}
          style={{
            position: "fixed",
            top: Math.min(window.innerHeight - 340, Math.max(10, contextMenuPos.y)),
            left: Math.min(window.innerWidth - 250, Math.max(10, contextMenuPos.x)),
          }}
          className="pointer-events-auto z-50 min-w-56 overflow-hidden rounded-md border border-hairline bg-surface p-1.5 text-ink shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-emerald-500">
            Column: {activeCol.headerName}
          </div>

          {/* Quick choices for THIS specific column */}
          {activeCol.choices.length > 0 ? (
            <>
              {activeCol.choices.map((choice, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setCellBadge(editor, {
                      value: choice.label,
                      variant:
                        choice.label.toLowerCase() === "no"
                          ? "no"
                          : choice.label.toLowerCase() === "yes"
                          ? "yes"
                          : "custom",
                      color: choice.color || "green",
                      options: JSON.stringify(activeCol.choices),
                    });
                    setContextMenuPos(null);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-ink transition-colors hover:bg-stone"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor:
                        choice.color === "green"
                          ? "#10b981"
                          : choice.color === "red"
                          ? "#f43f5e"
                          : choice.color === "blue"
                          ? "#3b82f6"
                          : choice.color === "amber"
                          ? "#f59e0b"
                          : choice.color === "purple"
                          ? "#8b5cf6"
                          : "#9ca3af",
                    }}
                  />
                  <span>{choice.label}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  fillColumnWithBadge(
                    editor,
                    {
                      value: activeCol.choices[0].label,
                      variant:
                        activeCol.choices[0].label.toLowerCase() === "no"
                          ? "no"
                          : activeCol.choices[0].label.toLowerCase() === "yes"
                          ? "yes"
                          : "custom",
                      color: activeCol.choices[0].color || "green",
                      options: JSON.stringify(activeCol.choices),
                    },
                    true,
                  );
                  setContextMenuPos(null);
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-ink transition-colors hover:bg-stone"
              >
                <Check className="size-3.5 text-emerald-500" />
                <span>Fill Column with "{activeCol.choices[0].label}"</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={insertYesNoCell}
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-ink transition-colors hover:bg-stone"
              >
                <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] text-emerald-500">
                  ✓
                </span>
                <span>Insert Yes / No Badge</span>
              </button>
              <button
                type="button"
                onClick={fillYesNoColumn}
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-ink transition-colors hover:bg-stone"
              >
                <Check className="size-3.5 text-emerald-500" />
                <span>Fill Column with Yes / No</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setContextMenuPos(null);
              setCustomDialogOpen(true);
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs font-medium text-emerald-500 transition-colors hover:bg-stone"
          >
            <Sparkles className="size-3.5" />
            <span>Configure Options (2-5)...</span>
          </button>

          {activeCol.hasBadges && (
            <button
              type="button"
              onClick={() => {
                clearColumnBadges(editor);
                setContextMenuPos(null);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-muted hover:text-error transition-colors"
            >
              <X className="size-3.5" />
              <span>Clear Column Badges</span>
            </button>
          )}

          <div className="my-1 h-px bg-hairline" />

          {/* Rows */}
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().addRowBefore().run();
              setContextMenuPos(null);
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-ink transition-colors hover:bg-stone"
          >
            <ArrowUp className="size-3.5 text-accent" />
            <span>Insert Row Above</span>
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().addRowAfter().run();
              setContextMenuPos(null);
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-ink transition-colors hover:bg-stone"
          >
            <ArrowDown className="size-3.5 text-accent" />
            <span>Insert Row Below</span>
          </button>

          <div className="my-1 h-px bg-hairline" />

          {/* Columns */}
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().addColumnBefore().run();
              setContextMenuPos(null);
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-ink transition-colors hover:bg-stone"
          >
            <ArrowLeft className="size-3.5 text-accent" />
            <span>Insert Column Left</span>
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().addColumnAfter().run();
              setContextMenuPos(null);
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-ink transition-colors hover:bg-stone"
          >
            <ArrowRight className="size-3.5 text-accent" />
            <span>Insert Column Right</span>
          </button>

          <div className="my-1 h-px bg-hairline" />

          {/* Header Row */}
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().toggleHeaderRow().run();
              setContextMenuPos(null);
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-ink transition-colors hover:bg-stone"
          >
            <Heading className="size-3.5 text-accent" />
            <span>Make 1st Row as Header</span>
          </button>

          <div className="my-1 h-px bg-hairline" />

          {/* Deletes */}
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().deleteRow().run();
              setContextMenuPos(null);
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-error transition-colors hover:bg-error/10"
          >
            <Rows3 className="size-3.5" />
            <span>Delete Current Row</span>
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().deleteColumn().run();
              setContextMenuPos(null);
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-error transition-colors hover:bg-error/10"
          >
            <Columns3 className="size-3.5" />
            <span>Delete Current Column</span>
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().deleteTable().run();
              setContextMenuPos(null);
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs text-error transition-colors hover:bg-error/10"
          >
            <Trash2 className="size-3.5" />
            <span>Delete Entire Table</span>
          </button>
        </div>
      )}

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
            className="pointer-events-auto flex size-7 items-center justify-center rounded-md border border-hairline/80 bg-stone/90 text-slate shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:border-accent hover:bg-accent hover:text-white cursor-pointer"
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
            className="pointer-events-auto flex items-center gap-1 rounded-md border border-hairline/80 bg-stone/90 px-3 py-1 text-[11px] font-medium text-slate shadow-md backdrop-blur-sm transition-all hover:border-accent hover:bg-accent hover:text-white cursor-pointer"
          >
            <Plus className="size-3" />
            <span>Add row</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Add row</TooltipContent>
      </Tooltip>

      {/* ── Custom Options & Badges Dialog (Isolated per Column) ─────────── */}
      <TableBadgeDialog
        open={customDialogOpen}
        onOpenChange={setCustomDialogOpen}
        editor={editor}
        columnTitle={activeCol.headerName}
        initialChoices={activeCol.choices.length > 0 ? activeCol.choices : undefined}
      />
    </div>,
    document.body,
  );
}
