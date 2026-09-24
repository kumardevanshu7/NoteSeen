import { mergeAttributes, Node } from "@tiptap/core";
import TableRow from "@tiptap/extension-table-row";
import type { Editor } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { CellSelection, moveTableRow } from "@tiptap/pm/tables";
import { toast } from "sonner";

export type BadgeColor = "green" | "red" | "blue" | "amber" | "purple" | "gray";

export interface BadgeChoice {
  label: string;
  color?: BadgeColor;
}

export interface ColumnTemplate {
  colIndex: number;
  headerName: string;
  hasBadges: boolean;
  choices: BadgeChoice[];
  defaultBadge?: {
    value: string;
    variant: "yes" | "no" | "custom";
    color: BadgeColor;
    options: string;
  };
}

export interface ActiveColumnInfo {
  colIndex: number;
  headerName: string;
  hasBadges: boolean;
  choices: BadgeChoice[];
  currentBadgeValue?: string;
  rowIndex: number;
  isHeaderRow: boolean;
  currentRowColor?: string | null;
}

export interface TableBadgeOptions {
  HTMLAttributes: Record<string, unknown>;
}

export interface RowColorOption {
  id: string;
  name: string;
  color: string;
  border: string;
}

export const ROW_LIGHT_COLORS: RowColorOption[] = [
  { id: "mint", name: "Mint Green", color: "rgba(16, 185, 129, 0.16)", border: "rgba(16, 185, 129, 0.35)" },
  { id: "sky", name: "Sky Blue", color: "rgba(59, 130, 246, 0.16)", border: "rgba(59, 130, 246, 0.35)" },
  { id: "lavender", name: "Lavender", color: "rgba(139, 92, 246, 0.16)", border: "rgba(139, 92, 246, 0.35)" },
  { id: "amber", name: "Warm Amber", color: "rgba(245, 158, 11, 0.17)", border: "rgba(245, 158, 11, 0.35)" },
  { id: "coral", name: "Coral Rose", color: "rgba(244, 63, 94, 0.16)", border: "rgba(244, 63, 94, 0.35)" },
  { id: "cyan", name: "Soft Cyan", color: "rgba(6, 182, 212, 0.16)", border: "rgba(6, 182, 212, 0.35)" },
  { id: "lime", name: "Sage Lime", color: "rgba(132, 204, 22, 0.17)", border: "rgba(132, 204, 22, 0.35)" },
  { id: "pink", name: "Pink Fuchsia", color: "rgba(217, 70, 239, 0.16)", border: "rgba(217, 70, 239, 0.35)" },
  { id: "indigo", name: "Periwinkle", color: "rgba(99, 102, 241, 0.16)", border: "rgba(99, 102, 241, 0.35)" },
  { id: "slate", name: "Slate Stone", color: "rgba(148, 163, 184, 0.18)", border: "rgba(148, 163, 184, 0.35)" },
];

/**
 * Extended TableRow supporting row background color attribute.
 */
export const CustomTableRow = TableRow.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-row-color") ||
          element.style.getPropertyValue("--row-bg") ||
          element.style.backgroundColor ||
          null,
        renderHTML: (attributes) => {
          if (!attributes.color) return {};
          return {
            "data-row-color": attributes.color,
            style: `--row-bg: ${attributes.color}; background-color: ${attributes.color} !important`,
          };
        },
      },
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableBadge: {
      /** Insert an interactive status / choice badge */
      insertTableBadge: (attrs: {
        value: string;
        variant?: "yes" | "no" | "custom";
        color?: BadgeColor;
        options?: string;
      }) => ReturnType;
    };
  }
}

/**
 * Scans a table node and extracts a template map for every column.
 */
