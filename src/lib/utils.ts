import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function htmlToPlainText(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  const text = template.content.textContent ?? "";
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").trim();
}

export function firstLine(text: string, max = 120): string {
  const line = text.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.length > max ? `${line.slice(0, max).trimEnd()}…` : line;
}

export function excerpt(text: string, max = 90): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 220));
}

export function formatRelative(timestamp: number, now = Date.now()): string {
  const diff = now - timestamp;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < 45_000) return "just now";
  if (diff < hour) return `${Math.round(diff / minute)}m ago`;
  if (diff < day) return `${Math.round(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.round(diff / day)}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: new Date(timestamp).getFullYear() === new Date(now).getFullYear() ? undefined : "numeric",
  });
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Filesystem-safe file stem derived from a note title. */
export function toFileStem(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 60)
    .trim();
  return cleaned || "Untitled note";
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export const isMac =
  typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

export function modKeyLabel(): string {
  return isMac ? "⌘" : "Ctrl";
}
