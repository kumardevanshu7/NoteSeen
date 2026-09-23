import { mergeAttributes, Node } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";

export type BadgeColor = "green" | "red" | "blue" | "amber" | "purple" | "gray";

export interface BadgeChoice {
  label: string;
  color?: BadgeColor;
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
          const variant = (rawVariant === "yes" || rawVariant === "no" || rawVariant === "custom")
            ? rawVariant
            : val.toLowerCase() === "no"
            ? "no"
            : val.toLowerCase() === "yes"
            ? "yes"
            : "custom";
          const color = (el.getAttribute("data-color") as BadgeColor) || (variant === "no" ? "red" : "green");
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
          const variant = (rawVariant === "yes" || rawVariant === "no" || rawVariant === "custom")
            ? rawVariant
            : val.toLowerCase() === "no"
            ? "no"
            : val.toLowerCase() === "yes"
            ? "yes"
            : "custom";
          const color = (el.getAttribute("data-color") as BadgeColor) || (variant === "no" ? "red" : "green");
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
    const variant = node.attrs.variant || (node.attrs.value.toLowerCase() === "no" ? "no" : "yes");
    const color = node.attrs.color || (variant === "no" ? "red" : variant === "yes" ? "green" : "blue");
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
});

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
    editor.chain().focus().insertTableBadge(attrs).run();
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
    editor.chain().focus().insertTableBadge(attrs).run();
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
      // Fallback default toggle
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
    // Default Yes <-> No toggle
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

  const tr = view.state.tr.setNodeMarkup(targetPos, undefined, {
    ...targetNode.attrs,
    value: nextValue,
    variant: nextVariant,
    color: nextColor,
  });
  view.dispatch(tr);
}
