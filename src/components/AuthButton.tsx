import { LogOut } from "lucide-react";
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
import { PROFESSIONS } from "@/lib/profile";
import { useAuth } from "@/store/auth";

export function AuthButton() {
  const ready = useAuth((state) => state.ready);
  const user = useAuth((state) => state.user);
  const profile = useAuth((state) => state.profile);
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
        <span className="hidden sm:inline">Google</span>
      </Button>
    );
  }

  const label = profile?.fullName || user.displayName || user.email || "Account";
  const handle = profile?.username ? `@${profile.username}` : user.email;
  const professionLabel = profile
    ? PROFESSIONS.find((p) => p.id === profile.profession)?.label
    : null;

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
                <img
                  src={user.photoURL}
                  alt=""
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-[12px] font-medium text-ink">
                  {(profile?.fullName || user.displayName || user.email || "?")
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <span className="block truncate text-[13px] font-medium text-ink">{label}</span>
          {handle ? (
            <span className="mt-0.5 block truncate text-[12px] font-normal text-muted">
              {handle}
            </span>
          ) : null}
          {professionLabel ? (
            <span className="mt-0.5 block truncate text-[11px] font-normal text-muted">
              {professionLabel}
              {profile?.age ? ` · ${profile.age}` : ""}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
