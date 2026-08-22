# NoteSeen — Interview Questions, Scripts & Quick Answers

> **Purpose**: Rapid interview preparation guide. Contains crisp, punchy answers, medium-length architectural explanations, and exact spoken scripts in layman conversational language (Hinglish/English).

---

## 1. The 30-Second Elevator Pitch (Introduction Script)

### 🎙️ "Tell me about your project NoteSeen."

#### 🗣️ How You Should Speak (Layman Script):
> *"NoteSeen is an **offline-first, cloud-synced intelligent notepad and AI prompt studio** that I built as a Progressive Web App (PWA).*
> 
> *The core problem I solved was **zero-friction data persistence and data ownership**. In traditional apps like Notion, they are heavy, slow to boot, and if your internet or tab dies, you risk losing uncommitted notes. In NoteSeen, there is no save button — every keystroke is written across a **5-tier saving pipeline** (memory, localStorage snapshot, IndexedDB, local disk file, and Firestore).*
> 
> *It also features a **Zero-Knowledge Secret Vault** encrypted with client-side AES-GCM-256 for developers to store API keys safely, and native OS integration where notes can live directly on disk as portable `.noteseen` files that reopen on double-click.*
> 
> *I built it using **React 19, TypeScript, Tailwind CSS v4, Zustand, Tiptap editor, Firebase, Supabase Storage, and the Web Crypto API**."*

---

## 2. Rapid-Fire / Quick Interview Questions (Short & Precise)

### Q1: Why did you build NoteSeen when Notion and Apple Notes already exist?
- **Speed & Boot Time**: Sub-50ms cold start without heavy bundle overhead.
- **Zero Data Loss**: 5-tier fail-safe saving pipeline with browser lifecycle flush on tab kill.
- **Data Ownership**: Open portable `.noteseen` JSON files directly on disk, avoiding proprietary cloud lock-in.
- **Secure Secret Storage**: Zero-knowledge client-side encrypted vault for API keys.

---

### Q2: Why did you choose Zustand instead of Redux Toolkit or Context API?
- **Zero Boilerplate**: Simple hook-based store creation without actions/reducers ceremony.
- **High Performance**: Transient updates and fine-grained selectors prevent unnecessary re-renders.
- **Out-of-React Access**: Zustand state can be read and mutated outside React components (e.g. inside debounced timeouts, lifecycle listeners, and crypto utilities).

---

### Q3: What is the 5-Tier Saving Architecture?
1. **Tier 1 (Memory)**: Instant state update (0ms latency).
2. **Tier 2 (localStorage)**: Synchronous snapshot on every keystroke (crash protection).
3. **Tier 3 (IndexedDB)**: Structured local database write (debounced 250ms).
4. **Tier 4 (Disk File)**: In-place `.noteseen` file update via File System Access API (debounced 1200ms).
5. **Tier 5 (Firestore)**: Remote cloud sync (debounced 450ms, batched in 450 items).

---

### Q4: How does NoteSeen ensure zero data loss when a user suddenly closes the tab?
- We listen to native browser lifecycle events: `visibilitychange`, `pagehide`, `beforeunload`, and `blur`.
- When triggered, all pending debounce timers are cancelled and dirty state is flushed immediately.
- If a hard crash occurs, the synchronous `localStorage` snapshot is restored on next boot.

---

### Q5: How is the Secret Vault secured? (Zero-Knowledge Explanation)
- **Key Derivation**: 4-digit PIN + 16-byte random salt passing through **PBKDF2-SHA-256 with 120,000 iterations**.
- **Encryption**: **AES-GCM (256-bit)** with a unique 12-byte random IV per secret.
- **Zero-Knowledge**: Server only receives ciphertext, IV, and salt. The PIN and decrypted keys never leave the browser memory.

---

### Q6: How does conflict resolution work when syncing offline edits across devices?
- We use a deterministic **Last-Write-Wins (LWW)** strategy comparing the `updatedAt` millisecond timestamp.
- For deletes, we use soft-delete timestamps and remote listener tombstones so other devices drop purged notes cleanly.

---

### Q7: What is the purpose of the Site-Wide Vault Gate?
- It protects destructive actions (Empty Trash, Delete Workspace, Permanent Purge) behind a master security question.
- The answer is normalized (trimmed, lowercase, single spaced) and hashed using **SHA-256**.

---

### Q8: What happens on browsers that do not support the File System Access API?
- Chromium browsers (Chrome, Edge, Opera) write directly to the disk file in place.
- Other browsers (Safari, Firefox) seamlessly fall back to triggering a `.noteseen` file download, while keeping IndexedDB fully functional.

---

## 3. Core Architecture Questions (Medium Length & Deep Explanations)

### Q9: Why did you use both `localStorage` and `IndexedDB` together? Isn't that redundant?

#### 🗣️ Spoken Script:
> *"That was an intentional engineering decision to solve the **asynchronous I/O crash problem**.*
> 
> *`IndexedDB` is asynchronous. If a user types a word and instantly kills the browser process (SIGKILL / battery pull / hard tab close), an in-flight IndexedDB transaction might get aborted before committing.*
> 
> *To fix this, we write a synchronous, lightweight snapshot of just the active note's `id`, `title`, `html`, and `updatedAt` to `localStorage` on every keystroke. It takes less than 1ms. On the next application launch, if the snapshot timestamp is newer than what's in IndexedDB, the snapshot wins and reconciles the database. `IndexedDB` remains our primary high-capacity structured database, while `localStorage` acts as a crash net."*

---

