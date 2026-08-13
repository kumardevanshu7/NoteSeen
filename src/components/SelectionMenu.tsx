import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Check,
  Copy,
  Highlighter,
  Italic,
  Languages,
  Link2,
  Strikethrough,
  Underline as UnderlineIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MENU_WIDTH = 256;
const GAP = 8;

interface Position {
  top: number;
  left: number;
}

/**
 * Positioned by hand instead of with Tiptap's BubbleMenu: that helper relocates
 * the React-rendered node into a Tippy container, so React later fails to
 * remove a node it no longer owns ("removeChild ... not a child of this node").
 */
export function SelectionMenu({ editor }: { editor: Editor }) {
  const [position, setPosition] = useState<Position | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const linkInput = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(180);

  const place = useCallback(() => {
    if (editor.isDestroyed) return setPosition(null);

    const { from, to, empty } = editor.state.selection;
    if (empty || !editor.isEditable || editor.isActive("codeBlock") || editor.isActive("image")) {
      return setPosition(null);
    }

    let start: { top: number; bottom: number; left: number };
    let end: { top: number; bottom: number; left: number };
    try {
      start = editor.view.coordsAtPos(from);
      end = editor.view.coordsAtPos(to, -1);
    } catch {
      // Coordinates are unavailable mid-transaction; the next tick retries.
      return setPosition(null);
    }

    const height = heightRef.current;
    const selectionTop = Math.min(start.top, end.top);
    const selectionBottom = Math.max(start.bottom, end.bottom);

    const below = selectionBottom + GAP;
    const fitsBelow = below + height <= window.innerHeight - GAP;
    const top = fitsBelow ? below : Math.max(GAP, selectionTop - height - GAP);

    const rawLeft = Math.min(start.left, end.left);
    const left = Math.min(Math.max(GAP, rawLeft), window.innerWidth - MENU_WIDTH - GAP);

    setPosition({ top, left });
  }, [editor]);

  useEffect(() => {
    place();

    const onSelection = () => place();
    editor.on("selectionUpdate", onSelection);
    editor.on("transaction", onSelection);

    window.addEventListener("scroll", onSelection, true);
    window.addEventListener("resize", onSelection);

    return () => {
      editor.off("selectionUpdate", onSelection);
      editor.off("transaction", onSelection);
      window.removeEventListener("scroll", onSelection, true);
      window.removeEventListener("resize", onSelection);
    };
  }, [editor, place]);

  // Remember the rendered height so the flip-above decision is accurate.
  useLayoutEffect(() => {
    const measured = menuRef.current?.offsetHeight;
    if (measured && measured !== heightRef.current) heightRef.current = measured;
  }, [position, linkMode]);

  useEffect(() => {
    if (!position) setLinkMode(false);
  }, [position]);

  useEffect(() => {
    if (linkMode) linkInput.current?.focus();
  }, [linkMode]);

  if (!position) return null;

  const selectedText = editor.state.doc.textBetween(
    editor.state.selection.from,
    editor.state.selection.to,
    " ",
  );

  const openLinkMode = () => {
    setLinkValue(editor.getAttributes("link").href ?? "");
    setLinkMode(true);
  };

  const applyLink = () => {
    const href = linkValue.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const normalized = /^(https?:|mailto:)/i.test(href) ? href : `https://${href}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
    }
    setLinkMode(false);
  };

  const marks = [
    { id: "bold", icon: Bold, label: "Bold", run: () => editor.chain().focus().toggleBold().run() },
    {
      id: "italic",
      icon: Italic,
      label: "Italic",
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      id: "underline",
      icon: UnderlineIcon,
      label: "Underline",
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      id: "strike",
      icon: Strikethrough,
      label: "Strikethrough",
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      id: "highlight",
      icon: Highlighter,
      label: "Highlight",
      run: () => editor.chain().focus().toggleHighlight().run(),
    },
  ];

  return createPortal(
    <div
      ref={menuRef}
      className="ns-no-print ns-fade fixed z-50 w-64 overflow-hidden rounded-sm border border-hairline bg-surface shadow-[0_20px_50px_-28px_rgb(0_0_0/0.45)]"
      style={{ top: position.top, left: position.left }}
      // Keeps the text selection alive while a menu button is pressed.
      onMouseDown={(event) => {
        if (!linkMode) event.preventDefault();
      }}
    >
      {linkMode ? (
        <div className="flex items-center gap-1.5 p-2">
          <input
            ref={linkInput}
            value={linkValue}
            onChange={(event) => setLinkValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setLinkMode(false);
              }
            }}
            placeholder="Paste or type a link"
            className="h-8 flex-1 rounded-xs border border-hairline bg-surface px-2 text-[13px] text-ink outline-none focus-visible:border-focus"
          />
          <button
            type="button"
            onClick={applyLink}
            aria-label="Apply link"
            className="flex size-8 items-center justify-center rounded-xs text-ink hover:bg-stone"
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setLinkMode(false)}
            aria-label="Cancel"
            className="flex size-8 items-center justify-center rounded-xs text-slate hover:bg-stone"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-0.5 border-b border-hairline p-1.5">
            {marks.map((mark) => (
              <button
                key={mark.id}
                type="button"
                aria-label={mark.label}
                aria-pressed={editor.isActive(mark.id)}
                onClick={mark.run}
                className={cn(
                  "flex size-8 items-center justify-center rounded-xs text-ink transition-colors hover:bg-stone",
                  editor.isActive(mark.id) && "bg-primary text-primary-ink hover:bg-primary/88",
                )}
              >
                <mark.icon className="size-4" />
              </button>
            ))}
            <button
              type="button"
              aria-label="Add link"
              onClick={openLinkMode}
              className={cn(
                "ml-auto flex size-8 items-center justify-center rounded-xs text-ink transition-colors hover:bg-stone",
                editor.isActive("link") && "bg-primary text-primary-ink hover:bg-primary/88",
              )}
            >
              <Link2 className="size-4" />
            </button>
          </div>

          <div className="p-1.5">
            <p className="ns-mono px-2 pt-1 pb-1.5 text-muted">Actions</p>
            <MenuAction
              icon={Copy}
              label="Copy the text"
              onClick={() => {
                void navigator.clipboard.writeText(selectedText);
                toast.success("Copied");
              }}
            />
            <MenuAction
              icon={Languages}
              label={`Search for “${selectedText.slice(0, 18)}${selectedText.length > 18 ? "…" : ""}”`}
              onClick={() =>
                window.open(
                  `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            />
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}

function MenuAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xs px-2 py-1.5 text-left text-[13px] text-ink transition-colors hover:bg-stone"
    >
      <Icon className="size-3.5 shrink-0 text-slate" />
      <span className="truncate">{label}</span>
    </button>
  );
}
