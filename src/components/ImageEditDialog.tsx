import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { RotateCcw, RotateCw, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cropImageToFile } from "@/lib/crop-image";
import { insertImagesIntoEditor } from "@/lib/note-images";
import { useEditorStore } from "@/store/editor";
import { useImageEdit } from "@/store/image-edit";

const ASPECTS = [
  { id: "free", label: "Free" },
  { id: "square", label: "1:1" },
  { id: "43", label: "4:3" },
  { id: "169", label: "16:9" },
] as const;

export function ImageEditDialog() {
  const files = useImageEdit((state) => state.files);
  const index = useImageEdit((state) => state.index);
  const noteId = useImageEdit((state) => state.noteId);
  const next = useImageEdit((state) => state.next);
  const close = useImageEdit((state) => state.close);
  const editor = useEditorStore((state) => state.editor);

  const file = files[index] ?? null;
  const open = Boolean(file && noteId);

  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectId, setAspectId] = useState<(typeof ASPECTS)[number]["id"]>("free");
  const [mediaAspect, setMediaAspect] = useState(4 / 3);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const aspect =
    aspectId === "square" ? 1 : aspectId === "43" ? 4 / 3 : aspectId === "169" ? 16 / 9 : mediaAspect;

  useEffect(() => {
    if (!file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspectId("free");
    setPixels(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onConfirm = async () => {
    if (!file || !src || !pixels || !noteId || !editor) {
      toast.error("Nothing to insert");
      return;
    }
    setBusy(true);
    try {
      const cropped = await cropImageToFile(src, pixels, rotation, file.name);
      await insertImagesIntoEditor(editor, [cropped], noteId);
      next();
    } catch (error) {
      toast.error("Could not add that image", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <DialogContent className="max-w-2xl" showClose={!busy}>
        <DialogHeader>
          <DialogTitle>Edit image</DialogTitle>
          <DialogDescription>
            Crop, zoom, and rotate, then add it to the note.
            {files.length > 1 ? ` ${index + 1} of ${files.length}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[min(52vh,22rem)] overflow-hidden rounded-sm bg-stone">
          {src ? (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onMediaLoaded={(size) => {
                if (size.naturalWidth > 0 && size.naturalHeight > 0) {
                  setMediaAspect(size.naturalWidth / size.naturalHeight);
                }
              }}
              onCropComplete={(_, area) => setPixels(area)}
            />
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {ASPECTS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setAspectId(option.id)}
              className={
                aspectId === option.id
                  ? "rounded-full bg-stone px-3 py-1 text-[12px] font-medium text-ink"
                  : "rounded-full px-3 py-1 text-[12px] text-body-muted hover:bg-stone/60 hover:text-ink"
              }
            >
              {option.label}
            </button>
          ))}
          <span className="flex-1" />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Rotate left"
            onClick={() => setRotation((value) => value - 90)}
          >
            <RotateCcw />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Rotate right"
            onClick={() => setRotation((value) => value + 90)}
          >
            <RotateCw />
          </Button>
        </div>

        <label className="mt-3 flex items-center gap-3 text-[12px] text-muted">
          <ZoomIn className="size-3.5 shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-current"
            aria-label="Zoom"
          />
        </label>

        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          {files.length > 1 ? (
            <Button variant="outline" onClick={next} disabled={busy}>
              Skip
            </Button>
          ) : null}
          <Button variant="primary" onClick={() => void onConfirm()} disabled={busy || !pixels}>
            {busy ? "Adding…" : "Add to note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
