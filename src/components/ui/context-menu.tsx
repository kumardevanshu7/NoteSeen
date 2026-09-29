import type * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  menuContentClass,
  menuDestructiveClass,
  menuItemBaseClass,
  menuLabelClass,
  menuSeparatorClass,
  menuShortcutClass,
  menuSubContentClass,
  menuSubTriggerClass,
} from "./menu-styles";

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuGroup = ContextMenuPrimitive.Group;
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;
const ContextMenuSub = ContextMenuPrimitive.Sub;

function ContextMenuContent({
  className,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        collisionPadding={collisionPadding}
        className={cn(menuContentClass, className)}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export interface ContextMenuItemProps
  extends React.ComponentProps<typeof ContextMenuPrimitive.Item> {
  destructive?: boolean;
}

function ContextMenuItem({
  className,
  destructive = false,
  ...props
}: ContextMenuItemProps) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(menuItemBaseClass, destructive && menuDestructiveClass, className)}
      {...props}
    />
  );
}

function ContextMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem className={cn(menuItemBaseClass, "pl-8", className)} {...props}>
      <span className="absolute left-2.5 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Check className="size-3.5" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem className={cn(menuItemBaseClass, "pl-8", className)} {...props}>
      <span className="absolute left-2.5 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Circle className="size-2 fill-ink text-ink" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

function ContextMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label>) {
  return (
    <ContextMenuPrimitive.Label
      className={cn(menuLabelClass, className)}
      {...props}
    />
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      className={cn(menuSeparatorClass, className)}
      {...props}
    />
  );
}

function ContextMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(menuShortcutClass, className)}
      {...props}
    />
  );
}

function ContextMenuSubTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger>) {
  return (
    <ContextMenuPrimitive.SubTrigger
      className={cn(menuItemBaseClass, menuSubTriggerClass, className)}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto size-3.5" />
    </ContextMenuPrimitive.SubTrigger>
  );
}

function ContextMenuSubContent({
  className,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent
        collisionPadding={collisionPadding}
        className={cn(menuSubContentClass, className)}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
