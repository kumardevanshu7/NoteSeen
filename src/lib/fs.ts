/**
 * Thin wrappers over the File System Access API.
 *
 * The API is described with local interfaces instead of relying on the DOM lib,
 * because browser support (and therefore the typings shipped with TypeScript)
 * still varies. Handles are structured-cloneable, so they can be stored in
 * IndexedDB and reused to write a note back to the exact same file later.
 */

export interface NsWritableStream {
  write(data: string | Blob | BufferSource): Promise<void>;
  close(): Promise<void>;
}

export interface NsFileHandle {
  readonly name: string;
  getFile(): Promise<File>;
  createWritable?(options?: { keepExistingData?: boolean }): Promise<NsWritableStream>;
  queryPermission?(descriptor: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  isSameEntry?(other: NsFileHandle): Promise<boolean>;
}

export interface FilePickerAccept {
  description?: string;
  accept: Record<string, string[]>;
}

interface OpenPickerOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: FilePickerAccept[];
  id?: string;
  startIn?: string;
}

interface SavePickerOptions extends OpenPickerOptions {
  suggestedName?: string;
}

interface PickerWindow {
  showOpenFilePicker?: (options?: OpenPickerOptions) => Promise<NsFileHandle[]>;
  showSaveFilePicker?: (options?: SavePickerOptions) => Promise<NsFileHandle>;
  launchQueue?: {
    setConsumer(consumer: (params: { files?: unknown[]; targetURL?: string }) => void): void;
  };
}

function pickerWindow(): PickerWindow {
  return window as unknown as PickerWindow;
}

export function supportsFileSystemAccess(): boolean {
  const w = pickerWindow();
  return typeof w.showOpenFilePicker === "function" && typeof w.showSaveFilePicker === "function";
}

export function supportsFileHandling(): boolean {
  return typeof pickerWindow().launchQueue !== "undefined";
}

/** Thrown-away cancel: the pickers reject with AbortError when dismissed. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function openFilePicker(options: OpenPickerOptions): Promise<NsFileHandle[]> {
  const picker = pickerWindow().showOpenFilePicker;
  if (!picker) return [];
  return picker(options);
}

export async function saveFilePicker(options: SavePickerOptions): Promise<NsFileHandle | null> {
  const picker = pickerWindow().showSaveFilePicker;
  if (!picker) return null;
  return picker(options);
}

export async function ensurePermission(
  handle: NsFileHandle,
  mode: "read" | "readwrite",
): Promise<boolean> {
  if (!handle.queryPermission) return true;
  if ((await handle.queryPermission({ mode })) === "granted") return true;
  if (!handle.requestPermission) return false;
  return (await handle.requestPermission({ mode })) === "granted";
}

export async function writeHandle(handle: NsFileHandle, contents: string): Promise<void> {
  if (!handle.createWritable) throw new Error("This browser cannot write files in place.");
  const writable = await handle.createWritable();
  await writable.write(contents);
  await writable.close();
}

/** Last-resort export for browsers without the File System Access API. */
export function downloadFile(fileName: string, contents: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function consumeLaunchFiles(handler: (handles: NsFileHandle[]) => void): void {
  const queue = pickerWindow().launchQueue;
  if (!queue) return;
  queue.setConsumer((params) => {
    const files = (params.files ?? []) as NsFileHandle[];
    if (files.length > 0) handler(files);
  });
}