### Q10: Walk me through your Firestore Security Rules and Authorization architecture.

#### 🗣️ Spoken Script:
> *"Our security philosophy is **Zero Trust with Least Privilege**. In `firestore.rules`:*
> 
> 1. *First, strict ownership validation: Every document path is nested under `users/{uid}`, and all read/writes require `request.auth.uid == uid`.*
> 2. *Second, strict schema enforcement: We use `.hasOnly([...])` and `.hasAll([...])` to block unauthorized fields or payload tampering.*
> 3. *Third, boundary checks: We enforce string limits (e.g. title <= 500 chars, HTML <= 500KB, tags <= 24).*
> 4. *Fourth, immutability: The `createdAt` timestamp is locked on document updates using `request.resource.data.createdAt == resource.data.createdAt`.*
> 5. *Finally, we close the entire root namespace with a catch-all `allow read, write: if false;`."*

---

### Q11: How did you implement custom rich-text capabilities in Tiptap (like resizable images)?

#### 🗣️ Spoken Script:
> *"Tiptap is built on top of ProseMirror. For rich text, standard extensions work great, but for images, I needed interactive resizing and cropping.*
> 
> *I built a custom ProseMirror Node View in `src/lib/resizable-image.ts`. It renders a wrapper with an interactive bounding box and corner drag handles. On mouse drag, it calculates delta X/Y in real-time and updates the node attribute `width`. For image cropping, I integrated `react-easy-crop` in a dialog before upload, which converts the canvas crop into a WebP/JPEG blob and uploads to Supabase Storage."*

---

### Q12: Why React 19 (SPA + Vite) instead of Next.js for NoteSeen?

#### 🗣️ Spoken Script:
> *"Next.js is fantastic for SEO-heavy content websites and server-rendered e-commerce. However, NoteSeen is an **offline-first local client application (PWA)**.*
> 
> *Server-Side Rendering (SSR) adds hydration mismatches when accessing browser-specific APIs like `window.crypto`, `indexedDB`, `navigator.storage`, and `showSaveFilePicker`. With React 19 + Vite, we get zero SSR overhead, sub-second HMR, instant client routing, smaller bundle footprint, and full offline caching capabilities via Service Workers."*

---

## 4. Tricky & Behavioral Technical Scenarios

### Q13: What was the most challenging technical bug you encountered in this project, and how did you debug it?

#### 🗣️ Spoken Script:
> *"One of the toughest challenges was **cross-device state synchronization loop and cursor jumping** during active typing.*
> 
> *When a user was typing on Device A, Firestore pushed the remote snapshot to Device B. If Device B was also listening via `onSnapshot`, it was updating the local Zustand store and triggering a re-render in the Tiptap editor, which caused the cursor position to reset to the end of the text.*
> 
> *To solve this:*
> 1. *I added an intelligent debounce window (450ms) for cloud pushes so rapid keystrokes are batched in memory first.*
> 2. *In the merge logic (`src/lib/sync/adapter.ts`), if the local note's `updatedAt` is greater than or equal to the remote timestamp, the remote update is ignored.*
> 3. *In the Tiptap component, we only re-set content if the incoming HTML content actually differs from current editor state and the editor is not actively focused by the user."*

---

### Q14: If NoteSeen scales to 500,000 users, what potential bottlenecks would you foresee and how would you optimize them?

#### 🗣️ Spoken Script:
> *"Because NoteSeen is client-heavy and offline-first, our backend load is significantly lower than traditional web apps. However, at scale, two bottlenecks could arise:*
> 
> 1. ***Firestore Read/Write Costs***:
>    *Currently, we batch writes in chunks of 450 and debounce pushes. At 500k users, we can increase the cloud push debounce to 2-3 seconds for active typing, or implement delta sync (syncing only diff patches instead of full HTML strings).*
> 2. ***Supabase Image Storage Egress***:
>    *Cover images and uploaded note images consume bandwidth. We can add client-side image compression (WebP conversion via browser canvas or `sharp`) before upload to reduce payload sizes by up to 70%."*

---

### Q15: If someone asks: "Why should I use NoteSeen instead of VS Code or Obsidian for taking notes?"

#### 🗣️ Spoken Script:
> *"VS Code is an IDE, and Obsidian is a heavy graph-based knowledge system. NoteSeen is designed for **instant, frictionless capture with zero setup**.*
> 
> *You don't need to configure a vault, install plugins, or manage Git remotes. You open NoteSeen, type your thought, and close the tab. It works on your phone, laptop, or tablet with built-in zero-knowledge API key encryption and 1-click PDF/Markdown export. It bridges the gap between a lightweight scratchpad and a robust secure workspace."*

---

## 5. Summary Cheat-Sheet for Rapid Revision

| Topic | Key Keywords to Mention |
| :--- | :--- |
| **Architecture** | Offline-First, PWA, 5-Tier Persistence, Debounced writes, Lifecycle Flush. |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, Radix UI, Tiptap WYSIWYG. |
| **Security** | Zero-Knowledge, Web Crypto API, AES-GCM (256-bit), PBKDF2 (120,000 iterations), SHA-256 Vault Gate. |
| **Backend & Cloud** | Firebase Auth (Google Sign-In), Firestore (batched writes), Supabase Storage (CDN covers). |
| **Storage & OS** | IndexedDB (`idb`), File System Access API (`.noteseen` file format), `localStorage` crash snapshot. |
| **Export Formats** | `.noteseen` (JSON), `.md` (Markdown), Branded HTML, Direct Print PDF via hidden iframe. |