export function getColumnsTemplateMap(
  tableNode: ProsemirrorNode,
): Map<number, ColumnTemplate> {
  const map = new Map<number, ColumnTemplate>();
  if (!tableNode || tableNode.childCount === 0) return map;

  const firstRow = tableNode.child(0);
  const colCount = firstRow.childCount;

  for (let c = 0; c < colCount; c++) {
    const cell = firstRow.child(c);
    const headerName = cell.textContent.trim() || `Column ${c + 1}`;
    map.set(c, {
      colIndex: c,
      headerName,
      hasBadges: false,
      choices: [],
    });
  }

  // Scan all rows to find badge templates for each column
  for (let r = 0; r < tableNode.childCount; r++) {
    const row = tableNode.child(r);
    for (let c = 0; c < Math.min(row.childCount, colCount); c++) {
      const cell = row.child(c);
      const template = map.get(c)!;

      cell.descendants((node) => {
        if (node.type.name === "tableBadge") {
          template.hasBadges = true;
          if (!template.defaultBadge) {
            let choices: BadgeChoice[] = [];
            if (node.attrs.options) {
              try {
                choices = JSON.parse(node.attrs.options);
              } catch {}
            }
            if (choices.length === 0) {
              choices = [
                { label: "Yes", color: "green" },
                { label: "No", color: "red" },
              ];
            }
            template.choices = choices;
            const firstChoice = choices[0];
            template.defaultBadge = {
              value: firstChoice?.label || node.attrs.value || "Yes",
              variant:
                (firstChoice?.label || node.attrs.value || "Yes").toLowerCase() === "no"
                  ? "no"
                  : (firstChoice?.label || node.attrs.value || "Yes").toLowerCase() === "yes"
                  ? "yes"
                  : "custom",
              color: firstChoice?.color || node.attrs.color || "green",
              options: node.attrs.options || JSON.stringify(choices),
            };
          }
          return false;
        }
        return true;
      });
    }
  }

  return map;
}

/**
 * Returns column info (index, header name, choices, row position) for the currently focused cell.
 */
export function getActiveColumnInfo(editor: Editor): ActiveColumnInfo {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  let tableDepth = -1;
  let rowDepth = -1;
  let cellDepth = -1;

  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "table") tableDepth = d;
    else if (name === "tableRow") rowDepth = d;
    else if (name === "tableCell" || name === "tableHeader") cellDepth = d;
  }

  if (tableDepth === -1 || rowDepth === -1 || cellDepth === -1) {
    return {
      colIndex: 0,
      rowIndex: 0,
      isHeaderRow: false,
      headerName: "Column",
      hasBadges: false,
      choices: [],
    };
  }

  const tableNode = $from.node(tableDepth);
  const rowNode = $from.node(rowDepth);
  const cellNode = $from.node(cellDepth);

  let targetColIndex = 0;
  for (let c = 0; c < rowNode.childCount; c++) {
    if (rowNode.child(c) === cellNode) {
      targetColIndex = c;
      break;
    }
  }

  let targetRowIndex = 0;
  for (let r = 0; r < tableNode.childCount; r++) {
    if (tableNode.child(r) === rowNode) {
      targetRowIndex = r;
      break;
    }
  }

  let currentBadgeValue: string | undefined;
  cellNode.descendants((node) => {
    if (node.type.name === "tableBadge") {
      currentBadgeValue = node.attrs.value;
      return false;
    }
    return true;
  });

  const templates = getColumnsTemplateMap(tableNode);
  const template = templates.get(targetColIndex);

  return {
    colIndex: targetColIndex,
    rowIndex: targetRowIndex,
    isHeaderRow: targetRowIndex === 0 && rowNode.child(0)?.type.name === "tableHeader",
    headerName: template?.headerName || `Column ${targetColIndex + 1}`,
    hasBadges: template?.hasBadges || false,
    choices: template?.choices || [],
    currentBadgeValue,
    currentRowColor: (rowNode.attrs.color as string | undefined) || null,
  };
}

