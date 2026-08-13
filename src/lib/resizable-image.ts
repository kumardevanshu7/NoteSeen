import Image from "@tiptap/extension-image";
import type { NodeViewRendererProps } from "@tiptap/core";

const MIN_PCT = 25;
const MAX_PCT = 100;

function clampPct(value: number): number {
  return Math.min(MAX_PCT, Math.max(MIN_PCT, Math.round(value)));
}

function widthToPct(width: unknown): number {
  if (typeof width !== "string") return MAX_PCT;
  const match = width.trim().match(/^(\d+(?:\.\d+)?)%$/);
  if (match) return clampPct(Number(match[1]));
  return MAX_PCT;
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
    };
  },

  addNodeView() {
    return ({ node, editor }: NodeViewRendererProps) => {
      const wrap = document.createElement("div");
      wrap.className = "ns-img-wrap";
      wrap.contentEditable = "false";

      const img = document.createElement("img");
      img.src = node.attrs.src ?? "";
      img.alt = node.attrs.alt ?? "";
      if (node.attrs.title) img.title = node.attrs.title;

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

      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "ns-img-handle";
      handle.setAttribute("aria-label", "Drag to resize");
      handle.tabIndex = -1;

      tools.append(slider, label);
      wrap.append(img, handle, tools);

      const apply = (pct: number) => {
        const next = clampPct(pct);
        wrap.style.width = `${next}%`;
        slider.value = String(next);
        label.textContent = `${next}%`;
        return next;
      };

      const commit = (pct: number) => {
        const next = apply(pct);
        if (!editor.isEditable) return;
        editor.commands.updateAttributes("image", { width: `${next}%` });
      };

      apply(widthToPct(node.attrs.width));

      const onSlide = () => apply(Number(slider.value));
      const onSlideEnd = () => commit(Number(slider.value));
      slider.addEventListener("input", onSlide);
      slider.addEventListener("change", onSlideEnd);

      let drag: { startX: number; startPct: number } | null = null;

      const onPointerMove = (event: PointerEvent) => {
        if (!drag) return;
        const parent = wrap.parentElement;
        if (!parent) return;
        const parentW = parent.getBoundingClientRect().width;
        if (parentW <= 0) return;
        const dx = event.clientX - drag.startX;
        apply(drag.startPct + (dx / parentW) * 100);
      };

      const onPointerUp = () => {
        if (!drag) return;
        drag = null;
        window.removeEventListener("pointermove", onPointerMove);
        commit(Number(slider.value));
      };

      const onPointerDown = (event: PointerEvent) => {
        if (!editor.isEditable) return;
        event.preventDefault();
        event.stopPropagation();
        drag = { startX: event.clientX, startPct: Number(slider.value) };
        handle.setPointerCapture(event.pointerId);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp, { once: true });
      };

      handle.addEventListener("pointerdown", onPointerDown);

      return {
        dom: wrap,
        update(updated) {
          if (updated.type.name !== "image") return false;
          img.src = updated.attrs.src ?? "";
          img.alt = updated.attrs.alt ?? "";
          img.title = updated.attrs.title ?? "";
          apply(widthToPct(updated.attrs.width));
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
          handle.removeEventListener("pointerdown", onPointerDown);
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
        },
      };
    };
  },
});
