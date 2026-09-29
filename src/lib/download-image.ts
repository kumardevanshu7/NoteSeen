import { toast } from "sonner";

/**
 * Downloads an image from a Data URL, Blob URL, or remote HTTP/CDN URL.
 * Handles CORS with graceful fallbacks and triggers native browser save dialog.
 */
export async function downloadImage(src: string, suggestedName?: string): Promise<boolean> {
  if (!src) {
    toast.error("No image to download");
    return false;
  }

  try {
    let fileName = suggestedName?.trim();
    if (!fileName) {
      fileName = `noteseen-picture-${Date.now()}`;
    }

    // Clean up unsafe file name characters
    fileName = fileName.replace(/[<>:"/\\|?*]+/g, "-");

    // Add appropriate extension if missing
    if (!/\.[a-zA-Z0-9]{3,4}$/.test(fileName)) {
      if (src.startsWith("data:image/jpeg")) {
        fileName += ".jpg";
      } else if (src.startsWith("data:image/webp")) {
        fileName += ".webp";
      } else if (src.startsWith("data:image/gif")) {
        fileName += ".gif";
      } else if (src.startsWith("data:image/svg")) {
        fileName += ".svg";
      } else {
        fileName += ".png";
      }
    }

    if (src.startsWith("data:") || src.startsWith("blob:")) {
      const anchor = document.createElement("a");
      anchor.href = src;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      toast.success("Picture downloaded!");
      return true;
    }

    // Remote HTTP / HTTPS URL (e.g. Supabase Storage CDN)
    try {
      const response = await fetch(src, { mode: "cors" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      toast.success("Picture downloaded!");
      return true;
    } catch {
      // Direct anchor click fallback if CORS blocks fetch
      const anchor = document.createElement("a");
      anchor.href = src;
      anchor.download = fileName;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      toast.success("Picture download initiated!");
      return true;
    }
  } catch (err) {
    console.error("Failed to download picture", err);
    toast.error("Could not download picture");
    return false;
  }
}
