import type * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-slate/35 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ring-offset-canvas",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:bg-stone/90 dark:data-[state=unchecked]:bg-stone",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-3.5 rounded-full bg-surface shadow-xs transition-transform",
          "data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-[2px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
