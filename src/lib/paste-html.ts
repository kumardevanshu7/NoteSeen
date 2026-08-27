import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Clean clipboard HTML (ChatGPT, Docs, Notion, browsers) into TipTap-safe markup.
 * Strips images/scripts/heavy styles that freeze or black out the editor.
 */

const MAX_PASTE_CHARS = 350_000;

const DROP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "LINK",
  "META",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "SVG",
  "IMG",
  "PICTURE",
  "SOURCE",
  "VIDEO",
  "AUDIO",
  "CANVAS",
  "FORM",
  "INPUT",
  "BUTTON",
  "SELECT",
  "TEXTAREA",
  "NOSCRIPT",
]);

/** Keep text, drop the wrapper element. */
const UNWRAP_TAGS = new Set([
  "DIV",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "MAIN",
  "NAV",
  "ASIDE",
  "SPAN",
  "FONT",
  "LABEL",
  "CENTER",
]);

const KEEP_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "S",
  "STRIKE",
  "DEL",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "PRE",
  "CODE",
  "A",
  "MARK",
  "HR",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TR",
  "TH",
  "TD",
]);

function unwrapElement(el: Element) {
  const parent = el.parentNode;
  if (!parent) {
    el.remove();
    return;
  }
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function cleanAttributes(el: Element) {
  const tag = el.tagName;
  const allowed = new Set<string>();
  if (tag === "A") allowed.add("href");
  if (tag === "TH" || tag === "TD") {
    allowed.add("colspan");
    allowed.add("rowspan");
    allowed.add("colwidth");
    allowed.add("align");
  }
  if (tag === "TABLE") {
    allowed.add("border");
  }

  for (const attr of [...el.attributes]) {
    if (!allowed.has(attr.name.toLowerCase())) el.removeAttribute(attr.name);
  }

  if (tag === "A") {
    const href = el.getAttribute("href") ?? "";
    if (!/^(https?:|mailto:|#)/i.test(href)) el.removeAttribute("href");
  }
}

function walk(node: Node) {
  if (node.nodeType === Node.COMMENT_NODE) {
    node.parentNode?.removeChild(node);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as HTMLElement;
  const tag = el.tagName;

  if (DROP_TAGS.has(tag)) {
    el.remove();
    return;
  }

  for (const child of [...el.childNodes]) walk(child);

  if (UNWRAP_TAGS.has(tag) || !KEEP_TAGS.has(tag)) {
    unwrapElement(el);
    return;
  }

  cleanAttributes(el);
}

function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map(escapeText).join("<br>");
      return `<p>${lines || "<br>"}</p>`;
    })
    .join("");
}

function escapeText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Returns sanitized HTML safe for TipTap insert/paste. */
export function sanitizePastedHtml(rawHtml: string, plainFallback = ""): string {
  if (!rawHtml.trim()) {
    return plainFallback ? plainTextToHtml(plainFallback) : "";
  }

  if (rawHtml.length > MAX_PASTE_CHARS * 3) {
    return plainFallback ? plainTextToHtml(plainFallback.slice(0, MAX_PASTE_CHARS)) : "";
  }

  // Strip data-URLs early — usual crash source from ChatGPT / web clipboards.
  let html = rawHtml.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');
  html = html.replace(/url\(\s*['"]?data:[^)]+\)/gi, "none");

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, "text/html");
  } catch {
    return plainFallback ? plainTextToHtml(plainFallback) : "";
  }

  for (const child of [...doc.body.childNodes]) walk(child);

  let out = doc.body.innerHTML.trim();
  if (!out) return plainFallback ? plainTextToHtml(plainFallback) : "";

  if (out.length > MAX_PASTE_CHARS) {
    if (plainFallback) return plainTextToHtml(plainFallback.slice(0, MAX_PASTE_CHARS));
    out = out.slice(0, MAX_PASTE_CHARS);
  }

  out = out
    .replace(/<\/?b\b[^>]*>/gi, (m) => (m.startsWith("</") ? "</strong>" : "<strong>"))
    .replace(/<\/?i\b[^>]*>/gi, (m) => (m.startsWith("</") ? "</em>" : "<em>"))
    .replace(/<\/?strike\b[^>]*>/gi, (m) => (m.startsWith("</") ? "</s>" : "<s>"))
    .replace(/<\/?del\b[^>]*>/gi, (m) => (m.startsWith("</") ? "</s>" : "<s>"))
    .replace(/<\/?h[456]\b[^>]*>/gi, (m) => (m.startsWith("</") ? "</h3>" : "<h3>"));

  return out;
}

export function clipboardHasImageFile(data: DataTransfer | null | undefined): boolean {
  if (!data) return false;
  return Array.from(data.files ?? []).some((file) => file.type.startsWith("image/"));
}

/**
 * Detect whether text is formatted as Markdown
 * (e.g. copied from ChatGPT, Claude, Gemini, GitHub, code blocks, etc.)
 */
export function hasMarkdownTable(text: string): boolean {
  return /\|[^\n\r]+\|[\r\n]+\s*\|[\s:\-|]+\|/.test(text);
}

/**
 * Detect whether text is formatted as Markdown
 * (e.g. copied from ChatGPT, Claude, Gemini, GitHub, code blocks, etc.)
 */
export function isMarkdownContent(text: string): boolean {
  if (!text || text.length < 3) return false;

  // Markdown tables: | col1 | col2 |\n| --- | --- |
  if (hasMarkdownTable(text)) return true;

  // Markdown headings: ### Title or # Title
  if (/(?:^|\n)#{1,6}\s+\S+/.test(text)) return true;

  // Markdown horizontal rule: --- or *** on its own line
  if (/(?:^|\n)(?:-{3,}|\*{3,}|_{3,})\s*(?:\n|$)/.test(text)) return true;

  // Markdown code fence: ```lang ... ```
  if (/```[\s\S]*?```/.test(text)) return true;

  // Markdown blockquote: > Quote
  if (/(?:^|\n)>\s+\S+/.test(text)) return true;

  // Multiple markdown list items: - item \n - item or 1. item \n 2. item
  if (/(?:^|\n)\s*(?:[-*+]|\d+\.)\s+\S+[\r\n]+\s*(?:[-*+]|\d+\.)\s+\S+/.test(text)) return true;

  return false;
}

/**
 * Parses markdown text into sanitized, TipTap-safe HTML.
 */
export function parseMarkdownToHtml(markdown: string): string {
  try {
    const raw = marked.parse(markdown);
    const html = typeof raw === "string" ? raw : "";
    return sanitizePastedHtml(html);
  } catch (err) {
    console.error("NoteSeen: markdown parse failed", err);
    return "";
  }
}
