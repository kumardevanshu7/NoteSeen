import { type ComponentProps, type ComponentType, type ReactNode } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Check,
  ChevronsUpDown,
  Code2,
  FileCode2,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Smile,
  Strikethrough,
  Type,
  Underline as UnderlineIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditorTick } from "@/hooks/use-editor-tick";
import { useEditorStore } from "@/store/editor";
import { useNotes } from "@/store/notes";
import { CODE_LANGUAGES, LINE_SPACINGS, NOTE_THEMES, TEXT_SIZES, TYPEFACES } from "@/lib/note-themes";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMOJI = [
  "✅",
  "⭐",
  "🔥",
  "💡",
  "📌",
  "🗓️",
  "⏰",
  "🎯",
  "🚀",
  "🧠",
  "📝",
  "❗",
  "❓",
  "😀",
  "😅",
  "🙌",
  "🤝",
  "☕",
  "🎉",
  "💰",
  "📈",
  "🐛",
  "🔒",
  "♻️",
];

const NOTE_CODE_LANGS = CODE_LANGUAGES.filter((lang) => lang.id !== "txt");

export function ToolRail({ note }: { note: Note }) {
  const editor = useEditorStore((state) => state.editor);
  useEditorTick(editor);
  const patchNote = useNotes((state) => state.patchNote);

  const typeface = TYPEFACES.find((option) => option.id === note.typeface) ?? TYPEFACES[0];
  const activeCodeLang =
    (editor?.isActive("codeBlock") && (editor.getAttributes("codeBlock").language as string | undefined)) ||
    null;

  const alignments = [
    { id: "left", icon: AlignLeft, label: "Left" },
    { id: "center", icon: AlignCenter, label: "Center" },
    { id: "right", icon: AlignRight, label: "Right" },
    { id: "justify", icon: AlignJustify, label: "Justify" },
  ];

  const applyCodeLanguage = (language: string) => {
    if (!editor) return;
    if (editor.isActive("codeBlock")) {
      editor.chain().focus().updateAttributes("codeBlock", { language }).run();
      return;
    }
    editor.chain().focus().toggleCodeBlock({ language }).run();
  };

  return (
    <aside className="ns-scroll ns-no-print hidden w-72 shrink-0 overflow-y-auto border-l border-hairline bg-canvas px-5 py-6 xl:block">
      <Section title="Theme style">
        <div className="flex flex-wrap gap-2.5">
          {NOTE_THEMES.map((theme) => {
            const active = note.theme === theme.id;
            return (
              <Tooltip key={theme.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={theme.label}
                    aria-pressed={active}
                    onClick={() => patchNote(note.id, { theme: theme.id }, { touch: false })}
                    style={{ background: theme.wash, borderColor: theme.line, color: theme.ink }}
                    className={cn(
                      "relative flex size-11 items-center justify-center rounded-sm border text-[15px] transition-transform",
                      active ? "ring-2 ring-primary ring-offset-2 ring-offset-canvas" : "hover:-translate-y-0.5",
                    )}
                  >
                    <span className="font-medium">Aa</span>
                    {active ? (
                      <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-ink">
                        <Check className="size-2.5" />
                      </span>
                    ) : null}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{theme.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </Section>

      <Section title="Text editor">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full rounded-md border border-card-border bg-surface p-4 text-left transition-colors hover:bg-stone"
            >
              <span className="ns-card-heading block text-ink underline decoration-hairline decoration-1 underline-offset-4">
                Aa
              </span>
              <span className="ns-micro mt-6 block text-slate">Customize font</span>
              <span className="mt-1 flex items-center justify-between text-[13px] text-ink">
                {typeface.label}
                <ChevronsUpDown className="size-3.5 text-muted" />
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 min-w-56 overflow-y-auto">
            <DropdownMenuLabel>Typeface</DropdownMenuLabel>
            {TYPEFACES.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onSelect={() => patchNote(note.id, { typeface: option.id }, { touch: false })}
              >
                <span className="flex-1">{option.label}</span>
                <span className="ns-micro text-muted">{option.hint}</span>
                {note.typeface === option.id ? <Check className="size-3.5" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mt-4 grid grid-cols-4 gap-x-2 gap-y-4">
          <ToolTile
            icon={Bold}
            label="Bold"
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <ToolTile
            icon={Italic}
            label="Italic"
            active={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <ToolTile
            icon={UnderlineIcon}
            label="Underline"
            active={editor?.isActive("underline")}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          />
          <ToolTile
            icon={Strikethrough}
            label="Strike"
            active={editor?.isActive("strike")}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ToolTile icon={Type} label="Size" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>Text size</DropdownMenuLabel>
              {TEXT_SIZES.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onSelect={() => patchNote(note.id, { size: option.id }, { touch: false })}
                >
                  <span className="flex-1">{option.label}</span>
                  {note.size === option.id ? <Check className="size-3.5" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ToolTile icon={Baseline} label="Spacing" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>Line spacing</DropdownMenuLabel>
              {LINE_SPACINGS.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onSelect={() => patchNote(note.id, { spacing: option.id }, { touch: false })}
                >
                  <span className="flex-1">{option.label}</span>
                  {note.spacing === option.id ? <Check className="size-3.5" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ToolTile icon={AlignLeft} label="Align" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>Alignment</DropdownMenuLabel>
              {alignments.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onSelect={() => editor?.chain().focus().setTextAlign(option.id).run()}
                >
                  <option.icon className="size-3.5" />
                  <span className="flex-1">{option.label}</span>
                  {editor?.isActive({ textAlign: option.id }) ? <Check className="size-3.5" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <ToolTile
            icon={Heading2}
            label="Heading"
            active={editor?.isActive("heading", { level: 2 })}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          />
        </div>
      </Section>

      <Section title="Others">
        <div className="grid grid-cols-4 gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <BlockTile
                icon={FileCode2}
                label={activeCodeLang ? activeCodeLang.slice(0, 6) : "Code lang"}
                active={Boolean(activeCodeLang)}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 min-w-52 overflow-y-auto">
              <DropdownMenuLabel>Code language</DropdownMenuLabel>
              {NOTE_CODE_LANGS.map((lang) => (
                <DropdownMenuItem key={lang.id} onSelect={() => applyCodeLanguage(lang.id)}>
                  <span className="flex-1">{lang.label}</span>
                  {activeCodeLang === lang.id ? <Check className="size-3.5" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <BlockTile
            icon={Link2}
            label="Link"
            onClick={() => {
              if (!editor) return;
              if (editor.state.selection.empty) {
                toast("Select some text first", {
                  description: "Highlight the words you want to turn into a link.",
                });
                return;
              }
              const href = window.prompt("Link URL");
              if (!href) return;
              const normalized = /^(https?:|mailto:)/i.test(href) ? href : `https://${href}`;
              editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
            }}
          />
          <BlockTile
            icon={List}
            label="Bullets"
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
          <Popover>
            <PopoverTrigger asChild>
              <BlockTile icon={Smile} label="Emoji" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              <p className="ns-mono mb-2 text-muted">Insert</p>
              <div className="grid grid-cols-6 gap-1">
                {EMOJI.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => editor?.chain().focus().insertContent(emoji).run()}
                    className="flex size-8 items-center justify-center rounded-xs text-base hover:bg-stone"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <BlockTile
            icon={ListOrdered}
            label="Numbered"
            active={editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          />
          <BlockTile
            icon={ListTodo}
            label="Checklist"
            active={editor?.isActive("taskList")}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
          />
          <BlockTile
            icon={Quote}
            label="Quote"
            active={editor?.isActive("blockquote")}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          />
          <BlockTile
            icon={Code2}
            label="Code"
            active={editor?.isActive("codeBlock")}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          />
        </div>
        <p className="ns-micro mt-3 text-muted">Images are off for now — text and code only.</p>
      </Section>

      <p className="ns-micro mt-8 flex items-center gap-2 text-muted">
        <img src="/android-chrome-192x192.png" alt="" className="size-4 rounded-xs" />
        Arigato Labs
      </p>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-dashed border-hairline pb-6 last:border-b-0 [&+&]:pt-6">
      <h2 className="ns-caption mb-3.5 text-ink">{title}</h2>
      {children}
    </section>
  );
}

interface TileProps extends Omit<ComponentProps<"button">, "children"> {
  icon: ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}

function ToolTile({ icon: Icon, label, active, className, ...props }: TileProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={cn("group flex flex-col items-center gap-1.5", className)}
      {...props}
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-full border border-card-border bg-surface text-ink transition-colors group-hover:bg-stone",
          active && "border-primary bg-primary text-primary-ink group-hover:bg-primary/88",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="ns-micro text-slate">{label}</span>
    </button>
  );
}

function BlockTile({ icon: Icon, label, active, className, ...props }: TileProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-md border border-card-border bg-surface px-1.5 py-2.5 text-ink transition-colors hover:bg-stone",
        active && "border-primary bg-primary text-primary-ink hover:bg-primary/88",
        className,
      )}
      {...props}
    >
      <Icon className="size-4 shrink-0" />
      <span
        className={cn(
          "ns-micro max-w-full px-0.5 text-center leading-tight break-words",
          active ? "text-primary-ink" : "text-slate",
        )}
      >
        {label}
      </span>
    </button>
  );
}
