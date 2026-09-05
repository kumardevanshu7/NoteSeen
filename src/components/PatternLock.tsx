import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Play, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PatternLockProps {
  /** Array of dot indices (0-8) representing the pattern path. */
  value: number[];
  /** Callback when pattern changes (in record/interactive mode). */
  onChange?: (path: number[]) => void;
  /** Whether the component allows drawing/editing ("record") or only viewing ("view"). */
  mode?: "record" | "view";
  /** Optional container className */
  className?: string;
  /** Width / height of the grid in pixels (default: 280) */
  size?: number;
}

// 3x3 Coordinates in a 300x300 SVG viewbox
const DOT_COORDS = [
  { x: 50, y: 50, label: "Top-Left", num: 1 },
  { x: 150, y: 50, label: "Top-Center", num: 2 },
  { x: 250, y: 50, label: "Top-Right", num: 3 },
  { x: 50, y: 150, label: "Mid-Left", num: 4 },
  { x: 150, y: 150, label: "Center", num: 5 },
  { x: 250, y: 150, label: "Mid-Right", num: 6 },
  { x: 50, y: 250, label: "Bottom-Left", num: 7 },
  { x: 150, y: 250, label: "Bottom-Center", num: 8 },
  { x: 250, y: 250, label: "Bottom-Right", num: 9 },
];

