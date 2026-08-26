import { mergeAttributes, Node, nodeInputRule } from "@tiptap/core";
import type { NodeViewRendererProps } from "@tiptap/core";

const MIN_PCT = 15;
const MAX_PCT = 100;
const HANDLES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
type HandleDir = (typeof HANDLES)[number];
type ImageAlign = "left" | "center" | "right";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: string;
        align?: ImageAlign;
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
      align: {
        default: "center",
        parseHTML: (element) => (element.getAttribute("data-align") as ImageAlign) || "center",
        renderHTML: (attributes) => ({ "data-align": attributes.align || "center" }),
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

      let align = (node.attrs.align as ImageAlign) || "center";
      wrap.dataset.align = align;

      const box = document.createElement("div");
      box.className = "ns-img-box";

      const img = document.createElement("img");
      img.src = node.attrs.src ?? "";
      img.alt = node.attrs.alt ?? "";
      if (node.attrs.title) img.title = node.attrs.title;
      img.draggable = false;

      // Drag Grip handle for moving the image within the note editor
      const grip = document.createElement("div");
      grip.className = "ns-img-grip";
      grip.draggable = true;
      grip.setAttribute("title", "Drag to move image anywhere in note");
      grip.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="9" cy="5" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="9" cy="19" r="1.2"/><circle cx="15" cy="5" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="15" cy="19" r="1.2"/></svg><span>Drag to move</span>`;

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

      // Notion-style floating toolbar
      const tools = document.createElement("div");
      tools.className = "ns-img-tools";

      // Alignment Group
      const alignGroup = document.createElement("div");
      alignGroup.className = "ns-img-align-group";

      const ALIGN_OPTS: Array<{ id: ImageAlign; label: string; icon: string }> = [
        {
          id: "left",
          label: "Align left",
          icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
        },
        {
          id: "center",
          label: "Align center",
          icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="19" y1="12" x2="5" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/></svg>`,
        },
        {
          id: "right",
          label: "Align right",
          icon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,
        },
      ];

      const alignButtons = new Map<ImageAlign, HTMLButtonElement>();
      for (const opt of ALIGN_OPTS) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `ns-img-align-btn ${opt.id === align ? "is-active" : ""}`;
        btn.setAttribute("title", opt.label);
        btn.innerHTML = opt.icon;
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          align = opt.id;
          wrap.dataset.align = align;
          for (const [k, b] of alignButtons) {
            b.classList.toggle("is-active", k === align);
          }
          if (editor.isEditable) {
            editor.commands.updateAttributes("image", { align });
          }
        });
        alignButtons.set(opt.id, btn);
        alignGroup.append(btn);
      }

      // Preset buttons: 25%, 50%, 75%, 100%
      const presetsWrap = document.createElement("div");
      presetsWrap.className = "ns-img-presets";

      const presetButtons = new Map<number, HTMLButtonElement>();
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
          updatePresetHighlights();
        });
        presetButtons.set(p, btn);
        presetsWrap.append(btn);
      }

      const updatePresetHighlights = () => {
        for (const [p, b] of presetButtons) {
          b.classList.toggle("is-active", Math.abs(pct - p) <= 2);
        }
      };

      // Range slider
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = String(MIN_PCT);
      slider.max = String(MAX_PCT);
      slider.step = "1";
      slider.className = "ns-img-slider";
      slider.setAttribute("aria-label", "Image size");

      const label = document.createElement("span");
      label.className = "ns-img-size";

      // Delete button
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "ns-img-del-btn";
      delBtn.setAttribute("title", "Delete image");
      delBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
      delBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof getPos === "function") {
          const pos = getPos();
          if (typeof pos === "number") {
            editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
          }
        }
      });

      tools.append(alignGroup, presetsWrap, slider, label, delBtn);
      box.append(img, grip, frame);
      wrap.append(box, tools);

      const apply = (nextPct: number, nextDeg: number) => {
        const p = clampPct(nextPct);
        const d = rotateToDeg(nextDeg);
        wrap.style.width = `${p}%`;
        img.style.transform = d ? `rotate(${d}deg)` : "";
        slider.value = String(p);
        label.textContent = d ? `${p}% · ${d}°` : `${p}%`;
        updatePresetHighlights();
        return { pct: p, deg: d };
      };

      const commit = (nextPct: number, nextDeg: number) => {
        const value = apply(nextPct, nextDeg);
        if (!editor.isEditable) return;
        editor.commands.updateAttributes("image", {
          width: `${value.pct}%`,
          rotate: value.deg,
          align,
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
        if (parentW <= 0) return;

        const dir = drag.dir ?? "e";
        const dx = event.clientX - drag.startX;
        const xSign = dir.includes("e") ? 1 : dir.includes("w") ? -1 : 0;

        let deltaPct = 0;
        if (xSign !== 0) {
          deltaPct = ((dx * xSign) / parentW) * 100;
        } else {
          const dy = event.clientY - drag.startY;
          const ySign = dir.includes("s") ? 1 : dir.includes("n") ? -1 : 0;
          deltaPct = ((dy * ySign) / Math.max(box.getBoundingClientRect().height, 1)) * 100;
        }

        pct = apply(drag.startPct + deltaPct, deg).pct;
      };

      const onPointerUp = () => {
        if (!drag) return;
        drag = null;
        document.body.classList.remove("select-none");
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        commit(pct, deg);
      };

      const startDrag = (event: PointerEvent, kind: "resize" | "rotate", dir?: HandleDir) => {
        if (!editor.isEditable) return;
        event.preventDefault();
        event.stopPropagation();
        const targetEl = event.currentTarget as HTMLElement | null;
        if (targetEl && typeof targetEl.setPointerCapture === "function") {
          try {
            targetEl.setPointerCapture(event.pointerId);
          } catch {
            // ignore
          }
        }
        document.body.classList.add("select-none");
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
        window.addEventListener("pointerup", onPointerUp);
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
        if (
          target.closest(
            ".ns-img-box-handle, .ns-img-rotate, .ns-img-slider, .ns-img-preset-btn, .ns-img-align-btn, .ns-img-del-btn, .ns-img-grip",
          )
        ) {
          return;
        }
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

      grip.addEventListener("dragstart", () => {
        selectSelf();
      });

      return {
        dom: wrap,
        ignoreMutation: () => true,
        stopEvent(event) {
          // Allow native drag & drop events on the image to pass to ProseMirror
          if (event.type.startsWith("drag")) return false;
          const target = event.target as HTMLElement;
          return Boolean(
            target.closest(
              ".ns-img-box-handle, .ns-img-rotate, .ns-img-slider, .ns-img-preset-btn, .ns-img-align-btn, .ns-img-del-btn",
            ),
          );
        },
        update(updated) {
          if (updated.type.name !== "image") return false;
          img.src = updated.attrs.src ?? "";
          img.alt = updated.attrs.alt ?? "";
          img.title = updated.attrs.title ?? "";
          pct = widthToPct(updated.attrs.width);
          deg = rotateToDeg(updated.attrs.rotate);
          align = (updated.attrs.align as ImageAlign) || "center";
          wrap.dataset.align = align;
          for (const [k, b] of alignButtons) {
            b.classList.toggle("is-active", k === align);
          }
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
