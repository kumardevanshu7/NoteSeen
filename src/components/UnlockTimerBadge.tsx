import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVault } from "@/store/vault";

interface UnlockTimerBadgeProps {
  onClick: () => void;
}

function formatRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

export function UnlockTimerBadge({ onClick }: UnlockTimerBadgeProps) {
  const editUnlockExpiresAt = useVault((state) => state.editUnlockExpiresAt);
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!editUnlockExpiresAt) return 0;
    return Math.max(0, Math.floor((editUnlockExpiresAt - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!editUnlockExpiresAt) {
      setSecondsLeft(0);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.floor((editUnlockExpiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [editUnlockExpiresAt]);

  if (!editUnlockExpiresAt || secondsLeft <= 0) {
    return null;
  }

  const isLow = secondsLeft <= 60;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={onClick}
          className={`h-8 gap-1.5 px-2.5 font-mono text-xs transition-colors ${
            isLow
              ? "border-error/40 text-error bg-error/10 hover:bg-error/20"
              : "border-focus/40 text-focus bg-focus/10 hover:bg-focus/20"
          }`}
          aria-label={`Edit timer active: ${formatRemaining(secondsLeft)} remaining`}
        >
          <Timer className={`size-3.5 ${isLow ? "animate-bounce" : "animate-pulse"}`} />
          <span>{formatRemaining(secondsLeft)}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Edit unlock timer active · {formatRemaining(secondsLeft)} left
        <span className="block text-[11px] opacity-75">Click to extend or lock</span>
      </TooltipContent>
    </Tooltip>
  );
}
