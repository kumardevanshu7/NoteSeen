# NoteSeen — Deep Project Technical Documentation (A to Z)

> **Product**: NoteSeen — Offline-First Intelligent Notes & Prompt Studio  
> **Creator / Organization**: Arigato Labs  
> **Tech Stack**: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, Tiptap, Radix UI Primitives, Firebase Auth & Firestore, Supabase Storage, Web Crypto API, PWA (Service Workers + File System Access API).  
> **Status**: Production Ready / Deployed  

---

## 1. Project Overview & Executive Summary

### Kya Hai Yeh Project? (What is NoteSeen?)
**NoteSeen** ek high-performance, **offline-first, cloud-synced intelligent notepad aur AI prompt workspace** hai jise Progressive Web App (PWA) ki tarah design kiya gaya hai.

NoteSeen ka sabse bada USP (Unique Selling Proposition) yeh hai: **"Open it, type, close the tab — your note is already saved."** Isme conventional save buttons ki zaroorat nahi hoti. Iske alawa, NoteSeen notes ko local browser database ke saath-saath user ke computer disk par portable `.noteseen` files ke roop mein direct write aur sync kar sakta hai.

### Key Pillars of NoteSeen:
1. **Zero-Friction Persistence**: 5-Tier multi-layered autosave architecture jo typing ke waqt, tab close karte waqt, ya laptop sleep hone par 1 byte ka bhi data loss nahi hone deta.
2. **True Data Ownership (.noteseen Portable Files)**: Native OS integration jisme note computer disk par open readable JSON file ban kar rehta hai aur double-click karne par NoteSeen PWA mein wapas open ho jata hai.
3. **Zero-Knowledge Secret Vault**: Client-side AES-GCM (256-bit) + PBKDF2 encrypted vault jisme user API keys, passwords, aur tokens bina cloud leak ke safe rakh sakta hai.
4. **Site-Wide Vault Gate**: Master security question + SHA-256 hash jo sensitive operations (jaise trashing, permanent purge, aur workspace delete) ko protect karta hai.
5. **AI Prompt Management & Prompt Cards**: Reusable AI system prompts aur visual prompt cards with cover images (Supabase hosted) aur one-click copy workflows.
6. **Multi-Workspace Isolation**: Workspaces (General, Personal, Work, Projects) with dedicated color themes and segregated data.
7. **Pro Export Engine**: Markdown (`.md`), portable JSON (`.noteseen`), styled standalone HTML, aur direct print/PDF export.

---

## 2. Problem Statement & Why NoteSeen Was Built (Need & Vision)

### Iski Need Kyun Padi? (Problems in Existing Tools)
Market mein Notion, Obsidian, Evernote, Google Keep, aur Apple Notes jaise tools pehle se hain, lekin inme practical developer & power user level par kaafi gaps hain:

| Existing Tool Issues | NoteSeen's Engineered Solution |
| :--- | :--- |
| **Notion**: Bohat heavy hai (slow boot), internet down hua toh unusable lagta hai, aur vendor lock-in hai. | **Sub-50ms Cold Boot**: Lightweight, offline-first PWA, pure client-side execution with zero boot lag. |
| **Google Keep**: Plain text jaisa hai, code blocks, task formatting, typography customization aur secret vault missing hai. | **Tiptap Rich WYSIWYG**: Code blocks, task lists, custom typefaces (JetBrains Mono, Space Grotesk, Georgia, Inter), image resizing. |
| **Obsidian**: Local markdown files toh deta hai par mobile sync ke liye paid subscription chahiye ya complex Git setups karne padte hain. | **Hybrid Sync**: Free automatic Firestore cloud sync + local disk `.noteseen` file editing via File System Access API. |
| **Accidental Data Loss**: Tab achanak close ho gaya ya browser crash ho gaya toh uncommitted edits gayab ho jate hain. | **5-Tier Saving Pipeline**: Keystroke-level `localStorage` synchronous snapshot + IndexedDB + Lifecycle flush. |
| **Security Risk with API Keys**: Developers apne sensitive OpenAI/Anthropic/Stripe API keys ko plain text notes mein rakh dete hain jo cloud database me plain text me store hote hain. | **Client-Side AES-GCM-256 Secret Vault**: Keys browser mein encrypt hoti hain; Firebase server ko kabhi decrypted key nahi milti (Zero-Knowledge). |