export const TableBadge = Node.create<TableBadgeOptions>({
  name: "tableBadge",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      value: {
        default: "Yes",
        parseHTML: (element) =>
          element.getAttribute("data-value") ||
          element.getAttribute("value") ||
          element.textContent?.trim() ||
          "Yes",
        renderHTML: (attributes) => ({ "data-value": attributes.value }),
      },
      variant: {
        default: "yes",
        parseHTML: (element) =>
          element.getAttribute("data-variant") ||
          element.getAttribute("variant") ||
          "yes",
        renderHTML: (attributes) => ({ "data-variant": attributes.variant }),
      },
      color: {
        default: "green",
        parseHTML: (element) =>
          (element.getAttribute("data-color") ||
            element.getAttribute("color") ||
            "green") as BadgeColor,
        renderHTML: (attributes) => ({ "data-color": attributes.color }),
      },
      options: {
        default: "",
        parseHTML: (element) =>
          element.getAttribute("data-options") ||
          element.getAttribute("options") ||
          "",
        renderHTML: (attributes) => ({ "data-options": attributes.options }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-table-badge]",
        priority: 60,
      },
      {
        tag: "span.ns-badge-pill",
        priority: 55,
      },
      {
        tag: "span[data-variant]",
        priority: 50,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant =
      node.attrs.variant || (node.attrs.value.toLowerCase() === "no" ? "no" : "yes");
    const color =
      node.attrs.color || (variant === "no" ? "red" : variant === "yes" ? "green" : "blue");
    const val = node.attrs.value || (variant === "no" ? "No" : "Yes");

    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `ns-badge-pill ns-badge-${variant} ns-badge-color-${color}`,
        "data-table-badge": "true",
        "data-variant": variant,
        "data-color": color,
        "data-value": val,
        "data-options": node.attrs.options || "",
        contenteditable: "false",
        title: "Click to change option",
      }),
      val,
    ];
  },

  addCommands() {
    return {
      insertTableBadge:
        (attrs) =>
        ({ commands }) => {
          const variant =
            attrs.variant ||
            (attrs.value.toLowerCase() === "no"
              ? "no"
              : attrs.value.toLowerCase() === "yes"
              ? "yes"
              : "custom");
          const color =
            attrs.color ||
            (variant === "no" ? "red" : variant === "yes" ? "green" : "blue");

          return commands.insertContent({
            type: this.name,
            attrs: {
              value: attrs.value,
              variant,
              color,
              options: attrs.options || "",
            },
          });
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("tableBadgeAutoPopulate"),
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const pType = newState.schema.nodes.paragraph;
          const badgeType = newState.schema.nodes.tableBadge;
          if (!pType || !badgeType) return null;

          let tr = newState.tr;
          let modified = false;

          const replacements: {
            from: number;
            to: number;
            badgeNode: ProsemirrorNode;
          }[] = [];

          newState.doc.descendants((tableNode, tablePos) => {
            if (tableNode.type.name !== "table") return true;

            const templates = getColumnsTemplateMap(tableNode);
            const hasAnyBadgeColumn = Array.from(templates.values()).some(
              (t) => t.hasBadges && t.defaultBadge,
            );
            if (!hasAnyBadgeColumn) return false;

            let currentPos = tablePos + 1;
            for (let r = 0; r < tableNode.childCount; r++) {
              const rowNode = tableNode.child(r);
              const isFirstRow = r === 0;
              const isHeader = rowNode.child(0)?.type.name === "tableHeader";

              if (isHeader || (isFirstRow && tableNode.childCount > 1)) {
                currentPos += rowNode.nodeSize;
                continue;
              }

              // Check if row is completely empty (newly added row)
              let isRowEmpty = true;
              for (let c = 0; c < rowNode.childCount; c++) {
                const cell = rowNode.child(c);
                let cellHasBadge = false;
                cell.descendants((n) => {
                  if (n.type.name === "tableBadge") {
                    cellHasBadge = true;
                    return false;
                  }
                  return true;
                });
                if (cellHasBadge || cell.textContent.trim().length > 0) {
                  isRowEmpty = false;
                  break;
                }
              }

              if (isRowEmpty) {
                let cPos = currentPos + 1;
                for (let c = 0; c < rowNode.childCount; c++) {
                  const cell = rowNode.child(c);
                  const template = templates.get(c);
                  if (template?.hasBadges && template.defaultBadge) {
                    const bAttrs = template.defaultBadge;
                    const newBadge = badgeType.create({
                      value: bAttrs.value,
                      variant: bAttrs.variant,
                      color: bAttrs.color,
                      options: bAttrs.options,
                    });
                    replacements.push({
                      from: cPos + 1,
                      to: cPos + cell.nodeSize - 1,
                      badgeNode: newBadge,
                    });
                  }
                  cPos += cell.nodeSize;
                }
              }

              currentPos += rowNode.nodeSize;
            }

            return false;
          });

          if (replacements.length === 0) return null;

          for (let i = replacements.length - 1; i >= 0; i--) {
            const { from, to, badgeNode } = replacements[i];
            const p = pType.create(null, badgeNode);
            tr = tr.replaceWith(from, to, p);
            modified = true;
          }

          return modified ? tr : null;
        },
      }),
    ];
  },
});

