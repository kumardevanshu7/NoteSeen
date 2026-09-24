import type { Note } from "@/lib/types";
import { TYPEFACES } from "@/lib/note-themes";

const LOGO_URL = "/noteseen-mark.png?v=2";

let logoDataUrlCache: string | null = null;

function fontFamily(typeface: Note["typeface"]): string {
  const map: Record<string, string> = {
    inter: "Inter, system-ui, sans-serif",
    spacegrotesk: '"Space Grotesk", system-ui, sans-serif',
    georgia: "Georgia, 'Times New Roman', serif",
    jetbrains: '"JetBrains Mono", ui-monospace, monospace',
    sans: "Inter, system-ui, sans-serif",
    display: '"Space Grotesk", system-ui, sans-serif',
    serif: "Georgia, 'Times New Roman', serif",
    mono: '"JetBrains Mono", ui-monospace, monospace',
  };
  return map[typeface] ?? map.inter;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function getLogoDataUrl(): Promise<string> {
  if (logoDataUrlCache) return logoDataUrlCache;
  try {
    const res = await fetch(new URL(LOGO_URL, window.location.origin).href);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    logoDataUrlCache = dataUrl;
    return dataUrl;
  } catch {
    return new URL(LOGO_URL, window.location.origin).href;
  }
}

function noteBodyHtml(note: Note): string {
  const html = (note.html || "").trim();
  if (html && html !== "<p></p>" && html !== "<p><br></p>") return html;
  if (note.text.trim()) {
    return note.text
      .split(/\n+/)
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join("");
  }
  return "<p><em>Empty note</em></p>";
}

export function buildExportHtml(note: Note, logoUrl: string): string {
  const title = note.title.trim() || "Untitled";
  const labels =
    note.tags.length > 0
      ? `<p style="margin:0 0 16px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5c6570;">Labels: ${escapeHtml(note.tags.join(" · "))}</p>`
      : "";
  const hint = TYPEFACES.find((t) => t.id === note.typeface)?.label ?? note.typeface;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <title>${escapeHtml(title)} · NoteSeen</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #14171a !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: ${fontFamily(note.typeface)};
      line-height: 1.65;
    }
    .page {
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 28px 56px;
      background: #ffffff !important;
      color: #14171a !important;
      box-sizing: border-box;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 28px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e6e2dc;
    }
    .brand img { width: 36px; height: 36px; border-radius: 8px; }
    .brand span {
      font-size: 13px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #5c6570;
    }
    h1 {
      font-size: 1.75rem;
      margin: 0 0 8px;
      line-height: 1.25;
      color: #14171a !important;
    }
    .meta { font-size: 12px; color: #8a9199; margin-bottom: 24px; }
    .content { font-size: 1rem; color: #14171a !important; }
    .content p { margin: 0 0 0.85em; }
    .content pre {
      background: #14171a;
      color: #f4f2ee;
      padding: 14px 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: ui-monospace, "Courier New", monospace;
      font-size: 0.875rem;
    }
    .content code { font-family: ui-monospace, "Courier New", monospace; font-size: 0.9em; }
    .content img { max-width: 100%; height: auto; }

    /* Table styling */
    .content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      font-size: 0.9375rem;
      line-height: 1.5;
      page-break-inside: auto;
    }
    .content tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    .content th,
    .content td {
      border: 1px solid #dcd7ce;
      padding: 8px 12px;
      vertical-align: top;
      text-align: left;
      box-sizing: border-box;
    }
    .content th {
      background-color: #f4f2ee !important;
      color: #14171a !important;
      font-weight: 700;
      border-bottom: 2.5px solid #3b82f6 !important;
    }
    .content tr:nth-child(even) td {
      background-color: rgba(0, 0, 0, 0.02);
    }
    /* Custom colored rows */
    .content tr[data-row-color] td,
    .content tr[data-row-color] th {
      background-color: var(--row-bg) !important;
    }

    /* Links in content & tables */
    .content a {
      color: #2563eb !important;
      text-decoration: underline;
      text-underline-offset: 2.5px;
    }
    .content a::after {
      content: " ↗";
      font-size: 0.85em;
      opacity: 0.8;
      text-decoration: none;
    }

    /* Table Badges & Choice Pills */
    .content .ns-badge-pill {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
      border: 1px solid transparent;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .content .ns-badge-yes,
    .content .ns-badge-color-green {
      background: #dcfce7 !important;
      color: #15803d !important;
      border-color: #86efac !important;
    }
    .content .ns-badge-yes::before {
      content: "✓ ";
      font-weight: 700;
    }
    .content .ns-badge-no,
    .content .ns-badge-color-red {
      background: #ffe4e6 !important;
      color: #b91c1c !important;
      border-color: #fca5a5 !important;
    }
    .content .ns-badge-no::before {
      content: "✕ ";
      font-weight: 700;
    }
    .content .ns-badge-color-blue {
      background: #dbeafe !important;
      color: #1d4ed8 !important;
      border-color: #93c5fd !important;
    }
    .content .ns-badge-color-amber {
      background: #fef3c7 !important;
      color: #b45309 !important;
      border-color: #fde68a !important;
    }
    .content .ns-badge-color-purple {
      background: #ede9fe !important;
      color: #6d28d9 !important;
      border-color: #c4b5fd !important;
    }
    .content .ns-badge-color-gray {
      background: #f3f4f6 !important;
      color: #4b5563 !important;
      border-color: #e5e7eb !important;
    }

    /* Side-by-side Card (Pic & Details) */
    .content .ns-side-by-side-card {
      display: flex !important;
      flex-direction: row !important;
      align-items: stretch !important;
      gap: 16px !important;
      margin: 18px 0 !important;
      padding: 14px !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8px !important;
      background: #f8fafc !important;
      page-break-inside: avoid !important;
    }
    .content .ns-side-by-side-media {
      flex-shrink: 0 !important;
      display: flex !important;
      align-items: flex-start !important;
      justify-content: center !important;
    }
    .content .ns-side-by-side-img {
      width: 100% !important;
      max-height: 280px !important;
      object-fit: cover !important;
      border-radius: 6px !important;
      border: 1px solid #e2e8f0 !important;
    }
    .content .ns-side-by-side-placeholder-static {
      width: 100% !important;
      min-height: 120px !important;
      border: 1px dashed #cbd5e1 !important;
      border-radius: 6px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #94a3b8 !important;
      font-size: 13px !important;
      background: #ffffff !important;
    }
    .content .ns-side-by-side-content {
      flex: 1 1 0% !important;
      min-width: 0 !important;
    }
    .content .ns-side-by-side-content > *:first-child { margin-top: 0 !important; }
    .content .ns-side-by-side-content > *:last-child { margin-bottom: 0 !important; }

    .footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #e6e2dc;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: #8a9199;
    }
    .footer img { width: 22px; height: 22px; border-radius: 5px; }
    @media print {
      html, body, .page {
        background: #ffffff !important;
        color: #14171a !important;
      }
      .page { padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <article class="page">
    <header class="brand">
      <img src="${logoUrl}" alt="Arigato Labs" width="36" height="36" />
      <span>NoteSeen · Arigato Labs</span>
    </header>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">${escapeHtml(hint)} · ${note.kind === "prompt" ? "Prompt" : "Note"} · ${new Date(note.updatedAt).toLocaleString()}</p>
    ${labels}
    <div class="content">${noteBodyHtml(note)}</div>
    <footer class="footer">
      <img src="${logoUrl}" alt="" width="22" height="22" />
      <span>Made with NoteSeen · Product of Arigato Labs</span>
    </footer>
  </article>
</body>
</html>`;
}

export async function downloadHtml(note: Note) {
  const logo = await getLogoDataUrl();
  const html = buildExportHtml(note, logo);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safe = (note.title.trim() || "note").replace(/[^\w\-]+/g, "_").slice(0, 60);
  a.href = url;
  a.download = `${safe}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Print / Save-as-PDF via a hidden iframe (avoids blank noopener popups).
 */
export async function exportPdf(note: Note): Promise<boolean> {
  const logo = await getLogoDataUrl();
  const html = buildExportHtml(note, logo);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "NoteSeen PDF export");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const frame = iframe.contentWindow;
  if (!frame) {
    iframe.remove();
    return false;
  }

  frame.document.open();
  frame.document.write(html);
  frame.document.close();

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    if (frame.document.readyState === "complete") {
      // Wait a tick so layout paints before print.
      setTimeout(done, 200);
    } else {
      iframe.addEventListener("load", () => setTimeout(done, 200), { once: true });
      setTimeout(done, 800);
    }
  });

  try {
    frame.focus();
    frame.print();
  } catch {
    iframe.remove();
    return false;
  }

  // Keep iframe briefly so the print dialog can read it.
  setTimeout(() => iframe.remove(), 60_000);
  return true;
}
