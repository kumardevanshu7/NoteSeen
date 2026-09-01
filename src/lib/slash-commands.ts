import type { ComponentType } from "react";
import type { Editor, Range } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import Suggestion, {
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Table as TableIcon,
  Type,
  type LucideIcon,
} from "lucide-react";
import { queueNoteImages } from "./note-images";

export type SlashCategory = "Basic blocks" | "Lists & Tasks" | "Advanced & Media";

export interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  category: SlashCategory;
  keywords: string[];
  shortcut?: string;
  command: (options: { editor: Editor; range: Range; noteId?: string }) => void;
}

function triggerImageUpload(noteId?: string): void {
  if (!noteId) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.onchange = () => {
    const files = Array.from(input.files ?? []);
    if (files.length > 0) queueNoteImages(files, noteId);
  };
  input.click();
}

export const SLASH_COMMAND_ITEMS: SlashCommandItem[] = [
  // ── Basic blocks ────────────────────────────────────────────────────────
  {
    id: "text",
    title: "Text",
    description: "Start writing plain text.",
    icon: Type,
    category: "Basic blocks",
    keywords: ["p", "paragraph", "text", "normal", "plain"],
    shortcut: "p",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    id: "h1",
    title: "Heading 1",
    description: "Large section heading.",
    icon: Heading1,
    category: "Basic blocks",
    keywords: ["h1", "heading1", "title", "header1", "large", "1", "#"],
    shortcut: "#",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    id: "h2",
    title: "Heading 2",
    description: "Medium subsection heading.",
    icon: Heading2,
    category: "Basic blocks",
    keywords: ["h2", "heading2", "subtitle", "header2", "medium", "2", "##"],
    shortcut: "##",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    id: "h3",
    title: "Heading 3",
    description: "Small subsection heading.",
    icon: Heading3,
    category: "Basic blocks",
    keywords: ["h3", "heading3", "subheading", "header3", "small", "3", "###"],
    shortcut: "###",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    id: "divider",
    title: "Divider",
    description: "Visual horizontal dividing line.",
    icon: Minus,
    category: "Basic blocks",
    keywords: ["divider", "line", "horizontal", "rule", "separator", "hr", "---", "split"],
    shortcut: "---",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },

  // ── Lists & Tasks ────────────────────────────────────────────────────────
  {
    id: "todo",
    title: "To-do list",
    description: "Track tasks with interactive checkboxes.",
    icon: ListTodo,
    category: "Lists & Tasks",
    keywords: ["todo", "task", "checklist", "checkbox", "check", "tasks", "[]"],
    shortcut: "[]",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    id: "bullet",
    title: "Bulleted list",
    description: "Create a clean bulleted list.",
    icon: List,
    category: "Lists & Tasks",
    keywords: ["bullet", "list", "unordered", "ul", "points", "-"],
    shortcut: "-",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: "numbered",
    title: "Numbered list",
    description: "Create a list with sequential numbers.",
    icon: ListOrdered,
    category: "Lists & Tasks",
    keywords: ["numbered", "list", "ordered", "ol", "numbers", "1.", "sequence"],
    shortcut: "1.",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },

  // ── Advanced & Media ────────────────────────────────────────────────────
  {
    id: "table",
    title: "Table",
    description: "Insert a 3 × 3 structured data table.",
    icon: TableIcon,
    category: "Advanced & Media",
    keywords: ["table", "grid", "rows", "columns", "spreadsheet", "data", "matrix", "cell"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    id: "quote",
    title: "Quote",
    description: "Capture a quotation or citation block.",
    icon: Quote,
    category: "Advanced & Media",
    keywords: ["quote", "blockquote", "citation", "callout", ">"],
    shortcut: ">",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    id: "code",
    title: "Code block",
    description: "Code snippet with monospace syntax formatting.",
    icon: Code2,
    category: "Advanced & Media",
    keywords: ["code", "codeblock", "syntax", "javascript", "python", "snippet", "pre", "```"],
    shortcut: "```",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    id: "highlight",
    title: "Highlight",
    description: "Highlight important text with accent wash.",
    icon: Highlighter,
    category: "Advanced & Media",
    keywords: ["highlight", "mark", "yellow", "callout", "important", "color", "notice"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHighlight().run();
    },
  },
  {
    id: "image",
    title: "Image",
    description: "Upload and embed pictures into the note.",
    icon: ImagePlus,
    category: "Advanced & Media",
    keywords: ["image", "picture", "photo", "upload", "media", "img", "screenshot"],
    command: ({ editor, range, noteId }) => {
      editor.chain().focus().deleteRange(range).run();
      triggerImageUpload(noteId);
    },
  },
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return SLASH_COMMAND_ITEMS;

  return SLASH_COMMAND_ITEMS.filter((item) => {
    if (item.title.toLowerCase().includes(clean)) return true;
    if (item.description.toLowerCase().includes(clean)) return true;
    if (item.keywords.some((k) => k.toLowerCase().includes(clean))) return true;
    if (item.shortcut && item.shortcut.toLowerCase().includes(clean)) return true;
    return false;
  });
}

export interface SlashMenuState {
  isOpen: boolean;
  query: string;
  items: SlashCommandItem[];
  selectedIndex: number;
  rect: DOMRect | null;
  editor: Editor | null;
  range: Range | null;
  command: ((item: SlashCommandItem) => void) | null;
}

type SlashMenuListener = (state: SlashMenuState) => void;
const listeners = new Set<SlashMenuListener>();

let currentMenuState: SlashMenuState = {
  isOpen: false,
  query: "",
  items: SLASH_COMMAND_ITEMS,
  selectedIndex: 0,
  rect: null,
  editor: null,
  range: null,
  command: null,
};

export function getSlashMenuState(): SlashMenuState {
  return currentMenuState;
}

export function subscribeSlashMenu(listener: SlashMenuListener): () => void {
  listeners.add(listener);
  listener(currentMenuState);
  return () => {
    listeners.delete(listener);
  };
}

export function updateSlashMenuState(next: Partial<SlashMenuState>): void {
  currentMenuState = { ...currentMenuState, ...next };
  for (const listener of listeners) {
    listener(currentMenuState);
  }
}

export function createSlashCommandsExtension(getNoteId?: () => string) {
  return Extension.create({
    name: "slashCommands",

    addOptions() {
      return {
        suggestion: {
          char: "/",
          allowSpaces: false,
          startOfLine: false,
          command: ({
            editor,
            range,
            props,
          }: {
            editor: Editor;
            range: Range;
            props: SlashCommandItem;
          }) => {
            props.command({ editor, range, noteId: getNoteId?.() });
          },
        },
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: "/",
          allowSpaces: false,
          startOfLine: false,
          items: ({ query }: { query: string }) => {
            return filterSlashCommands(query);
          },
          command: ({
            editor,
            range,
            props,
          }: {
            editor: Editor;
            range: Range;
            props: SlashCommandItem;
          }) => {
            props.command({ editor, range, noteId: getNoteId?.() });
          },
          render: () => {
            let suggestionCommand: ((item: SlashCommandItem) => void) | null = null;

            return {
              onStart: (props: SuggestionProps<SlashCommandItem>) => {
                suggestionCommand = props.command;
                const items = filterSlashCommands(props.query);
                const rect = props.clientRect ? props.clientRect() : null;
                updateSlashMenuState({
                  isOpen: true,
                  query: props.query,
                  items,
                  selectedIndex: 0,
                  rect,
                  editor: props.editor,
                  range: props.range,
                  command: (item: SlashCommandItem) => {
                    props.command(item);
                  },
                });
              },

              onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
                suggestionCommand = props.command;
                const items = filterSlashCommands(props.query);
                const rect = props.clientRect ? props.clientRect() : null;
                updateSlashMenuState({
                  isOpen: true,
                  query: props.query,
                  items,
                  selectedIndex: 0,
                  rect,
                  editor: props.editor,
                  range: props.range,
                  command: (item: SlashCommandItem) => {
                    props.command(item);
                  },
                });
              },

              onKeyDown: (props: SuggestionKeyDownProps) => {
                if (props.event.key === "Escape") {
                  updateSlashMenuState({ isOpen: false });
                  return true;
                }

                if (props.event.key === "ArrowDown") {
                  const { items, selectedIndex } = currentMenuState;
                  if (items.length === 0) return false;
                  const nextIndex = (selectedIndex + 1) % items.length;
                  updateSlashMenuState({ selectedIndex: nextIndex });
                  return true;
                }

                if (props.event.key === "ArrowUp") {
                  const { items, selectedIndex } = currentMenuState;
                  if (items.length === 0) return false;
                  const prevIndex = (selectedIndex - 1 + items.length) % items.length;
                  updateSlashMenuState({ selectedIndex: prevIndex });
                  return true;
                }

                if (props.event.key === "Enter" || props.event.key === "Tab") {
                  const { items, selectedIndex } = currentMenuState;
                  if (items.length > 0 && selectedIndex >= 0 && selectedIndex < items.length) {
                    const item = items[selectedIndex];
                    if (item) {
                      if (suggestionCommand) {
                        suggestionCommand(item);
                      } else if (currentMenuState.command) {
                        currentMenuState.command(item);
                      }
                      updateSlashMenuState({ isOpen: false });
                      return true;
                    }
                  }
                }

                return false;
              },

              onExit: () => {
                suggestionCommand = null;
                updateSlashMenuState({ isOpen: false, rect: null, command: null });
              },
            };
          },
        }),
      ];
    },
  });
}