/**
 * Sets a badge on the current cell, replacing its entire inner content.
 */
export function setCellBadge(
  editor: Editor,
  attrs: {
    value: string;
    variant?: "yes" | "no" | "custom";
    color?: BadgeColor;
    options?: string;
  },
) {
  const { state, view } = editor;
  const { selection } = state;
  const { $from } = selection;

  let cellDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "tableCell" || name === "tableHeader") {
      cellDepth = d;
      break;
    }
  }

  if (cellDepth === -1) {
    editor.chain().focus().insertTableBadge(attrs).run();
    return;
  }

  const cellNode = $from.node(cellDepth);
  const cellPos = $from.before(cellDepth);

  const badgeType = state.schema.nodes.tableBadge;
  const pType = state.schema.nodes.paragraph;
  if (!badgeType || !pType) return;

  const variant =
    attrs.variant ||
    (attrs.value.toLowerCase() === "no"
      ? "no"
      : attrs.value.toLowerCase() === "yes"
      ? "yes"
      : "custom");
  const color =
    attrs.color || (variant === "no" ? "red" : variant === "yes" ? "green" : "blue");

  const newBadge = badgeType.create({
    value: attrs.value,
    variant,
    color,
    options: attrs.options || "",
  });
  const replacementParagraph = pType.create(null, newBadge);

  const tr = state.tr.replaceWith(
    cellPos + 1,
    cellPos + cellNode.nodeSize - 1,
    replacementParagraph,
  );
  view.dispatch(tr);
}

/**
 * Converts existing plain text cells in a column into styled badges.
 */
export function convertColumnTextToBadges(
  editor: Editor,
  fallbackChoices?: BadgeChoice[],
) {
  const { state, view } = editor;
  const { selection } = state;
  const { $from } = selection;

  let tableDepth = -1;
  let rowDepth = -1;
  let cellDepth = -1;

  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "table") tableDepth = d;
    else if (name === "tableRow") rowDepth = d;
    else if (name === "tableCell" || name === "tableHeader") cellDepth = d;
  }

  if (tableDepth === -1 || rowDepth === -1 || cellDepth === -1) return;

  const tableNode = $from.node(tableDepth);
  const tablePos = $from.before(tableDepth);
  const rowNode = $from.node(rowDepth);
  const cellNode = $from.node(cellDepth);

  let targetColIndex = 0;
  for (let c = 0; c < rowNode.childCount; c++) {
    if (rowNode.child(c) === cellNode) {
      targetColIndex = c;
      break;
    }
  }

  const templates = getColumnsTemplateMap(tableNode);
  const colTemplate = templates.get(targetColIndex);

  let choices = fallbackChoices && fallbackChoices.length > 0 ? fallbackChoices : colTemplate?.choices || [];
  if (choices.length === 0) {
    choices = [
      { label: "Yes", color: "green" },
      { label: "No", color: "red" },
      { label: "(No Chance)", color: "amber" },
    ];
  }

  const optionsJson = JSON.stringify(choices);
  const badgeType = state.schema.nodes.tableBadge;
  const pType = state.schema.nodes.paragraph;
  if (!badgeType || !pType) return;

  const cellsToReplace: { from: number; to: number; badge: ProsemirrorNode }[] = [];
  let currentPos = tablePos + 1;

  for (let r = 0; r < tableNode.childCount; r++) {
    const rNode = tableNode.child(r);
    const isFirstRow = r === 0;
    const isHeader = rNode.child(0)?.type.name === "tableHeader";

    if (!(isHeader || (isFirstRow && tableNode.childCount > 1))) {
      let cPos = currentPos + 1;
      for (let c = 0; c < rNode.childCount; c++) {
        const cNode = rNode.child(c);
        if (c === targetColIndex) {
          const rawText = cNode.textContent.trim();
          if (rawText.length > 0) {
            // Find matched choice or create custom badge
            const matchedChoice = choices.find(
              (ch) => ch.label.toLowerCase() === rawText.toLowerCase(),
            );
            const val = matchedChoice ? matchedChoice.label : rawText;
            const color =
              matchedChoice?.color ||
              (val.toLowerCase() === "yes" || val.toLowerCase().includes("insta")
                ? "green"
                : val.toLowerCase() === "no"
                ? "red"
                : val.toLowerCase().includes("chance")
                ? "purple"
                : "blue");
            const variant: "yes" | "no" | "custom" =
              val.toLowerCase() === "yes"
                ? "yes"
                : val.toLowerCase() === "no"
                ? "no"
                : "custom";

            const newBadge = badgeType.create({
              value: val,
              variant,
              color,
              options: optionsJson,
            });

            cellsToReplace.push({
              from: cPos + 1,
              to: cPos + cNode.nodeSize - 1,
              badge: newBadge,
            });
          }
          break;
        }
        cPos += cNode.nodeSize;
      }
    }
    currentPos += rNode.nodeSize;
  }

  if (cellsToReplace.length === 0) return;

  let tr = state.tr;
  for (let i = cellsToReplace.length - 1; i >= 0; i--) {
    const item = cellsToReplace[i];
    const p = pType.create(null, item.badge);
    tr = tr.replaceWith(item.from, item.to, p);
  }
  view.dispatch(tr);
  toast.success("Converted column text into interactive badges");
}

