import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type SlashCategory,
  type SlashCommandItem,
  type SlashMenuState,
  getSlashMenuState,
  subscribeSlashMenu,
  updateSlashMenuState,
} from "@/lib/slash-commands";
import { cn } from "@/lib/utils";

const MENU_WIDTH = 320;
const MENU_MAX_HEIGHT = 380;
const MARGIN = 12;

const CATEGORY_ORDER: SlashCategory[] = [
  "Basic blocks",
  "Lists & Tasks",
  "Advanced & Media",
];

export function SlashCommandMenu() {
  const [state, setState] = useState<SlashMenuState>(getSlashMenuState);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    return subscribeSlashMenu(setState);
  }, []);

  // Compute position relative to cursor/selection rect
  useLayoutEffect(() => {
    if (!state.isOpen || !state.rect) {
      setCoords(null);
      return;
    }

    const { rect } = state;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = rect.left;
    if (left + MENU_WIDTH > viewportWidth - MARGIN) {
      left = viewportWidth - MENU_WIDTH - MARGIN;
    }
    if (left < MARGIN) {
      left = MARGIN;
    }

    let top = rect.bottom + 6;
    // If overflowing viewport bottom, position above cursor
    if (top + MENU_MAX_HEIGHT > viewportHeight - MARGIN) {
      const topAbove = rect.top - MENU_MAX_HEIGHT - 6;
      top = Math.max(MARGIN, topAbove);
    }

    setCoords({ top, left });
  }, [state.isOpen, state.rect]);

  // Keep active item scrolled into view when using arrow keys
  useEffect(() => {
    if (!state.isOpen) return;
    const activeEl = itemRefs.current[state.selectedIndex];
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [state.isOpen, state.selectedIndex]);

  // Click outside to dismiss
  useEffect(() => {
    if (!state.isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        updateSlashMenuState({ isOpen: false });
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [state.isOpen]);

  if (!state.isOpen || !coords) return null;

  // Flatten items while tracking overall index for keyboard navigation
  const grouped: { category: SlashCategory; items: { item: SlashCommandItem; globalIndex: number }[] }[] = [];
  let indexCounter = 0;

  for (const cat of CATEGORY_ORDER) {
    const catItems = state.items.filter((item) => item.category === cat);
    if (catItems.length > 0) {
      grouped.push({
        category: cat,
        items: catItems.map((item) => ({
          item,
          globalIndex: indexCounter++,
        })),
      });
    }
  }

  itemRefs.current = itemRefs.current.slice(0, state.items.length);

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: MENU_WIDTH,
        maxHeight: MENU_MAX_HEIGHT,
        zIndex: 9999,
      }}
      className="ns-scroll flex flex-col overflow-hidden rounded-xl border border-hairline/80 bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="border-b border-hairline/60 bg-stone/40 px-3.5 py-2">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span className="font-medium tracking-wide text-slate uppercase">Commands</span>
          {state.query ? (
            <span className="truncate max-w-[120px] text-accent">/{state.query}</span>
          ) : (
            <span className="text-[10px] text-muted/70">ESC to close</span>
          )}
        </div>
      </div>

      <div className="ns-scroll flex-1 overflow-y-auto p-1.5">
        {state.items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[13px] font-medium text-ink">No commands found</p>
            <p className="ns-micro mt-1 text-muted">Try typing a block name like &quot;h1&quot; or &quot;table&quot;</p>
          </div>
        ) : (
          grouped.map(({ category, items }) => (
            <div key={category} className="mb-2 last:mb-0">
              <div className="px-2.5 pt-1.5 pb-1 text-[10.5px] font-semibold tracking-wider text-muted/80 uppercase">
                {category}
              </div>
              <div className="space-y-0.5">
                {items.map(({ item, globalIndex }) => {
                  const isSelected = globalIndex === state.selectedIndex;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      ref={(el) => {
                        itemRefs.current[globalIndex] = el;
                      }}
                      type="button"
                      onMouseEnter={() => updateSlashMenuState({ selectedIndex: globalIndex })}
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        if (state.command) {
                          state.command(item);
                          updateSlashMenuState({ isOpen: false });
                        }
                      }}
                      className={cn(
                        "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors",
                        isSelected
                          ? "bg-stone text-ink ring-1 ring-hairline"
                          : "text-slate hover:bg-stone/60 hover:text-ink",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-md border border-hairline/80 bg-surface/90 text-slate shadow-xs transition-colors",
                          isSelected && "border-primary/40 bg-primary/10 text-primary",
                        )}
                      >
                        <Icon className="size-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={cn(
                              "truncate text-[13px] font-medium",
                              isSelected ? "text-ink" : "text-ink/90",
                            )}
                          >
                            {item.title}
                          </span>
                          {item.shortcut ? (
                            <span className="ns-mono shrink-0 rounded border border-hairline/60 bg-surface/80 px-1.5 py-0.2 text-[10px] text-muted">
                              {item.shortcut}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-[11px] text-muted/90 leading-tight">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>,
    document.body,
  );
}
