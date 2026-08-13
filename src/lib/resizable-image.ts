import Image from "@tiptap/extension-image";
import type { NodeViewRendererProps } from "@tiptap/core";

const MIN_PCT = 20;
const MAX_PCT = 100;
const HANDLES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
type HandleDir = (typeof HANDLES)[number];

function clampPct(value: number): number {
  return Math.min(MAX_PCT, Math.max(MIN_PCT, Math.round(value)));
}

function widthToPct(width: unknown): number {
  if (typeof width !== "string") return MAX_PCT;
  const match = width.trim().match(/^(\d+(?:\.\d+)?)%$/);
  if (match) return clampPct(Number(match[1]));
  return MAX_PCT;
}

function rotateToDeg(rotate: unknown): number {
  const value = typeof rotate === "number" ? rotate : Number(rotate);
  if (!Number.isFinite(value)) return 0;
  return ((Math.round(value) % 360) + 360) % 360;
}

function parseRotate(element: HTMLElement): number {
  const attr = element.getAttribute("data-rotate");
  if (attr) return rotateToDeg(attr);
  const match = element.style.transform.match(/rotate\((-?\d+(?:\.\d+)?)deg\)/);
  return match ? rotateToDeg(match[1]) : 0;
}

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (element) => {
          const style = element.style.width;
          if (style) return style;
          const attr = element.getAttribute("width");
          if (attr) return attr.includes("%") ? attr : `${attr}px`;
          return "100%";
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { style: `width: ${attributes.width}; height: auto;` };
        },
      },
      rotate: {
        default: 0,
        parseHTML: parseRotate,
        renderHTML: (attributes) => {
          const deg = rotateToDeg(attributes.rotate);
          if (!deg) return {};
          return { "data-rotate": String(deg) };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, editor }: NodeViewRendererProps) => {
      const wrap = document.createElement("div");
      wrap.className = "ns-img-wrap";
      wrap.contentEditable = "false";

      const box = document.createElement("div");
      box.className = "ns-img-box";

      const img = document.createElement("img");
      img.src = node.attrs.src ?? "";
      img.alt = node.attrs.alt ?? "";
      if (node.attrs.title) img.title = node.attrs.title;

      const frame = document.createElement("div");
      frame.className = "ns-img-frame";

      const handleEls = new Map<HandleDir, HTMLButtonElement>();
      for (const dir of HANDLES) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = `ns-img-box-handle is-${dir}`;
        el.dataset.dir = dir;
        el.tabIndex = -1;
        el.setAttribute("aria-label", `Resize ${dir}`);
        handleEls.set(dir, el);
        frame.append(el);
      }

      const rotator = document.createElement("button");
      rotator.type = "button";
      rotator.className = "ns-img-rotate";
      rotator.tabIndex = -1;
      rotator.setAttribute("aria-label", "Rotate");
      frame.append(rotator);

      const tools = document.createElement("div");
      tools.className = "ns-img-tools";

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = String(MIN_PCT);
      slider.max = String(MAX_PCT);
      slider.step = "1";
      slider.className = "ns-img-slider";
      slider.setAttribute("aria-label", "Image size");

      const label = document.createElement("span");
      label.className = "ns-img-size";

      tools.append(slider, label);
      box.append(img, frame);
      wrap.append(box, tools);

      const apply = (pct: number, deg: number) => {
        const nextPct = clampPct(pct);
        const nextDeg = rotateToDeg(deg);
        wrap.style.width = `${nextPct}%`;
        img.style.transform = nextDeg ? `rotate(${nextDeg}deg)` : "";
        slider.value = String(nextPct);
        label.textContent = nextDeg ? `${nextPct}% · ${nextDeg}°` : `${nextPct}%`;
        return { pct: nextPct, deg: nextDeg };
      };

      const commit = (pct: number, deg: number) => {
        const next = apply(pct, deg);
        if (!editor.isEditable) return;
        editor.commands.updateAttributes("image", {
          width: `${next.pct}%`,
          rotate: next.deg,
        });
      };

      let pct = widthToPct(node.attrs.width);
      let deg = rotateToDeg(node.attrs.rotate);
      apply(pct, deg);

      const onSlide = () => {
        pct = apply(Number(slider.value), deg).pct;
      };
      const onSlideEnd = () => commit(Number(slider.value), deg);
      slider.addEventListener("input", onSlide);
      slider.addEventListener("change", onSlideEnd);

      let drag: {
        kind: "resize" | "rotate";
        dir?: HandleDir;
        startX: number;
        startY: number;
        startPct: number;
        startDeg: number;
        cx: number;
        cy: number;
      } | null = null;

      const onPointerMove = (event: PointerEvent) => {
        if (!drag) return;
        if (drag.kind === "rotate") {
          const angle = (Math.atan2(event.clientY - drag.cy, event.clientX - drag.cx) * 180) / Math.PI;
          const start = (Math.atan2(drag.startY - drag.cy, drag.startX - drag.cx) * 180) / Math.PI;
          deg = apply(pct, drag.startDeg + (angle - start)).deg;
          return;
        }

        const parent = wrap.parentElement;
        if (!parent) return;
        const parentW = parent.getBoundingClientRect().width;
        const boxH = box.getBoundingClientRect().height;
        if (parentW <= 0) return;

        const dir = drag.dir ?? "e";
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        const xSign = dir.includes("e") ? 1 : dir.includes("w") ? -1 : 0;
        const ySign = dir.includes("s") ? 1 : dir.includes("n") ? -1 : 0;
        const fromX = xSign * dx;
        const fromY = ySign * dy * (parentW / Math.max(boxH, 1));
        const delta =
          xSign && ySign ? (fromX + fromY) / 2 : xSign ? fromX : fromY;
        pct = apply(drag.startPct + (delta / parentW) * 100, deg).pct;
      };

      const onPointerUp = () => {
        if (!drag) return;
        drag = null;
        window.removeEventListener("pointermove", onPointerMove);
        commit(pct, deg);
      };

      const startDrag = (event: PointerEvent, kind: "resize" | "rotate", dir?: HandleDir) => {
        if (!editor.isEditable) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = box.getBoundingClientRect();
        drag = {
          kind,
          dir,
          startX: event.clientX,
          startY: event.clientY,
          startPct: pct,
          startDeg: deg,
          cx: rect.left + rect.width / 2,
          cy: rect.top + rect.height / 2,
        };
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp, { once: true });
      };

      const handleListeners: Array<[HTMLButtonElement, (event: PointerEvent) => void]> = [];
      for (const [dir, el] of handleEls) {
        const onDown = (event: PointerEvent) => startDrag(event, "resize", dir);
        el.addEventListener("pointerdown", onDown);
        handleListeners.push([el, onDown]);
      }
      const onRotateDown = (event: PointerEvent) => startDrag(event, "rotate");
      rotator.addEventListener("pointerdown", onRotateDown);

      return {
        dom: wrap,
        update(updated) {
          if (updated.type.name !== "image") return false;
          img.src = updated.attrs.src ?? "";
          img.alt = updated.attrs.alt ?? "";
          img.title = updated.attrs.title ?? "";
          pct = widthToPct(updated.attrs.width);
          deg = rotateToDeg(updated.attrs.rotate);
          apply(pct, deg);
          return true;
        },
        selectNode() {
          wrap.classList.add("is-selected");
        },
        deselectNode() {
          wrap.classList.remove("is-selected");
        },
        destroy() {
          slider.removeEventListener("input", onSlide);
          slider.removeEventListener("change", onSlideEnd);
          rotator.removeEventListener("pointerdown", onRotateDown);
          for (const [el, onDown] of handleListeners) {
            el.removeEventListener("pointerdown", onDown);
          }
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
        },
      };
    };
  },
});