/**
 * Selects the entire row of the current cell.
 */
export function selectCurrentRow(editor: Editor) {
  const { state, view } = editor;
  const { selection } = state;
  const { $from } = selection;

  let cellDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "tableCell" || name === "tableHeader") {
      cellDepth = d;
      break;
    }
  }

  if (cellDepth === -1) return;
  const cellPos = $from.before(cellDepth);
  const $cell = state.doc.resolve(cellPos);

  try {
    const sel = CellSelection.rowSelection($cell);
    view.dispatch(state.tr.setSelection(sel));
  } catch (err) {
    console.error("Select row error", err);
  }
}

/**
 * Selects the entire column of the current cell.
 */
export function selectCurrentColumn(editor: Editor) {
  const { state, view } = editor;
  const { selection } = state;
  const { $from } = selection;

  let cellDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "tableCell" || name === "tableHeader") {
      cellDepth = d;
      break;
    }
  }

  if (cellDepth === -1) return;
  const cellPos = $from.before(cellDepth);
  const $cell = state.doc.resolve(cellPos);

  try {
    const sel = CellSelection.colSelection($cell);
    view.dispatch(state.tr.setSelection(sel));
  } catch (err) {
    console.error("Select column error", err);
  }
}

/**
 * Pins the current row to the top of data rows (directly beneath header row).
 */
export function pinCurrentRowToTop(editor: Editor) {
  const { state, view } = editor;
  const { selection } = state;
  const { $from } = selection;

  let tableDepth = -1;
  let rowDepth = -1;

  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "table") tableDepth = d;
    else if (name === "tableRow") rowDepth = d;
  }

  if (tableDepth === -1 || rowDepth === -1) return;

  const tableNode = $from.node(tableDepth);
  const rowNode = $from.node(rowDepth);

  let originIndex = -1;
  for (let r = 0; r < tableNode.childCount; r++) {
    if (tableNode.child(r) === rowNode) {
      originIndex = r;
      break;
    }
  }

  if (originIndex === -1) return;

  const hasHeader = tableNode.child(0)?.child(0)?.type.name === "tableHeader";
  const targetIndex = hasHeader ? 1 : 0;

  if (originIndex === targetIndex) {
    toast.info("Row is already at the top");
    return;
  }

  const success = moveTableRow({
    from: originIndex,
    to: targetIndex,
    select: true,
  })(state, view.dispatch);

  if (success) {
    toast.success("📌 Row pinned to the top");
  }
}

/**
 * Sets background color on the current table row.
 */
export function setRowColor(editor: Editor, color: string | null) {
  const { state, view } = editor;
  const { selection } = state;

  let rowDepth = -1;
  for (let d = selection.$from.depth; d > 0; d--) {
    if (selection.$from.node(d).type.name === "tableRow") {
      rowDepth = d;
      break;
    }
  }

  if (rowDepth === -1) return;

  const rowPos = selection.$from.before(rowDepth);
  const rowNode = selection.$from.node(rowDepth);

  const tr = state.tr.setNodeMarkup(rowPos, undefined, {
    ...rowNode.attrs,
    color: color || null,
  });
  view.dispatch(tr);
}

