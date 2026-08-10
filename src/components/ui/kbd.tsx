import type * as React from "react";
import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-hairline bg-sunken px-1.5",
        "font-mono text-[10px] tracking-wide text-slate",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