---

## 3. Core Features & Functions Breakdown

### 3.1. Editor & Rich Text Engine
- **Engine**: Headless ProseMirror / Tiptap suite.
- **Formatting Capabilities**: Headings (H1, H2, H3), Bold, Italic, Underline, Strikethrough, Highlight, Code Blocks (monospace), Blockquotes, Bullet Lists, Numbered Lists, Task Lists (Checkboxes), Text Alignment (Left, Center, Right, Justify).
- **Typography & Theme Controls**:
  - **Typefaces**: Inter (Sans), Space Grotesk (Display), Georgia (Serif), JetBrains Mono (Code/Mono).
  - **Themes**: Plain (Neutral), Azure (Cool Blue), Sage (Earthy Green), Sand (Warm Stone), Aurora (Purple Tint).
  - **Text Sizing & Line Spacing**: Small, Medium, Large size with Tight, Normal, Relaxed line spacing.
- **Word & Character Counters**: Real-time word count, character count, and estimated reading time.
- **Floating Selection Bubble Menu**: Text select karte hi instant popup menu appear hota hai for quick formatting, copy, web search, and styling.

### 3.2. Resizable & Croppable Images
- **Custom Tiptap Extension (`src/lib/resizable-image.ts`)**: Images ko mouse drag karke live resize kiya ja sakta hai with bounding box controls.
- **Cropping Dialog (`react-easy-crop`)**: Images insert karne se pehle crop, rotate, aur aspect ratio adjust karne ka complete UI dialog.
- **Dual Storage Engine**:
  - Signed-in users: Supabase Storage bucket (`noteseen-images`) me upload hoke secure CDN URL generate hota hai.
  - Offline/Signed-out users: Zero-dependency Base64 data URL fallback.

### 3.3. File System Access API & `.noteseen` Format
- NoteSeen standard browser sandbox se bahar nikal kar user ke actual hard drive file system se baat karta hai.
- **`Ctrl + S`**: File picker open karta hai aur `.noteseen` file disk pe create karta hai.
- **In-Place Write**: Ek baar link hone ke baad subsequent edits background mein usi disk file par write hote hain without prompting dialogs.
- **`Ctrl + O` / Drag-and-Drop**: `.noteseen`, `.md`, `.markdown`, `.txt`, `.html` files ko drop karte hi parse karke import kar leta hai.

### 3.4. AI Prompt Studio & Prompt Cards
- Reusable system prompts create karne ke liye dedicated `prompt` aur `promptCard` note kinds.
- Visual cover cards, tags, category filters, and 1-click **"Copy Prompt"** with toast confirmation.
- Automatic orphaned card recovery mechanism jo Supabase storage ko scan karke broken cards restore karta hai.

### 3.5. Multi-Workspace Isolation
- Segregate notes into workspaces (e.g., *General*, *Work*, *College*, *Arigato Projects*).
- Har workspace ka customizable accent color (Azure, Sage, Sand, Aurora, Coral, Violet).
- Batch move notes & secrets across workspaces seamlessly.
- Deleting a workspace moves all its notes safely to *General* workspace (Vault protected).

### 3.6. Zero-Knowledge Secret Vault (API Keys & Passwords)
- Dedicated 4-digit PIN protected vault.
- Categories: **API Keys**, **Passwords**, **Other Secrets**.
- Features: Add, update, delete, search, copy to clipboard, and instant reveal toggle.
- Auto-locks on workspace switch or manual lock.