/**
 * Clears badges from all data rows in the active column and reverts to empty paragraphs.
 */
export function clearColumnBadges(editor: Editor) {
  const { state, view } = editor;
  const { selection } = state;
  const { $from } = selection;

  let tableDepth = -1;
  let rowDepth = -1;
  let cellDepth = -1;

  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "table") tableDepth = d;
    else if (name === "tableRow") rowDepth = d;
    else if (name === "tableCell" || name === "tableHeader") cellDepth = d;
  }

  if (tableDepth === -1 || rowDepth === -1 || cellDepth === -1) return;

  const tableNode = $from.node(tableDepth);
  const tablePos = $from.before(tableDepth);
  const rowNode = $from.node(rowDepth);
  const cellNode = $from.node(cellDepth);

  let targetColIndex = 0;
  for (let c = 0; c < rowNode.childCount; c++) {
    if (rowNode.child(c) === cellNode) {
      targetColIndex = c;
      break;
    }
  }

  const pType = state.schema.nodes.paragraph;
  if (!pType) return;

  const cellsToReplace: { from: number; to: number }[] = [];
  let currentPos = tablePos + 1;

  for (let r = 0; r < tableNode.childCount; r++) {
    const rNode = tableNode.child(r);
    const isFirstRow = r === 0;
    const isHeader = rNode.child(0)?.type.name === "tableHeader";

    if (!(isHeader || (isFirstRow && tableNode.childCount > 1))) {
      let cPos = currentPos + 1;
      for (let c = 0; c < rNode.childCount; c++) {
        const cNode = rNode.child(c);
        if (c === targetColIndex) {
          cellsToReplace.push({
            from: cPos + 1,
            to: cPos + cNode.nodeSize - 1,
          });
          break;
        }
        cPos += cNode.nodeSize;
      }
    }
    currentPos += rNode.nodeSize;
  }

  let tr = state.tr;
  for (let i = cellsToReplace.length - 1; i >= 0; i--) {
    const range = cellsToReplace[i];
    tr = tr.replaceWith(range.from, range.to, pType.create());
  }
  view.dispatch(tr);
}

/**
 * Fills all data rows in the current table column with a badge.
 */
export function fillColumnWithBadge(
  editor: Editor,
  attrs: {
    value: string;
    variant?: "yes" | "no" | "custom";
    color?: BadgeColor;
    options?: string;
  },
  skipHeaderRow = true,
) {
  const { state, view } = editor;
  const { selection } = state;
  const { $from } = selection;

  let tableDepth = -1;
  let rowDepth = -1;
  let cellDepth = -1;

  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "table") {
      tableDepth = d;
    } else if (name === "tableRow") {
      rowDepth = d;
    } else if (name === "tableCell" || name === "tableHeader") {
      cellDepth = d;
    }
  }

  if (tableDepth === -1 || rowDepth === -1 || cellDepth === -1) {
    setCellBadge(editor, attrs);
    return;
  }

  const tableNode = $from.node(tableDepth);
  const tablePos = $from.before(tableDepth);
  const rowNode = $from.node(rowDepth);
  const cellNode = $from.node(cellDepth);

  let targetColIndex = 0;
  for (let c = 0; c < rowNode.childCount; c++) {
    if (rowNode.child(c) === cellNode) {
      targetColIndex = c;
      break;
    }
  }

  const badgeType = state.schema.nodes.tableBadge;
  const pType = state.schema.nodes.paragraph;
  if (!badgeType || !pType) return;

  const variant =
    attrs.variant ||
    (attrs.value.toLowerCase() === "no"
      ? "no"
      : attrs.value.toLowerCase() === "yes"
      ? "yes"
      : "custom");
  const color =
    attrs.color || (variant === "no" ? "red" : variant === "yes" ? "green" : "blue");

  const newBadge = badgeType.create({
    value: attrs.value,
    variant,
    color,
    options: attrs.options || "",
  });
  const replacementParagraph = pType.create(null, newBadge);

  const cellsToReplace: { from: number; to: number }[] = [];

  let currentPos = tablePos + 1;
  for (let r = 0; r < tableNode.childCount; r++) {
    const rNode = tableNode.child(r);
    const isFirstRow = r === 0;
    const isHeader = rNode.child(0)?.type.name === "tableHeader";

    if (!(skipHeaderRow && (isHeader || (isFirstRow && tableNode.childCount > 1)))) {
      let cPos = currentPos + 1;
      for (let c = 0; c < rNode.childCount; c++) {
        const cNode = rNode.child(c);
        if (c === targetColIndex) {
          cellsToReplace.push({
            from: cPos + 1,
            to: cPos + cNode.nodeSize - 1,
          });
          break;
        }
        cPos += cNode.nodeSize;
      }
    }
    currentPos += rNode.nodeSize;
  }

  if (cellsToReplace.length === 0) {
    setCellBadge(editor, attrs);
    return;
  }

  let tr = state.tr;
  for (let i = cellsToReplace.length - 1; i >= 0; i--) {
    const range = cellsToReplace[i];
    tr = tr.replaceWith(range.from, range.to, replacementParagraph);
  }

  view.dispatch(tr);
}

