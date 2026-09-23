import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fillColumnWithBadge,
  type BadgeColor,
  type BadgeChoice,
} from "@/lib/table-badge";
import { Check, Sparkles } from "lucide-react";

interface TableBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor;
}

const COLOR_OPTIONS: { label: string; value: BadgeColor; bg: string; text: string; border: string }[] = [
  { label: "Green", value: "green", bg: "rgba(16, 185, 129, 0.16)", text: "#10b981", border: "rgba(16, 185, 129, 0.38)" },
  { label: "Red", value: "red", bg: "rgba(244, 63, 94, 0.16)", text: "#f43f5e", border: "rgba(244, 63, 94, 0.38)" },
  { label: "Blue", value: "blue", bg: "rgba(59, 130, 246, 0.16)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.38)" },
  { label: "Amber", value: "amber", bg: "rgba(245, 158, 11, 0.16)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.38)" },
  { label: "Purple", value: "purple", bg: "rgba(139, 92, 246, 0.16)", text: "#8b5cf6", border: "rgba(139, 92, 246, 0.38)" },
  { label: "Gray", value: "gray", bg: "rgba(156, 163, 175, 0.16)", text: "#9ca3af", border: "rgba(156, 163, 175, 0.38)" },
];

export function TableBadgeDialog({ open, onOpenChange, editor }: TableBadgeDialogProps) {
  const [choices, setChoices] = useState<BadgeChoice[]>([
    { label: "Yes", color: "green" },
    { label: "No", color: "red" },
    { label: "(No Chance)", color: "amber" },
  ]);
  const [applyToColumn, setApplyToColumn] = useState(true);

  const setChoiceCount = (count: number) => {
    if (count < 2 || count > 5) return;
    if (count > choices.length) {
      const defaultColors: BadgeColor[] = ["blue", "purple", "gray"];
      const newItems: BadgeChoice[] = [];
      for (let i = choices.length; i < count; i++) {
        newItems.push({
          label: `Option ${i + 1}`,
          color: defaultColors[(i - choices.length) % defaultColors.length],
        });
      }
      setChoices([...choices, ...newItems]);
    } else {
      setChoices(choices.slice(0, count));
    }
  };

  const updateLabel = (index: number, val: string) => {
    const updated = [...choices];
    updated[index] = { ...updated[index], label: val };
    setChoices(updated);
  };

  const updateColor = (index: number, color: BadgeColor) => {
    const updated = [...choices];
    updated[index] = { ...updated[index], color };
    setChoices(updated);
  };

  const applyPreset = (preset: "yesno" | "yesno_chance" | "todo" | "priority") => {
    switch (preset) {
      case "yesno":
        setChoices([
          { label: "Yes", color: "green" },
          { label: "No", color: "red" },
        ]);
        break;
      case "yesno_chance":
        setChoices([
          { label: "Yes", color: "green" },
          { label: "No", color: "red" },
          { label: "(No Chance)", color: "amber" },
        ]);
        break;
      case "todo":
        setChoices([
          { label: "To Do", color: "gray" },
          { label: "In Progress", color: "blue" },
          { label: "Done", color: "green" },
        ]);
        break;
      case "priority":
        setChoices([
          { label: "Low", color: "blue" },
          { label: "Medium", color: "amber" },
          { label: "High", color: "red" },
        ]);
        break;
    }
  };

  const handleApply = () => {
    if (choices.length === 0) return;
    const first = choices[0];
    const optionsJson = JSON.stringify(choices);

    if (applyToColumn) {
      fillColumnWithBadge(
        editor,
        {
          value: first.label,
          variant:
            first.label.toLowerCase() === "no"
              ? "no"
              : first.label.toLowerCase() === "yes"
              ? "yes"
              : "custom",
          color: first.color || "green",
          options: optionsJson,
        },
        true,
      );
    } else {
      editor
        .chain()
        .focus()
        .insertTableBadge({
          value: first.label,
          variant:
            first.label.toLowerCase() === "no"
              ? "no"
              : first.label.toLowerCase() === "yes"
              ? "yes"
              : "custom",
          color: first.color || "green",
          options: optionsJson,
        })
        .run();
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="size-4 text-emerald-500" />
            Custom Table Options & Badges
          </DialogTitle>
          <p className="text-xs text-muted">
            Configure 2 to 5 selectable options. Click any badge in the table to cycle through choices!
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick Presets */}
          <div>
            <span className="text-[11.5px] font-medium text-slate uppercase tracking-wide">
              Quick presets
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset("yesno")}
                className="rounded-full border border-hairline bg-surface px-2.5 py-0.5 text-xs text-ink transition-colors hover:bg-stone"
              >
                Yes / No
              </button>
              <button
                type="button"
                onClick={() => applyPreset("yesno_chance")}
                className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500 transition-colors hover:bg-emerald-500/20"
              >
                Yes / No / (No Chance)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("todo")}
                className="rounded-full border border-hairline bg-surface px-2.5 py-0.5 text-xs text-ink transition-colors hover:bg-stone"
              >
                To Do / In Progress / Done
              </button>
              <button
                type="button"
                onClick={() => applyPreset("priority")}
                className="rounded-full border border-hairline bg-surface px-2.5 py-0.5 text-xs text-ink transition-colors hover:bg-stone"
              >
                Low / Med / High
              </button>
            </div>
          </div>

          {/* Number of choices count */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-medium text-slate uppercase tracking-wide">
                Number of Choices (2 to 5)
              </span>
              <div className="flex items-center gap-1 rounded-md border border-hairline bg-stone/50 p-0.5">
                {[2, 3, 4, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setChoiceCount(cnt)}
                    className={`size-6 rounded text-xs font-semibold transition-all ${
                      choices.length === cnt
                        ? "bg-accent text-white shadow-xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Choices list */}
          <div className="space-y-2">
            <span className="text-[11.5px] font-medium text-slate uppercase tracking-wide">
              Choices & Colors
            </span>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {choices.map((choice, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-hairline/80 bg-stone/30 p-2"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-stone text-[11px] font-bold text-muted">
                    {idx + 1}
                  </span>
                  <Input
                    value={choice.label}
                    onChange={(e) => updateLabel(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="h-8 flex-1 text-xs"
                  />
                  <div className="flex items-center gap-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => updateColor(idx, c.value)}
                        title={c.label}
                        className="relative flex size-5 items-center justify-center rounded-full transition-transform hover:scale-115"
                        style={{
                          backgroundColor: c.bg,
                          border: `1.5px solid ${c.border}`,
                        }}
                      >
                        {choice.color === c.value && (
                          <Check className="size-3" style={{ color: c.text }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div className="rounded-lg border border-hairline/80 bg-surface/50 p-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Live Preview
            </span>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {choices.map((choice, idx) => {
                const colorDef =
                  COLOR_OPTIONS.find((c) => c.value === choice.color) || COLOR_OPTIONS[0];
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-xs"
                    style={{
                      backgroundColor: colorDef.bg,
                      color: colorDef.text,
                      border: `1px solid ${colorDef.border}`,
                    }}
                  >
                    {choice.color === "green" || choice.label.toLowerCase() === "yes" ? "✓ " : ""}
                    {choice.color === "red" || choice.label.toLowerCase() === "no" ? "✕ " : ""}
                    {choice.label || `Option ${idx + 1}`}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Scope Checkbox */}
          <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-ink">
            <input
              type="checkbox"
              checked={applyToColumn}
              onChange={(e) => setApplyToColumn(e.target.checked)}
              className="size-4 rounded accent-emerald-500"
            />
            <span>Apply to all rows in this column (keeps header title intact)</span>
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply} className="bg-emerald-600 text-white hover:bg-emerald-500">
            Apply Badges
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
