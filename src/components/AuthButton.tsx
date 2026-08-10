import { Cloud, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/store/auth";

export function AuthButton() {
  const ready = useAuth((state) => state.ready);
  const user = useAuth((state) => state.user);
  const syncing = useAuth((state) => state.syncing);
  const signInWithGoogle = useAuth((state) => state.signInWithGoogle);
  const signOut = useAuth((state) => state.signOut);

  if (!ready) {
    return <div className="size-8 rounded-full border border-hairline bg-stone" aria-hidden />;
  }

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 rounded-full"
        onClick={() => void signInWithGoogle()}
      >
        <LogIn className="size-3.5" />
        <span className="hidden sm:inline">Google</span>
      </Button>
    );
  }

  const label = user.displayName || user.email || "Account";

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={label}
              className="relative flex size-8 items-center justify-center overflow-hidden rounded-full border border-hairline bg-stone"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-[12px] font-medium text-ink">
                  {(user.displayName || user.email || "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              {syncing ? (
                <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-canvas bg-action" />
              ) : (
                <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-canvas bg-deep-green" />
              )}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{syncing ? "Syncing…" : "Signed in with Google"}</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <span className="block truncate text-[13px] font-medium text-ink">{label}</span>
          {user.email ? (
            <span className="mt-0.5 block truncate text-[12px] font-normal text-muted">
              {user.email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Cloud />
          {syncing ? "Syncing to Firestore…" : "Cloud sync on"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