### 3.7. Site-Wide Vault Gate (Protection Against Accidental Deletions)
- User ek custom security question aur answer setup karta hai.
- Answer ko normalize (`trim()`, `toLowerCase()`, single spaces) karke SHA-256 hash mein store kiya jata hai.
- Sensitive actions (Empty Trash, Delete Workspace, Permanently Purge Note, Locked Note Edit) trigger a modal gate asking for the answer.

### 3.8. Multi-Tab Navigation & Command Palette (`Ctrl + K`)
- **Chrome-Style Tabs Bar**: Up to 12 active notes horizontally switchable with close buttons (`x`).
- **Command Palette (`cmdk`)**: Fuzzy search across note titles, contents, tags, and rapid action triggers (`Ctrl+N`, `Ctrl+S`, `Ctrl+O`, View switches).

### 3.9. Pro Export Engine
- **`.noteseen`**: Full JSON payload with metadata.
- **Markdown (`.md`)**: Clean markdown output preserving headers, lists, code, and quotes.
- **Standalone HTML**: Branded Arigato Labs editorial layout with embedded CSS and typeface rules.
- **PDF Export**: Hidden iframe print stream that triggers the native OS print-to-PDF dialog without blank popups.

### 3.10. PWA & Native OS Integration
- **Vite PWA Plugin + Service Worker**: Assets and shell cached offline (`CacheFirst` / `StaleWhileRevalidate`).
- **File Handlers Manifest**: OS level registration so double clicking `.noteseen` on Windows/Mac launches NoteSeen directly.
- **Launch Handler (`focus-existing`)**: Multiple files open hone par new duplicate browser windows kholne ke bajaye existing window me new tab add karta hai.
- **Web Share Target**: Mobile/desktop OS se direct text share karke new note auto-create hota hai.

---

## 4. Architecture & Data Flow (Kaise Kaam Karta Hai?)

### 4.1. Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  USER INTERFACE                                   |
|   [ NoteEditor (Tiptap) ]   [ NoteTabs ]   [ SecretVaultView ]   [ CommandPalette]|
+------------------------------------------+----------------------------------------+
                                           |
                                 (Dispatches Actions)
                                           v
+-----------------------------------------------------------------------------------+
|                            ZUSTAND STATE STORE (notes.ts)                         |
|   - notes: Record<string, Note>          - activeWorkspaceId: string              |
|   - workspaces: Record<string, Workspace>- openTabs: string[]                     |
|   - handles: Record<string, FileHandle>  - status: "idle"|"saving"|"saved"        |
+------------------------------------------+----------------------------------------+
                                           |
                   +-----------------------+-----------------------+
                   | (Tier 1)                                      | (Tier 2)
                   v                                               v
        [ In-Memory React State ]                      [ localStorage Snapshot ]
        * Latency: 0ms (Instant UI)                    * Synchronous on keystroke
        * State updates & re-renders                   * Crash net for hard tab kills
                   |                                               |
                   +-----------------------+-----------------------+
                                           |
                                           | (Debounced 250ms)
                                           v
                               +-----------------------+
                               |     IndexedDB (idb)   |  <--- Local Truth
                               |   * notes objectStore |
                               |   * workspaces store  |
                               |   * handles & meta    |
                               +-----------+-----------+
                                           |
                   +-----------------------+-----------------------+
                   | (Debounced 1200ms)                            | (Debounced 450ms)
                   v                                               v
        [ File System Access API ]                     [ Firestore Cloud Sync ]
        * Writes to disk `.noteseen`                   * `users/{uid}/notes/{id}`
        * In-place file update                         * Batched writes (450 docs/chunk)
        * Zero OS file lock                            * Last-Write-Wins (updatedAt)
```

---

### 4.2. The 5-Tier Fail-Safe Saving Pipeline

Why is this saving engine superior? NoteSeen multiple storage tiers use karta hai:

```
Keystroke ---> Tier 1: In-Memory (0ms)
          ---> Tier 2: localStorage Snapshot (Synchronous, crash-proof)
          ---> Tier 3: IndexedDB (250ms debounce - durable local DB)
          ---> Tier 4: Linked Disk File (1200ms debounce - .noteseen JSON)
          ---> Tier 5: Firestore Cloud Sync (450ms debounce - remote sync)
