import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

function TooltipProvider({
  delayDuration = 240,
  skipDelayDuration = 80,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  );
}

const Tooltip = TooltipPrimitive.Root;

function TooltipTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  // If child is a disabled element, wrap with an accessible span so hover/focus still triggers tooltip
  if (
    asChild &&
    React.isValidElement(children) &&
    Boolean((children.props as { disabled?: boolean })?.disabled)
  ) {
    return (
      <TooltipPrimitive.Trigger asChild {...props}>
        <span className="inline-flex cursor-not-allowed" tabIndex={0} aria-disabled="true">
          {children}
        </span>
      </TooltipPrimitive.Trigger>
    );
  }

  return (
    <TooltipPrimitive.Trigger asChild={asChild} {...props}>
      {children}
    </TooltipPrimitive.Trigger>
  );
}

function TooltipContent({
  className,
  sideOffset = 8,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "ns-fade z-[60] max-w-64 rounded-xs bg-primary px-2.5 py-1.5 text-xs text-primary-ink shadow-md",
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
