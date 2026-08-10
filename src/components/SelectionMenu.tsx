import { useEffect, useRef, useState, type ComponentType } from "react";
import { BubbleMenu, type Editor } from "@tiptap/react";
import {
  Bold,
  Check,
  Copy,
  Highlighter,
  Italic,
  Languages,
  Link2,
  Sparkles,
  Strikethrough,
  Underline as UnderlineIcon,
  WandSparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useEditorTick } from "@/hooks/use-editor-tick";

const AI_ACTIONS = [
  { id: "grammar", label: "Fix grammar", icon: Check },
  { id: "positive", label: "Rewrite in a positive tone", icon: WandSparkles },
  { id: "punchy", label: "Make it punchier", icon: Sparkles },
  { id: "translate", label: "Translate it", icon: Languages },
];

function notifyAiPending(label: string) {
  toast(`${label} needs a model`, {
    description: "Add your AI credentials in the sync step and these rewrites turn on.",
  });
}

export function SelectionMenu({ editor }: { editor: Editor }) {
  useEditorTick(editor);
  const [linkMode, setLinkMode] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const linkInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (linkMode) linkInput.current?.focus();
  }, [linkMode]);

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

  return (
    <BubbleMenu
      editor={editor}
      updateDelay={80}
      tippyOptions={{ duration: 120, maxWidth: "none", placement: "bottom-start" }}
      shouldShow={({ editor: instance, from, to }) =>
        instance.isEditable && from !== to && !instance.isActive("codeBlock")
      }
    >
      <div className="w-64 overflow-hidden rounded-sm border border-hairline bg-surface shadow-[0_20px_50px_-28px_rgb(0_0_0/0.45)]">
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

            <div className="border-t border-hairline p-1.5">
              <p className="ns-mono flex items-center gap-2 px-2 pt-1 pb-1.5 text-muted">
                Rewrite
                <span className="rounded-full border border-coral-soft px-1.5 py-px text-[9px] tracking-[0.12em] text-coral">
                  AI
                </span>
              </p>
              {AI_ACTIONS.map((action) => (
                <MenuAction
                  key={action.id}
                  icon={action.icon}
                  label={action.label}
                  muted
                  onClick={() => notifyAiPending(action.label)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </BubbleMenu>
  );
}

function MenuAction({
  icon: Icon,
  label,
  onClick,
  muted = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xs px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-stone",
        muted ? "text-body-muted" : "text-ink",
      )}
    >
      <Icon className="size-3.5 shrink-0 text-slate" />
      <span className="truncate">{label}</span>
    </button>
  );
}
