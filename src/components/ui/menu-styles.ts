export const menuItemBaseClass =
  "relative flex cursor-pointer select-none items-center gap-2.5 rounded-xs px-2.5 py-2 text-[13px] text-ink outline-none transition-colors " +
  "focus:bg-stone focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus " +
  "data-[highlighted]:bg-stone data-[disabled]:pointer-events-none data-[disabled]:opacity-45 " +
  "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-slate";

export const menuDestructiveClass =
  "text-error focus:text-error focus:bg-error/10 data-[highlighted]:bg-error/10 data-[highlighted]:text-error [&_svg]:text-error";

export const menuSubTriggerClass =
  "data-[state=open]:bg-stone data-[state=open]:text-ink";

export const menuContentClass =
  "ns-pop ns-scroll z-50 min-w-52 max-h-[var(--radix-dropdown-menu-content-available-height,80vh)] " +
  "overflow-y-auto overflow-x-hidden rounded-sm border border-hairline bg-surface p-1.5 " +
  "shadow-[0_14px_40px_-24px_rgb(0_0_0/0.35)]";

export const menuSubContentClass =
  "ns-pop ns-scroll z-50 min-w-44 max-h-[var(--radix-dropdown-menu-content-available-height,80vh)] " +
  "overflow-y-auto overflow-x-hidden rounded-sm border border-hairline bg-surface p-1.5 " +
  "shadow-[0_14px_40px_-24px_rgb(0_0_0/0.35)]";

export const menuLabelClass = "ns-mono px-2.5 pt-2 pb-1.5 text-muted";

export const menuSeparatorClass = "-mx-1.5 my-1.5 h-px bg-hairline";

export const menuShortcutClass = "ml-auto font-mono text-[11px] tracking-wide text-muted";
