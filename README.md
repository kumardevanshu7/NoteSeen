# NoteSeen

A fast, offline-first notes PWA. Open it, type, close the tab — the note is already saved. Every
note can also live on disk as a portable `.noteseen` file that NoteSeen re-opens on a double click.

Built with React 19, Vite, Tailwind CSS v4, shadcn-style Radix primitives and Tiptap. The visual
language follows [`DESIGN-cohere.md`](./DESIGN-cohere.md): white editorial canvas, near-black
primary, mineral surfaces, hairline rules and pill actions.

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
```

```bash
npm run build     # typecheck + production build (dist/)
npm run preview   # serve the build, including the service worker
npm run icons     # regenerate PWA icons from scripts/generate-icons.mjs
```

## How saving works

There is no save button in the normal flow.

| Layer | When it writes | Why |
| --- | --- | --- |
| In-memory store | Every keystroke | Instant UI |
| `localStorage` snapshot | Every keystroke (synchronous) | Survives a hard tab kill |
| IndexedDB | 250 ms after you stop typing | The real local database |
| Linked `.noteseen` file | 1.2 s after you stop typing | Keeps the file on disk current |

Everything is flushed again on `visibilitychange`, `pagehide`, `beforeunload` and window blur, so
closing the tab, switching apps or shutting the laptop all count as saving. On the next launch, if
the synchronous snapshot is newer than the database row, the snapshot wins.

## The `.noteseen` file

`Ctrl`/`⌘` + `S` writes the current note to a file you pick. From then on that note is **linked**:
later edits are written straight back into the same file, no dialog. The format is readable JSON so
the content is never trapped in the app:

```json
{
  "format": "noteseen",
  "version": 1,
  "app": { "name": "NoteSeen" },
  "note": {
    "id": "…",
    "title": "Sprint notes",
    "html": "<p>…</p>",
    "text": "…",
    "theme": "sage",
    "typeface": "sans",
    "size": "m",
    "spacing": "normal",
    "createdAt": 1730000000000,
    "updatedAt": 1730000000000
  }
}
```

Opening files works four ways: `Ctrl` + `O`, the app menu, dropping a file onto the window, or
double-clicking a `.noteseen` file in the OS once the PWA is installed. `.md`, `.markdown`, `.txt`
and `.html` files are imported too, and notes export to Markdown from the app menu.

In-place file writing uses the File System Access API (Chrome, Edge, Opera on desktop). Browsers
without it fall back to a download, and the app keeps working fully from IndexedDB.

## Install and OS integration

Install from the browser's address bar. Installation is what enables:

- `.noteseen` as a double-clickable file type (`file_handlers` in the manifest)
- launching into an existing window instead of a new one (`launch_handler`)
- share-target: sending text to NoteSeen creates a note
- app shortcuts for "New note" and "Search notes"

## Keyboard

| Shortcut | Action |
| --- | --- |
| `Ctrl` + `N` | New note |
| `Ctrl` + `K` | Command palette / find a note |
| `Ctrl` + `S` | Save as (or update) a `.noteseen` file |
| `Ctrl` + `O` | Open a file from disk |
| `Ctrl` + `B` / `I` / `U` | Bold / italic / underline |
| `Ctrl` + `Z`, `Ctrl` + `Shift` + `Z` | Undo, redo |
| `Enter` in the title | Jump into the body |

Selecting text opens a bubble menu with formatting, copy, web search and the AI rewrite entries.

## Project structure

```
src/
  components/        App shell, editor, rails, palette
    ui/              shadcn-style primitives (Radix + cva)
  hooks/             Appearance, install prompt, editor subscription
  lib/
    db.ts            IndexedDB (notes, file handles, meta)
    fs.ts            File System Access wrappers
    note-file.ts     .noteseen serialise / parse, pickers
    markdown.ts      Markdown ⇄ HTML interop
    note-themes.ts   Theme, typeface, size, spacing options
    sync/adapter.ts  Seam for a remote backend
  store/
    notes.ts         Notes state + autosave scheduling
    editor.ts        Live Tiptap instance
```

## Firebase (Google sign-in + Firestore)

Project: `pro-noteseen`. Only Google Auth is used.

### Env (local + Vercel)

1. Copy `.env.example` → `.env` (already filled for this project; `.env` is gitignored).
2. On Vercel: **Settings → Environment Variables** — add every `VITE_*` key from `.env.example` (or paste from your local `.env`), then **Redeploy**.
3. Firebase Auth → Authorized domains — add your `*.vercel.app` domain (and custom domain if any).

Optional: `VITE_WEB3FORMS_KEY` for the Contact form (https://web3forms.com).

`vercel.json` already rewrites SPA routes (`/app`, `/explore`, …) to `index.html`.

### Console setup (one-time)

1. **Authentication → Sign-in method → Google → Enable**, then Save.
2. **Authentication → Settings → Authorized domains** — keep `localhost` for local
   development; add your production domain when you deploy.
3. **Firestore Database → Rules** — paste the contents of [`firestore.rules`](./firestore.rules)
   and Publish.
4. (Optional) **Storage → Rules** — paste [`storage.rules`](./storage.rules) for later image uploads.

### How sync works

- Notes stay local-first in IndexedDB (still works offline / signed out).
- After Google sign-in, notes live at `users/{uid}/notes/{noteId}`.
- Cloud writes are debounced (~3.5s) so typing does not hammer Firestore.
- Last-write-wins on `updatedAt` across devices.
- Top-right **Google** button signs in; your avatar menu signs out.

### Rules file

Copy `firestore.rules` from the repo root into the Firebase console. Do not leave the
default locked `if false` rules in place if you want the app to sync.

## Current limits

- Sharing between accounts is not implemented — sharing happens by sending a `.noteseen` file.
- Writing to a file in place needs a Chromium-based desktop browser; elsewhere `Ctrl` + `S` downloads.
- Markdown conversion covers what the editor can produce, not the whole CommonMark spec.
- Pasted and dropped images are embedded as data URLs, which makes those notes larger.