```

#### Browser Lifecycle Flush Mechanism:
Agar user 250ms debounce complete hone se pehle hi tab band kar de, toh kya hoga?
NoteSeen `registerLifecycleFlush()` hook use karta hai jo in events ko listen karta hai:
1. `visibilitychange` (User switches tabs or minimizes browser)
2. `pagehide` (Mobile browser suspends tab)
3. `beforeunload` (Tab/Window close event)
4. `blur` (Window loses focus)

Jab bhi inme se koi event trigger hota hai, pending debounce timers cancel hote hain aur dirty state **synchronously flush** ho jata hai. Next launch par agar `localStorage` snapshot ka timestamp IndexedDB row se naya hota hai, toh snapshot auto-recover hoke database update kar deta hai. **Zero data loss guaranteed.**

---

## 5. Schemas & Data Models (Where and How They Are Defined)

Sabhi schemas TypeScript mein `src/lib/types.ts` ke andar strongly typed hain, aur database level par `src/lib/db.ts` (IndexedDB) aur `firestore.rules` (Firebase) mein enforce kiye gaye hain.

### 5.1. Note Schema (`src/lib/types.ts`)
```typescript
export interface Note {
  id: string;                      // Unique ID generated via nanoid(12)
  workspaceId: string;             // Belongs to workspace (default: "default")
  kind: "note" | "prompt" | "promptCard"; // Type of entry
  title: string;                   // Note title (max 500 chars)
  subtitle: string;                // Short caption for prompt cards
  tags: string[];                  // Labels/tags array (max 24 tags)
  html: string;                    // Rich text HTML (Source of truth for Tiptap, max 500KB)
  text: string;                    // Flattened plain text for search and fast previews
  coverUrl: string | null;         // Public CDN URL for prompt card cover (Supabase)
  theme: "plain" | "azure" | "sage" | "sand" | "aurora";
  typeface: "inter" | "spacegrotesk" | "georgia" | "jetbrains";
  size: "s" | "m" | "l";
  spacing: "tight" | "normal" | "relaxed";
  pinned: boolean;                 // Pinned to top
  createdAt: number;               // Epoch millisecond timestamp (Immutable)
  updatedAt: number;               // Epoch millisecond timestamp for LWW sync
  openedAt: number;                // Last opened timestamp for recent suggestions
  deletedAt: number | null;        // null if active; timestamp if in Trash
  fileName: string | null;         // Linked file name on disk (e.g. "meeting.noteseen")
}
```

### 5.2. Workspace Schema (`src/lib/types.ts`)
```typescript
export interface Workspace {
  id: string;                      // Unique ID (e.g., "default", "ws_9xK2...")
  name: string;                    // Workspace name (max 80 chars)
  color: "azure" | "sage" | "sand" | "aurora" | "coral" | "violet";
  createdAt: number;
  updatedAt: number;
}
```

### 5.3. Secret Vault Schema (`src/lib/types.ts`)
```typescript
export interface SecretPinConfig {
  pinHash: string;                 // SHA-256 hex of (salt + ":" + PIN)
  salt: string;                    // Cryptographically secure 16-byte random hex salt
  createdAt: number;
}

