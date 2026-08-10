import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";

/**
 * Re-renders the caller whenever the editor's selection or document changes, so
 * toolbar buttons can reflect `isActive` state without polling.
 */
export function useEditorTick(editor: Editor | null): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const bump = () => setTick((value) => value + 1);
    editor.on("selectionUpdate", bump);
    editor.on("transaction", bump);
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("transaction", bump);
    };
  }, [editor]);

  return tick;
}
