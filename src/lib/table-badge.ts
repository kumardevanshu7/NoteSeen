import { mergeAttributes, Node } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

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
}

export interface TableBadgeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableBadge: {
      /** Insert an interactive status / choice badge */
      insertTableBadge: (attrs: {
        value: string;
        variant?: "yes" | "no" | "custom";
        color?: BadgeColor;
        options?: string; // serialized JSON array of choices if part of a set
      }) => ReturnType;
    };
  }
}

/**
 * Scans a table node and extracts a template map for every column.
 * Remembers each column's distinct header, options list, and default badge.
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
 * Returns column info (index, header name, choices) for the currently focused cell.
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
    headerName: template?.headerName || `Column ${targetColIndex + 1}`,
    hasBadges: template?.hasBadges || false,
    choices: template?.choices || [],
    currentBadgeValue,
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
      },
      variant: {
        default: "yes",
      },
      color: {
        default: "green",
      },
      options: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-table-badge]",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          const val = el.getAttribute("data-value") || el.textContent?.trim() || "Yes";
          const rawVariant = el.getAttribute("data-variant");
          const variant =
            rawVariant === "yes" || rawVariant === "no" || rawVariant === "custom"
              ? rawVariant
              : val.toLowerCase() === "no"
              ? "no"
              : val.toLowerCase() === "yes"
              ? "yes"
              : "custom";
          const color =
            (el.getAttribute("data-color") as BadgeColor) ||
            (variant === "no" ? "red" : "green");
          return {
            value: val,
            variant,
            color,
            options: el.getAttribute("data-options") || "",
          };
        },
      },
      {
        tag: "span.ns-badge-pill",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          const val = el.getAttribute("data-value") || el.textContent?.trim() || "Yes";
          const rawVariant = el.getAttribute("data-variant");
          const variant =
            rawVariant === "yes" || rawVariant === "no" || rawVariant === "custom"
              ? rawVariant
              : val.toLowerCase() === "no"
              ? "no"
              : val.toLowerCase() === "yes"
              ? "yes"
              : "custom";
          const color =
            (el.getAttribute("data-color") as BadgeColor) ||
            (variant === "no" ? "red" : "green");
          return {
            value: val,
            variant,
            color,
            options: el.getAttribute("data-options") || "",
          };
        },
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

              // Check if row is freshly created / completely empty
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
 * Prevents multiple badges from ever accumulating in the same cell.
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
 * Also cleans up any duplicate badges in the parent paragraph if present.
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

  // Check if parent paragraph has duplicate badges and clean them up
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