export function PatternLock({
  value,
  onChange,
  mode = "view",
  className,
  size = 280,
}: PatternLockProps) {
  const isRecord = mode === "record";
  const [currentPath, setCurrentPath] = useState<number[]>(value || []);
  const [isDragging, setIsDragging] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Animation playback states for viewer
  const [animating, setAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(0); // 0 to (path.length - 1)
  const animRef = useRef<number | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Sync external value
  useEffect(() => {
    setCurrentPath(value || []);
  }, [value]);

  const updatePath = useCallback(
    (newPath: number[]) => {
      setCurrentPath(newPath);
      onChange?.(newPath);
    },
    [onChange],
  );

  // Convert client pointer coordinates to SVG coordinate space
  const getSvgPoint = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 300 / rect.width;
    const scaleY = 300 / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // Find dot near coordinate (within hit radius)
  const findDotAt = useCallback((x: number, y: number, radius = 34) => {
    for (let i = 0; i < DOT_COORDS.length; i++) {
      const dot = DOT_COORDS[i];
      const dx = dot.x - x;
      const dy = dot.y - y;
      if (Math.hypot(dx, dy) <= radius) {
        return i;
      }
    }
    return null;
  }, []);

  // Pointer event handlers for drawing pattern
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isRecord) return;
    const pt = getSvgPoint(e);
    if (!pt) return;

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const hit = findDotAt(pt.x, pt.y);
    if (hit !== null) {
      setIsDragging(true);
      setCursorPos(pt);
      updatePath([hit]);
    } else {
      setCursorPos(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isRecord || !isDragging) return;
    const pt = getSvgPoint(e);
    if (!pt) return;

    setCursorPos(pt);
    const hit = findDotAt(pt.x, pt.y);
    if (hit !== null && !currentPath.includes(hit)) {
      updatePath([...currentPath, hit]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isRecord) return;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);
    setCursorPos(null);
  };

  // Alternative: click / tap individual dots to construct or toggle
  const handleDotClick = (index: number) => {
    if (!isRecord || isDragging) return;
    if (currentPath.includes(index)) {
      // If clicking the last dot in sequence, remove it (undo)
      if (currentPath[currentPath.length - 1] === index) {
        updatePath(currentPath.slice(0, -1));
      }
    } else {
      updatePath([...currentPath, index]);
    }
  };

  const handleUndo = () => {
    if (currentPath.length === 0) return;
    updatePath(currentPath.slice(0, -1));
  };

  const handleClear = () => {
    updatePath([]);
    setCursorPos(null);
  };

  // Play gesture animation
  const replayAnimation = useCallback(() => {
    if (currentPath.length < 2) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    setAnimating(true);
    setAnimProgress(0);

    const startTime = performance.now();
    const durationPerSegment = 450; // ms per dot transition
    const totalDuration = (currentPath.length - 1) * durationPerSegment;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      const segmentIndex = progress * (currentPath.length - 1);
      setAnimProgress(segmentIndex);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        // Hold briefly at end, then finish
        setTimeout(() => {
          setAnimating(false);
          setAnimProgress(0);
        }, 500);
      }
    };

    animRef.current = requestAnimationFrame(tick);
  }, [currentPath]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Compute animated cursor coordinates during playback
  const animatedCursor = React.useMemo(() => {
    if (!animating || currentPath.length < 2) return null;
    const seg = Math.floor(animProgress);
    const subProgress = animProgress - seg;
    const fromIdx = currentPath[Math.min(seg, currentPath.length - 1)];
    const toIdx = currentPath[Math.min(seg + 1, currentPath.length - 1)];
    if (fromIdx === undefined || toIdx === undefined) return null;

    const from = DOT_COORDS[fromIdx];
    const to = DOT_COORDS[toIdx];
    return {
      x: from.x + (to.x - from.x) * subProgress,
      y: from.y + (to.y - from.y) * subProgress,
      fromIdx,
      toIdx,
    };
  }, [animating, animProgress, currentPath]);

  // Calculate arrow midpoints & angles between consecutive dots
  const pathSegments = React.useMemo(() => {
    const segments: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      midX: number;
      midY: number;
      angle: number;
      from: number;
      to: number;
      index: number;
    }> = [];

    for (let i = 0; i < currentPath.length - 1; i++) {
      const from = currentPath[i];
      const to = currentPath[i + 1];
      const c1 = DOT_COORDS[from];
      const c2 = DOT_COORDS[to];
      const angle = (Math.atan2(c2.y - c1.y, c2.x - c1.x) * 180) / Math.PI;

      // Position arrow at 62% along the segment so it's clearly visible
      const arrowRatio = 0.62;
      const midX = c1.x + (c2.x - c1.x) * arrowRatio;
      const midY = c1.y + (c2.y - c1.y) * arrowRatio;

      segments.push({
        x1: c1.x,
        y1: c1.y,
        x2: c2.x,
        y2: c2.y,
        midX,
        midY,
        angle,
        from,
        to,
        index: i,
      });
    }

    return segments;
  }, [currentPath]);

  const startDot = currentPath.length > 0 ? currentPath[0] : null;
  const endDot = currentPath.length > 1 ? currentPath[currentPath.length - 1] : null;

  return (
    <div className={cn("flex flex-col items-center select-none", className)}>
      {/* SVG 3x3 Canvas */}
      <div
        className="relative flex items-center justify-center rounded-xl border border-hairline/70 bg-stone/25 p-3 shadow-inner"
        style={{ width: size + 24, height: size + 24 }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 300 300"
          className="h-full w-full touch-none overflow-visible cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <defs>
            {/* Soft glow filter for active path & animating cursor */}
            <filter id="pattern-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid background dots / hit targets */}
          {DOT_COORDS.map((dot, idx) => {
            const isVisited = currentPath.includes(idx);
            const stepOrder = currentPath.indexOf(idx);
            const isStart = startDot === idx;
            const isEnd = endDot === idx;

            return (
              <g
                key={idx}
                className="cursor-pointer transition-transform"
                onClick={() => handleDotClick(idx)}
              >
                {/* Generous invisible hit zone */}
                <circle cx={dot.x} cy={dot.y} r="34" fill="transparent" />

                {/* Outer ring */}
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r={isVisited ? 18 : 12}
                  className={cn(
                    "transition-all duration-200",
                    isStart
                      ? "stroke-emerald-500 fill-emerald-500/15 stroke-[2.5]"
                      : isEnd
                        ? "stroke-blue-500 fill-blue-500/15 stroke-[2.5]"
                        : isVisited
                          ? "stroke-primary fill-primary/10 stroke-2"
                          : "stroke-hairline/80 fill-stone/40 stroke-1 hover:stroke-slate/50",
                  )}
                />

                {/* Center dot */}
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r={isStart || isEnd ? 6.5 : isVisited ? 5.5 : 4}
                  className={cn(
                    "transition-all duration-200",
                    isStart
                      ? "fill-emerald-500"
                      : isEnd
                        ? "fill-blue-500"
                        : isVisited
                          ? "fill-primary"
                          : "fill-muted/60",
                  )}
                />

                {/* Pulsing halo on start dot */}
                {isStart && (
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r="23"
                    className="animate-ping stroke-emerald-500/50 stroke-1 fill-none opacity-40 pointer-events-none"
                  />
                )}

                {/* Step number badge on visited dots */}
                {isVisited && (
                  <g pointerEvents="none">
                    <rect
                      x={dot.x + 10}
                      y={dot.y - 22}
                      width="18"
                      height="16"
                      rx="4"
                      className={cn(
                        "transition-colors shadow-xs",
                        isStart
                          ? "fill-emerald-600"
                          : isEnd
                            ? "fill-blue-600"
                            : "fill-slate-800 dark:fill-stone-700",
                      )}
                    />
                    <text
                      x={dot.x + 19}
                      y={dot.y - 10}
                      textAnchor="middle"
                      className="fill-white font-mono text-[10px] font-bold select-none"
                    >
                      {stepOrder + 1}
                    </text>
                  </g>
                )}

                {/* "START" pill text */}
                {isStart && (
                  <g pointerEvents="none">
                    <rect
                      x={dot.x - 22}
                      y={dot.y + 21}
                      width="44"
                      height="15"
                      rx="3.5"
                      className="fill-emerald-500/90 shadow-xs"
                    />
                    <text
                      x={dot.x}
                      y={dot.y + 32}
                      textAnchor="middle"
                      className="fill-white font-sans text-[9px] font-black tracking-wider uppercase select-none"
                    >
                      START
                    </text>
                  </g>
                )}

                {/* "END" pill text */}
                {isEnd && (
                  <g pointerEvents="none">
                    <rect
                      x={dot.x - 17}
                      y={dot.y + 21}
                      width="34"
                      height="15"
                      rx="3.5"
                      className="fill-blue-500/90 shadow-xs"
                    />
                    <text
                      x={dot.x}
                      y={dot.y + 32}
                      textAnchor="middle"
                      className="fill-white font-sans text-[9px] font-black tracking-wider uppercase select-none"
                    >
                      END
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Connected path lines between visited dots */}
          {pathSegments.map((seg) => (
            <g key={`seg-${seg.index}`} pointerEvents="none">
              {/* Thick background line */}
              <line
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                className="stroke-primary/30 stroke-[6] stroke-linecap-round"
              />
              {/* Main vibrant path line */}
              <line
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                className="stroke-primary stroke-[3.5] stroke-linecap-round"
                filter="url(#pattern-glow)"
              />

              {/* Directional Arrow Gesture along the path segment */}
              <g transform={`translate(${seg.midX}, ${seg.midY}) rotate(${seg.angle})`}>
                {/* Arrow background circle */}
                <circle r="7.5" className="fill-surface stroke-primary/50 stroke-1 shadow-xs" />
                {/* Arrowhead triangle pointing in direction */}
                <polygon
                  points="-3.5,-4 4,0 -3.5,4"
                  className="fill-primary"
                />
              </g>
            </g>
          ))}

          {/* Dragging elastic line to cursor (in record mode) */}
          {isRecord && isDragging && cursorPos && currentPath.length > 0 && (
            <line
              x1={DOT_COORDS[currentPath[currentPath.length - 1]].x}
              y1={DOT_COORDS[currentPath[currentPath.length - 1]].y}
              x2={cursorPos.x}
              y2={cursorPos.y}
              className="stroke-primary/60 stroke-[3] stroke-dashed stroke-dasharray-[5_5] stroke-linecap-round pointer-events-none"
            />
          )}

          {/* Animated cursor traveling along gesture path */}
          {animatedCursor && (
            <g
              transform={`translate(${animatedCursor.x}, ${animatedCursor.y})`}
              pointerEvents="none"
            >
              {/* Glowing ripple */}
              <circle
                r="16"
                className="animate-ping fill-emerald-400/40 stroke-emerald-500/80 stroke-1"
              />
              <circle
                r="9"
                className="fill-emerald-400 stroke-white stroke-2 shadow-lg"
                filter="url(#pattern-glow)"
              />
              <circle r="3.5" className="fill-white" />
            </g>
          )}
        </svg>
      </div>

      {/* Control Buttons & Sequence Summary */}
      <div className="mt-3.5 flex w-full flex-col gap-2">
        {isRecord ? (
          /* Editor Mode Controls */
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-body-muted">
              <span>
                {currentPath.length === 0 ? (
                  "Drag or click dots to draw pattern"
                ) : (
                  <span className="font-medium text-ink">
                    {currentPath.length} dot{currentPath.length > 1 ? "s" : ""} connected
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleUndo}
                  disabled={currentPath.length === 0}
                  title="Undo last dot"
                >
                  <Undo2 className="mr-1 size-3.5" />
                  Undo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted hover:text-error"
                  onClick={handleClear}
                  disabled={currentPath.length === 0}
                  title="Clear entire pattern"
                >
                  <RotateCcw className="mr-1 size-3.5" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Sequence dots badge list */}
            {currentPath.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 rounded-sm border border-hairline bg-stone/30 px-2.5 py-1.5 text-[11px] text-body-muted font-mono">
                <span className="text-muted text-[10px] uppercase tracking-wider mr-1">
                  Sequence:
                </span>
                {currentPath.map((node, idx) => (
                  <React.Fragment key={idx}>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-bold shadow-2xs",
                        idx === 0
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : idx === currentPath.length - 1
                            ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                            : "bg-surface text-ink border border-hairline",
                      )}
                    >
                      {DOT_COORDS[node].num} ({DOT_COORDS[node].label})
                    </span>
                    {idx < currentPath.length - 1 && (
                      <ArrowRight className="size-3 text-muted/60 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Viewer Mode Controls */
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="ns-caption font-medium text-ink">
                {currentPath.length} points pattern
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                onClick={replayAnimation}
                disabled={animating || currentPath.length < 2}
              >
                <Play className={cn("mr-1 size-3.5 fill-current", animating && "animate-spin")} />
                {animating ? "Replaying gesture…" : "Replay gesture"}
              </Button>
            </div>

            {/* Step-by-step readable sequence */}
            {currentPath.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1 rounded-sm border border-hairline bg-stone/40 px-2.5 py-1.5 text-[11px] text-body-muted font-mono">
                <span className="text-muted text-[10px] uppercase tracking-wider mr-1">
                  Steps:
                </span>
                {currentPath.map((node, idx) => (
                  <React.Fragment key={idx}>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-bold",
                        idx === 0
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : idx === currentPath.length - 1
                            ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                            : "bg-surface text-ink border border-hairline",
                      )}
                    >
                      {idx + 1}. {DOT_COORDS[node].label}
                    </span>
                    {idx < currentPath.length - 1 && (
                      <ArrowRight className="size-3 text-muted/60 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <p className="ns-caption text-muted">No pattern recorded.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