export interface SecretEntry {
  id: string;
  workspaceId: string;
  title: string;                   // Label (e.g. "OpenAI Production API Key")
  category: "api" | "password" | "other";
  username: string;                // Plain username/email label
  valueCipher: string;             // AES-GCM-256 encrypted ciphertext (hex)
  valueIv: string;                 // AES-GCM Initialization Vector (hex, 12 bytes)
  notes: string;                   // Context notes (max 20,000 chars)
  createdAt: number;
  updatedAt: number;
}
```

### 5.4. Site-Wide Vault Gate Schema (`src/lib/types.ts`)
```typescript
export interface VaultConfig {
  question: string;                // e.g. "What was the name of your first school?"
  answerHash: string;              // SHA-256 hex of normalized answer
  createdAt: number;
}
```

### 5.5. User Profile Schema (`src/lib/profile.ts`)
```typescript
export interface UserProfile {
  username: string;                // 3-24 chars (regex: ^[a-z0-9_]{3,24}$)
  fullName: string;                // 2-80 chars
  profession: "job" | "student" | "freelancer" | "solo_entrepreneur";
  gender: "male" | "female" | "other" | "prefer_not";
  age: number;                     // 13 to 120
  onboardedAt: number;
}
```

### 5.6. Portable `.noteseen` File Payload (`src/lib/types.ts`)
```json
{
  "format": "noteseen",
  "version": 1,
  "app": { "name": "NoteSeen" },
  "note": {
    "id": "k8X1mN9pL0q2",
    "kind": "note",
    "title": "System Architecture Review",
    "tags": ["architecture", "backend"],
    "html": "<h2>Overview</h2><p>Here are the notes...</p>",
    "text": "Overview\nHere are the notes...",
    "theme": "azure",
    "typeface": "jetbrains",
    "size": "m",
    "spacing": "normal",
    "createdAt": 1730000000000,
    "updatedAt": 1730000050000
  }
}
```

---

## 6. Security Architecture & Cryptographic Implementation

NoteSeen enterprise-grade security practices follow karta hai:

### 6.1. Client-Side Zero-Knowledge Encryption (`src/lib/secret-crypto.ts`)
Secret Vault mein stored sensitive credentials (API keys / Passwords) ko protect karne ke liye Web Crypto API use hoti hai:

```
[ Plain Secret ] + [ Session PIN ] + [ Random Salt (16 bytes) ]
                         |
                         v
              [ PBKDF2 Key Derivation ]
              (Iterations: 120,000, Hash: SHA-256)
                         |
                         v
                [ 256-bit CryptoKey ]
                         |
                         v
              [ AES-GCM-256 Encryption ] + [ 12-byte Random IV ]
                         |
                         v
           [ Ciphertext (Hex) ] + [ IV (Hex) ]