/**
 * Cycles a badge to its next choice or toggles Yes/No when clicked.
 * Cleans up any duplicate badges in the parent paragraph.
 */
export function cycleTableBadge(
  view: EditorView,
  targetPos: number,
  targetNode: ProsemirrorNode,
) {
  const optionsRaw = targetNode.attrs.options as string | undefined;
  let nextValue = "No";
  let nextVariant: "yes" | "no" | "custom" = "no";
  let nextColor: BadgeColor = "red";

  if (optionsRaw) {
    try {
      const parsed = JSON.parse(optionsRaw) as Array<BadgeChoice | string>;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const currentIndex = parsed.findIndex((item) => {
          const lbl = typeof item === "string" ? item : item.label;
          return (lbl || "").toLowerCase() === (targetNode.attrs.value || "").toLowerCase();
        });
        const nextIndex = (currentIndex + 1) % parsed.length;
        const chosen = parsed[nextIndex];
        if (typeof chosen === "string") {
          nextValue = chosen;
          nextVariant =
            chosen.toLowerCase() === "no"
              ? "no"
              : chosen.toLowerCase() === "yes"
              ? "yes"
              : "custom";
          nextColor =
            nextVariant === "yes" ? "green" : nextVariant === "no" ? "red" : "blue";
        } else {
          nextValue = chosen.label;
          nextVariant =
            chosen.label.toLowerCase() === "yes"
              ? "yes"
              : chosen.label.toLowerCase() === "no"
              ? "no"
              : "custom";
          nextColor =
            chosen.color ||
            (nextVariant === "no" ? "red" : nextVariant === "yes" ? "green" : "blue");
        }
      }
    } catch {
      if ((targetNode.attrs.value || "").toLowerCase() === "yes") {
        nextValue = "No";
        nextVariant = "no";
        nextColor = "red";
      } else {
        nextValue = "Yes";
        nextVariant = "yes";
        nextColor = "green";
      }
    }
  } else {
    if ((targetNode.attrs.value || "").toLowerCase() === "yes") {
      nextValue = "No";
      nextVariant = "no";
      nextColor = "red";
    } else {
      nextValue = "Yes";
      nextVariant = "yes";
      nextColor = "green";
    }
  }

  let tr = view.state.tr.setNodeMarkup(targetPos, undefined, {
    ...targetNode.attrs,
    value: nextValue,
    variant: nextVariant,
    color: nextColor,
  });

  try {
    const $pos = tr.doc.resolve(targetPos);
    if ($pos.parent && $pos.parent.childCount > 1) {
      let badgeCount = 0;
      $pos.parent.forEach((child) => {
        if (child.type.name === "tableBadge") badgeCount++;
      });
      if (badgeCount > 1) {
        const pStart = $pos.start();
        const pEnd = $pos.end();
        const singleBadge = targetNode.type.create({
          ...targetNode.attrs,
          value: nextValue,
          variant: nextVariant,
          color: nextColor,
        });
        tr = tr.replaceWith(pStart, pEnd, singleBadge);
      }
    }
  } catch {}

  view.dispatch(tr);
}
