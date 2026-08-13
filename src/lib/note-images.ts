import { nanoid } from "nanoid";
import { toast } from "sonner";
import type { Editor } from "@tiptap/react";
import { useAuth } from "@/store/auth";
import { useImageEdit } from "@/store/image-edit";
import { getSupabase, isImageStorageConfigured, NOTE_IMAGE_BUCKET } from "@/lib/supabase";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export function imageFilesFromData(data: DataTransfer | null | undefined): File[] {
  if (!data) return [];
  const fromFiles = Array.from(data.files ?? []).filter((file) => file.type.startsWith("image/"));
  if (fromFiles.length > 0) return fromFiles;
  return Array.from(data.items ?? [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
}

function assertImageFile(file: File): void {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Use JPG, PNG, GIF, or WebP.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("That image is over 5 MB.");
  }
}

export async function uploadPublicImage(file: File, noteId: string): Promise<string> {
  if (!isImageStorageConfigured()) {
    throw new Error("Image hosting is not configured.");
  }
  assertImageFile(file);

  const uid = useAuth.getState().user?.uid;
  if (!uid) throw new Error("Sign in to upload images.");

  const ext = EXT[file.type] ?? "jpg";
  const path = `${uid}/${noteId}/${nanoid(10)}.${ext}`;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(NOTE_IMAGE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(NOTE_IMAGE_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("Could not get image URL.");
  return data.publicUrl;
}

export function queueNoteImages(files: File[], noteId: string): void {
  const images = files.filter((file) => file.type.startsWith("image/"));
  if (images.length === 0) return;
  useImageEdit.getState().queue(images, noteId);
}

export async function insertImagesIntoEditor(
  editor: Editor,
  files: File[],
  noteId: string,
): Promise<void> {
  const images = files.filter((file) => file.type.startsWith("image/"));
  if (images.length === 0) return;

  const toastId = toast.loading(images.length === 1 ? "Uploading image…" : `Uploading ${images.length} images…`);
  let ok = 0;
  try {
    for (const file of images) {
      try {
        const src = await uploadPublicImage(file, noteId);
        const alt = file.name.replace(/\.[^.]+$/, "") || "image";
        editor.chain().focus().setImage({ src, alt, width: "100%" }).run();
        ok += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        toast.error(file.name, { description: message });
      }
    }
  } finally {
    toast.dismiss(toastId);
  }
  if (ok > 0) {
    toast.success(ok === 1 ? "Image added" : `${ok} images added`);
  }
}
