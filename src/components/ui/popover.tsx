import type * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;
const PopoverClose = PopoverPrimitive.Close;

function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          "ns-pop ns-scroll z-50 w-72 max-h-[var(--radix-popover-content-available-height,80vh)] overflow-y-auto rounded-sm border border-hairline bg-surface p-3 text-ink outline-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ring-offset-surface",
          "shadow-[0_18px_50px_-30px_rgb(0_0_0/0.4)]",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverAnchor, PopoverClose, PopoverContent, PopoverTrigger };
