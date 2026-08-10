import type { Note } from "@/lib/types";
import { TYPEFACES } from "@/lib/note-themes";

const LOGO_URL = "/android-chrome-192x192.png";

function fontFamily(typeface: Note["typeface"]): string {
  const map: Record<string, string> = {
    inter: "Inter, system-ui, sans-serif",
    roboto: "Roboto, system-ui, sans-serif",
    opensans: '"Open Sans", system-ui, sans-serif',
    lato: "Lato, system-ui, sans-serif",
    montserrat: "Montserrat, system-ui, sans-serif",
    poppins: "Poppins, system-ui, sans-serif",
    nunito: "Nunito, system-ui, sans-serif",
    spacegrotesk: '"Space Grotesk", system-ui, sans-serif',
    playfair: '"Playfair Display", Georgia, serif',
    merriweather: "Merriweather, Georgia, serif",
    georgia: "Georgia, serif",
    times: '"Times New Roman", Times, serif',
    jetbrains: '"JetBrains Mono", ui-monospace, monospace',
    firacode: '"Fira Code", ui-monospace, monospace',
    sourcecode: '"Source Code Pro", ui-monospace, monospace',
    courier: '"Courier New", Courier, monospace',
    sans: "Inter, system-ui, sans-serif",
    display: '"Space Grotesk", system-ui, sans-serif',
    serif: "Georgia, serif",
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

export function buildExportHtml(note: Note, logoAbsoluteUrl: string): string {
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
  <title>${escapeHtml(title)} · NoteSeen</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;600;700&family=Nunito:wght@400;600;700&family=Open+Sans:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Poppins:wght@400;600;700&family=Roboto:wght@400;500;700&family=Source+Code+Pro:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      background: #f4f2ee;
      color: #14171a;
      font-family: ${fontFamily(note.typeface)};
      line-height: 1.65;
    }
    .page {
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 28px 56px;
      background: #fff;
      min-height: 100vh;
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
    .brand span { font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: #5c6570; }
    h1 { font-size: 1.75rem; margin: 0 0 8px; line-height: 1.25; }
    .meta { font-size: 12px; color: #8a9199; margin-bottom: 24px; }
    .content { font-size: 1rem; }
    .content pre {
      background: #14171a;
      color: #f4f2ee;
      padding: 14px 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 0.875rem;
    }
    .content code { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 0.9em; }
    .content img { max-width: 100%; height: auto; }
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
      body { background: #fff; }
      .page { padding: 0; max-width: none; box-shadow: none; }
    }
  </style>
</head>
<body>
  <article class="page">
    <header class="brand">
      <img src="${logoAbsoluteUrl}" alt="Arigato Labs" />
      <span>NoteSeen · Arigato Labs</span>
    </header>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">${escapeHtml(hint)} · ${note.kind === "prompt" ? "Prompt" : "Note"} · ${new Date(note.updatedAt).toLocaleString()}</p>
    ${labels}
    <div class="content">${note.html || `<p>${escapeHtml(note.text)}</p>`}</div>
    <footer class="footer">
      <img src="${logoAbsoluteUrl}" alt="" />
      <span>Made with NoteSeen · Product of Arigato Labs</span>
    </footer>
  </article>
</body>
</html>`;
}

export function downloadHtml(note: Note) {
  const logo = new URL(LOGO_URL, window.location.origin).href;
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

/** Opens a print window so the user can Save as PDF (includes logo + branding). */
export function exportPdf(note: Note) {
  const logo = new URL(LOGO_URL, window.location.origin).href;
  const html = buildExportHtml(note, logo);
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 350);
  return true;
}
