import { mergeAttributes, Node, nodeInputRule } from "@tiptap/core";
import type { NodeViewRendererProps } from "@tiptap/core";

const MIN_PCT = 15;
const MAX_PCT = 100;
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

      // Notion-style Edge Drag Handles (Left & Right pill bars)
      const leftHandle = document.createElement("div");
      leftHandle.className = "ns-img-edge-handle is-left";
      leftHandle.setAttribute("title", "Drag to resize");

      const rightHandle = document.createElement("div");
      rightHandle.className = "ns-img-edge-handle is-right";
      rightHandle.setAttribute("title", "Drag to resize");

      // Notion-style Floating Toolbar
      const tools = document.createElement("div");
      tools.className = "ns-img-tools";

      // Alignment Controls
      const alignGroup = document.createElement("div");
      alignGroup.className = "ns-img-align-group";

      const ALIGN_OPTS: Array<{ id: ImageAlign; label: string; icon: string }> = [
        {
          id: "left",
          label: "Align left",
          icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
        },
        {
          id: "center",
          label: "Align center",
          icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="19" y1="12" x2="5" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/></svg>`,
        },
        {
          id: "right",
          label: "Align right",
          icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,
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

      // Quick Size Presets: 25%, 50%, 75%, 100%
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
          commit(p);
        });
        presetButtons.set(p, btn);
        presetsWrap.append(btn);
      }

      const updatePresetHighlights = () => {
        for (const [p, b] of presetButtons) {
          b.classList.toggle("is-active", Math.abs(pct - p) <= 2);
        }
      };

      // Live percentage badge
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

      tools.append(alignGroup, presetsWrap, label, delBtn);
      box.append(img, leftHandle, rightHandle);
      wrap.append(box, tools);

      const apply = (nextPct: number) => {
        const p = clampPct(nextPct);
        wrap.style.width = `${p}%`;
        label.textContent = `${p}%`;
        updatePresetHighlights();
        return p;
      };

      const commit = (nextPct: number) => {
        const p = apply(nextPct);
        if (!editor.isEditable) return;
        editor.commands.updateAttributes("image", {
          width: `${p}%`,
          align,
        });
      };

      let pct = widthToPct(node.attrs.width);
      apply(pct);

      // Direct Mouse Drag Resizing Logic
      let dragSession: {
        side: "left" | "right";
        startX: number;
        startWidthPx: number;
        parentWidthPx: number;
      } | null = null;

      const onPointerMove = (e: PointerEvent) => {
        if (!dragSession) return;
        const dx = e.clientX - dragSession.startX;
        const multiplier = align === "center" ? 2 : 1;
        const effectiveDelta = dragSession.side === "right" ? dx * multiplier : -dx * multiplier;
        const newWidthPx = dragSession.startWidthPx + effectiveDelta;
        const newPct = clampPct(Math.round((newWidthPx / dragSession.parentWidthPx) * 100));
        pct = newPct;
        wrap.style.width = `${pct}%`;
        label.textContent = `${pct}%`;
        updatePresetHighlights();
      };

      const onPointerUp = (e: PointerEvent) => {
        if (!dragSession) return;
        const side = dragSession.side;
        dragSession = null;
        document.body.classList.remove("ns-is-resizing");
        wrap.classList.remove("is-resizing");
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        try {
          const handle = side === "right" ? rightHandle : leftHandle;
          handle.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        commit(pct);
      };

      const startEdgeDrag = (e: PointerEvent, side: "left" | "right") => {
        if (!editor.isEditable) return;
        e.preventDefault();
        e.stopPropagation();
        selectSelf();
        wrap.classList.add("is-selected", "is-resizing");
        document.body.classList.add("ns-is-resizing");

        const targetEl = e.currentTarget as HTMLElement | null;
        if (targetEl && typeof targetEl.setPointerCapture === "function") {
          try {
            targetEl.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        }

        const parent = wrap.parentElement;
        const parentWidthPx = parent ? parent.getBoundingClientRect().width : 600;
        const startWidthPx = box.getBoundingClientRect().width;

        dragSession = {
          side,
          startX: e.clientX,
          startWidthPx,
          parentWidthPx: Math.max(parentWidthPx, 100),
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      };

      const onRightDown = (e: PointerEvent) => startEdgeDrag(e, "right");
      const onLeftDown = (e: PointerEvent) => startEdgeDrag(e, "left");

      rightHandle.addEventListener("pointerdown", onRightDown);
      leftHandle.addEventListener("pointerdown", onLeftDown);

      const selectSelf = () => {
        if (typeof getPos !== "function") return;
        const pos = getPos();
        if (typeof pos === "number") editor.chain().focus().setNodeSelection(pos).run();
      };

      const onBoxDown = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest(".ns-img-edge-handle, .ns-img-preset-btn, .ns-img-align-btn, .ns-img-del-btn")) {
          return;
        }
        selectSelf();
        wrap.classList.add("is-selected");
      };

      box.addEventListener("mousedown", onBoxDown);

      return {
        dom: wrap,
        ignoreMutation: () => true,
        stopEvent(event) {
          const target = event.target as HTMLElement;
          return Boolean(
            target.closest(".ns-img-edge-handle, .ns-img-preset-btn, .ns-img-align-btn, .ns-img-del-btn"),
          );
        },
        update(updated) {
          if (updated.type.name !== "image") return false;
          img.src = updated.attrs.src ?? "";
          img.alt = updated.attrs.alt ?? "";
          img.title = updated.attrs.title ?? "";
          pct = widthToPct(updated.attrs.width);
          align = (updated.attrs.align as ImageAlign) || "center";
          wrap.dataset.align = align;
          for (const [k, b] of alignButtons) {
            b.classList.toggle("is-active", k === align);
          }
          apply(pct);
          return true;
        },
        selectNode() {
          wrap.classList.add("is-selected");
        },
        deselectNode() {
          wrap.classList.remove("is-selected", "is-resizing");
        },
        destroy() {
          rightHandle.removeEventListener("pointerdown", onRightDown);
          leftHandle.removeEventListener("pointerdown", onLeftDown);
          box.removeEventListener("mousedown", onBoxDown);
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
        },
      };
    };
  },
});