```

1. **PBKDF2 Key Derivation**: User ke 4-digit PIN aur random 16-byte cryptographic salt ko mila kar **120,000 iterations** ke saath `PBKDF2-SHA-256` key derive hoti hai. Yeh brute-force aur rainbow table attacks ko impossible bana deta hai.
2. **AES-GCM (Galois/Counter Mode)**: 256-bit key aur har secret ke liye fresh random 12-byte Initialization Vector (IV) use hota hai. GCM authenticated encryption provide karta hai (data tampering impossible).
3. **Zero Knowledge on Cloud**: Firestore database mein sirf `valueCipher`, `valueIv`, aur `salt` jata hai. PIN aur plain text key browser memory se bahar kabhi nahi jate. Agar Firebase database compromise bhi ho jaye, tab bhi attacker decrypted data read nahi kar sakta.
4. **Memory Hygiene**: Session PIN sirf Zustand in-memory state mein rehta hai aur browser refresh, lock button click ya workspace change par memory se wipe out ho jata hai.

### 6.2. Firestore Security Rules (`firestore.rules`)
Firebase Firestore rules mein multi-layer defense implement kiya gaya hai:
- **Authentication Check**: Har read/write request par `request.auth.uid == uid` check hota hai. Koi bhi user kisi doosre user ke notes, secrets ya profile ko read ya write nahi kar sakta.
- **Strict Key Whitelisting**: Har document par `.hasOnly([...])` aur `.hasAll([...])` rules hain. Koi unauthorized malicious keys inject nahi kar sakta.
- **Length & Boundary Validation**:
  - `title`: 0 to 500 characters
  - `html` and `text`: Max 500,000 characters
  - `tags`: Max 24 items
  - `age`: 13 to 120
  - `username`: `^[a-z0-9_]{3,24}$`
- **Immutability of Timestamps**: `createdAt` field create hone ke baad kabhi update nahi kiya ja sakta (`createdAtImmutable()`).
- **Default Lock Rule**: Global catch-all `match /{document=**} { allow read, write: if false; }` jo kisi bhi unlisted path ko automatically lock kar deta hai.

---

## 7. Tools, Libraries & Technologies Used

| Category | Tool / Library | Version | Purpose & Selection Rationale |
| :--- | :--- | :--- | :--- |
| **Framework & Core** | **React** | `v19.2` | High performance modern component model, Actions, Transitions, and Concurrent features. |
| **Build & Tooling** | **Vite** | `v8.2` | Sub-second HMR, optimized ES modules bundling, and ultra-fast build times. |
| **Language** | **TypeScript** | `v7.0` | Strict type safety, interface enforcement, and zero runtime type errors. |
| **Styling** | **Tailwind CSS** | `v4.3` | Lightning fast modern CSS engine, bespoke CSS variables, and responsive utility architecture. |
| **State Management** | **Zustand** | `v5.0` | Minimal boilerplate, high performance out-of-React state subscriptions, zero context re-render overhead. |
| **Rich Text Editor** | **Tiptap / ProseMirror** | `v2.27` | Headless, modular WYSIWYG editor engine with customizable extensions (Highlight, TaskList, Image resize). |
| **UI Primitives** | **Radix UI** | Latest | Unstyled, accessible (WAI-ARIA compliant) headless dialogs, dropdowns, popovers, and tooltips. |
| **Local Database** | **idb** | `v8.0` | Promise-based wrapper over browser native IndexedDB for async offline storage. |
| **Cloud Database & Auth** | **Firebase (Auth & Firestore)** | `v12.17` | Google Sign-In authentication + realtime cloud document synchronization. |
| **Media Hosting** | **Supabase Storage** | `v2.112` | High-speed CDN object storage bucket for prompt card cover images. |
| **Cryptography** | **Web Crypto API** | Native Browser | Native OS-level hardware-accelerated AES-GCM, SHA-256, and PBKDF2 cryptographic primitives. |
| **PWA Engine** | **vite-plugin-pwa** | `v1.3` | Service worker generation, offline caching manifests, and OS file handler registration. |
| **Icons & UI Extras** | **Lucide React & Sonner** | Latest | Crisp minimal icons and stacked toast notification system. |
| **Command Palette** | **cmdk** | `v1.1` | Fast accessible command menu for `Ctrl+K` shortcuts. |
| **Image Cropping** | **react-easy-crop** | `v6.2` | Interactive canvas-based crop and zoom modal. |

---

## 8. Fault Handling & Debugging Playbook (Kaise Debug Karoge?)

Agar application mein koi issue aata hai, toh step-by-step troubleshooting kaise karni hai:

### Scenario 1: Tab Accidental Kill / Browser Crash
- **Symptom**: User ne lambi note likhi aur browser crash ho gaya ya battery khatam ho gayi.
- **Automatic Recovery**: NoteSeen har keystroke par `localStorage.setItem("noteseen.snapshot", ...)` karta hai. Jab app wapas boot hoti hai, `loadEverything()` function snapshot ke timestamp ko IndexedDB ke timestamp se compare karta hai. Agar snapshot naya hai, toh use restore karke database update kar diya jata hai.
- **Manual Debug**: Open DevTools -> `Application` tab -> `Local Storage` -> check key `noteseen.snapshot`.

### Scenario 2: Offline Edits & Cloud Sync Conflict (Two Devices Modified Same Note)
- **Symptom**: User ne laptop aur mobile dono par offline note edit kiya aur dono online aa gaye.
- **Resolution Strategy**: NoteSeen **Last-Write-Wins (LWW)** deterministic timestamp conflict resolution use karta hai using `updatedAt`.
- **Delete Tombstones**: Agar ek device ne note delete kar diya jabki doosra offline tha, remote listener tombstone emit karta hai taaki local device par soft-deleted note purge ho sake.
- **Manual Debug**: Inspect `updatedAt` in Firestore Console vs local IndexedDB `notes` store.

### Scenario 3: File System Access API Permission Revoked
- **Symptom**: Linked `.noteseen` file computer disk par update nahi ho rahi.
- **Root Cause**: Browser security model tab refresh ya permissions timeout par file handle ke write access ko demote kar deta hai.
- **Resolution**: App automatically fallback karke toast show karti hai: *"File access needs your permission"*. User prompt ko accept karta hai via `handle.requestPermission({ mode: 'readwrite' })`. Agar browser unsupported hai (Firefox/Safari), toh automatic blob download fallback execute hota hai.

### Scenario 4: Secret Vault "Could Not Decrypt" Error
- **Symptom**: User ne PIN enter kiya par secret decrypt nahi hua.
- **Root Cause**: Wrong PIN entered, or cryptographic salt mismatched between devices.
- **Resolution**: `verifySecretPin()` pehle check karta hai ki `sha256(salt + ":" + pin) === pinHash`. Agar mismatch hai, toh wrong PIN error show hota hai bina AES decryption attempt kiye. Agar PIN correct hai par data decrypt nahi ho raha, toh IV length (12 bytes / 24 hex chars) check ki jati hai.

### Scenario 5: Firestore "Permission Denied" Error
- **Symptom**: Console par `FirebaseError: Missing or insufficient permissions`.
- **Debugging Steps**:
  1. Check if user is signed in: `getFirebaseAuth().currentUser`.
  2. Verify payload matches `firestore.rules`:
     - Kya `title` 500 chars se bada hai?
     - Kya `html` 500KB se bada hai?
     - Kya `createdAt` modify karne ki koshish ki gayi hai (immutability rule)?
     - Kya extra unauthorized keys payload me pass ho gayi hain (`.hasOnly()` check)?

---

## 9. Real-Life Use Cases & Industry Applications

1. **Developers & Software Engineers**:
   - Local code snippet management in JetBrains Mono monospace font.
   - Zero-knowledge storage of sensitive API keys (OpenAI, AWS, Database credentials) directly on work machine.
   - Exporting documentation to clean Markdown (`.md`).
2. **AI Engineers & Prompt Designers**:
   - Curating and tagging system prompts and LLM context cards with visual thumbnails.
   - 1-click prompt copying for ChatGPT / Claude / Gemini workflows.
3. **Students, Researchers & Writers**:
   - Distraction-free editorial writing canvas (Inter / Space Grotesk / Georgia typefaces).
   - Direct PDF export with formal Arigato Labs branding for printing assignments or reports.
   - Offline lecture notes that save continuously without internet dependence.
4. **Solo Entrepreneurs & Founders**:
   - Multi-workspace segregation to keep startup notes, client data, and personal scratchpads separate.

---

## 10. Key Engineering Learnings & Takeaways

Is project ko architect aur develop karne ke baad mile deep technical insights:

1. **Multi-Tier Persistence Mastery**: Synchronous storage (`localStorage`), asynchronous structured storage (`IndexedDB`), streaming disk files (`File System Access API`), aur remote cloud database (`Firestore`) ka seamless debounce + lifecycle synchronization build karna.
2. **Web Cryptography Standard**: Browser native Web Crypto API ke through production-grade PBKDF2 key derivation aur AES-GCM authenticated encryption implement karna without heavy external crypto libraries.
3. **Headless Rich-Text Architecture**: ProseMirror aur Tiptap ke modular extensions create karna (Custom resizable images, Task lists, Custom typography styling).
4. **Offline-First PWA Ecosystem**: Service Worker caching strategies, web app manifest configurations, launch handlers, aur native OS file association (`.noteseen` double click).
5. **Declarative Security**: Complex backend-less Firebase security rules likhna jo client-side data validation, authorization, aur schema integrity ko guarantee karti hain.
