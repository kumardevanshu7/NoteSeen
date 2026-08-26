import { mergeAttributes, Node, nodeInputRule } from "@tiptap/core";
import type { NodeViewRendererProps } from "@tiptap/core";

const MIN_PCT = 20;
const MAX_PCT = 100;
const HANDLES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
type HandleDir = (typeof HANDLES)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: string;
        rotate?: number;
      }) => ReturnType;
    };
  }
}

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

export const ResizableImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: {
        default: "100%",
        parseHTML: (element) => element.style.width || element.getAttribute("width") || "100%",
        renderHTML: (attributes) =>
          attributes.width ? { style: `width: ${attributes.width}; height: auto;` } : {},
      },
      rotate: {
        default: 0,
        parseHTML: (element) => rotateToDeg(element.getAttribute("data-rotate")),
        renderHTML: (attributes) => {
          const deg = rotateToDeg(attributes.rotate);
          return deg ? { "data-rotate": String(deg) } : {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: options }),
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, src, title] = match;
          return { src, alt, title };
        },
      }),
    ];
  },

  addNodeView() {
    return ({ node, editor, getPos }: NodeViewRendererProps) => {
      const wrap = document.createElement("div");
      wrap.className = "ns-img-wrap";
      wrap.contentEditable = "false";

      const box = document.createElement("div");
      box.className = "ns-img-box";

      const img = document.createElement("img");
      img.src = node.attrs.src ?? "";
      img.alt = node.attrs.alt ?? "";
      if (node.attrs.title) img.title = node.attrs.title;
      img.draggable = false;

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

      const presetsWrap = document.createElement("div");
      presetsWrap.className = "ns-img-presets";

      const PRESETS = [25, 50, 75, 100];
      for (const p of PRESETS) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ns-img-preset-btn";
        btn.textContent = `${p}%`;
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          pct = p;
          commit(p, deg);
        });
        presetsWrap.append(btn);
      }

      tools.append(slider, label, presetsWrap);
      box.append(img, frame);
      wrap.append(box, tools);

      const apply = (nextPct: number, nextDeg: number) => {
        const pct = clampPct(nextPct);
        const deg = rotateToDeg(nextDeg);
        wrap.style.width = `${pct}%`;
        img.style.transform = deg ? `rotate(${deg}deg)` : "";
        slider.value = String(pct);
        label.textContent = deg ? `${pct}% · ${deg}°` : `${pct}%`;
        return { pct, deg };
      };

      const commit = (nextPct: number, nextDeg: number) => {
        const value = apply(nextPct, nextDeg);
        if (!editor.isEditable) return;
        editor.commands.updateAttributes("image", {
          width: `${value.pct}%`,
          rotate: value.deg,
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
        const delta = xSign && ySign ? (fromX + fromY) / 2 : xSign ? fromX : fromY;
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
        selectSelf();
        wrap.classList.add("is-selected", "is-transforming");
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

      const selectSelf = () => {
        if (typeof getPos !== "function") return;
        const pos = getPos();
        if (typeof pos === "number") editor.chain().focus().setNodeSelection(pos).run();
      };

      const onBoxDown = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest(".ns-img-box-handle, .ns-img-rotate, .ns-img-slider, .ns-img-preset-btn")) return;
        selectSelf();
        wrap.classList.add("is-selected", "is-transforming");
      };
      const onDblClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        wrap.classList.add("is-selected", "is-transforming");
        selectSelf();
      };
      box.addEventListener("mousedown", onBoxDown);
      box.addEventListener("dblclick", onDblClick);

      return {
        dom: wrap,
        ignoreMutation: () => true,
        stopEvent(event) {
          const target = event.target as HTMLElement;
          return Boolean(target.closest(".ns-img-box-handle, .ns-img-rotate, .ns-img-slider, .ns-img-preset-btn"));
        },
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
          wrap.classList.add("is-selected", "is-transforming");
        },
        deselectNode() {
          wrap.classList.remove("is-selected", "is-transforming");
        },
        destroy() {
          slider.removeEventListener("input", onSlide);
          slider.removeEventListener("change", onSlideEnd);
          rotator.removeEventListener("pointerdown", onRotateDown);
          box.removeEventListener("mousedown", onBoxDown);
          box.removeEventListener("dblclick", onDblClick);
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
