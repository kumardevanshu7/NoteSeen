import type { Editor } from "@tiptap/react";
import { create } from "zustand";

interface EditorState {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
}

/** Shared handle on the live Tiptap instance so the tool rail can drive it. */
export const useEditorStore = create<EditorState>((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
}));
