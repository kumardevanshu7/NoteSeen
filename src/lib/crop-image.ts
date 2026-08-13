import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Could not read that image.")));
    image.src = src;
  });
}

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export async function cropImageToFile(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number,
  fileName: string,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not edit that image.");

  const safe = ((rotation % 360) + 360) % 360;
  const sin = Math.abs(Math.sin(rad(safe)));
  const cos = Math.abs(Math.cos(rad(safe)));
  const boundW = image.width * cos + image.height * sin;
  const boundH = image.width * sin + image.height * cos;

  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));

  ctx.translate(-pixelCrop.x, -pixelCrop.y);
  ctx.translate(boundW / 2, boundH / 2);
  ctx.rotate(rad(safe));
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const base = fileName.replace(/\.[^.]+$/, "") || "image";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Could not crop that image."))),
      "image/jpeg",
      0.88,
    );
  });

  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
