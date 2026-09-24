import { mergeAttributes, Node } from "@tiptap/core";
import { toast } from "sonner";
import { useAuth } from "@/store/auth";
import { isImageStorageConfigured } from "@/lib/supabase";
import { imageFileToOptimizedDataUrl, uploadPublicImage } from "@/lib/note-images";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sideBySideCard: {
      insertSideBySideCard: (options?: {
        imageSrc?: string | null;
        imageAlt?: string;
        imageWidth?: string;
        text?: string;
      }) => ReturnType;
    };
  }
}

export interface SideBySideOptions {
  getNoteId?: () => string | undefined;
}

export const SideBySideCard = Node.create<SideBySideOptions>({
  name: "sideBySideCard",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addOptions() {
    return {
      getNoteId: undefined,
    };
  },

  addAttributes() {
    return {
      imageSrc: {
        default: null,
        parseHTML: (el) =>
          el.getAttribute("data-image-src") ||
          el.querySelector("img.ns-side-by-side-img")?.getAttribute("src") ||
          null,
        renderHTML: (attrs) => (attrs.imageSrc ? { "data-image-src": attrs.imageSrc } : {}),
      },
      imageAlt: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-image-alt") || "",
        renderHTML: (attrs) => (attrs.imageAlt ? { "data-image-alt": attrs.imageAlt } : {}),
      },
      imageWidth: {
        default: "35%",
        parseHTML: (el) => el.getAttribute("data-image-width") || "35%",
        renderHTML: (attrs) => ({ "data-image-width": attrs.imageWidth || "35%" }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-side-by-side="true"]',
        contentElement: ".ns-side-by-side-content",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          return {
            imageSrc:
              el.getAttribute("data-image-src") ||
              el.querySelector("img")?.getAttribute("src") ||
              null,
            imageAlt: el.getAttribute("data-image-alt") || "",
            imageWidth: el.getAttribute("data-image-width") || "35%",
          };
        },
      },
      {
        tag: "div.ns-side-by-side-card",
        contentElement: ".ns-side-by-side-content",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          return {
            imageSrc:
              el.getAttribute("data-image-src") ||
              el.querySelector("img")?.getAttribute("src") ||
              null,
            imageAlt: el.getAttribute("data-image-alt") || "",
            imageWidth: el.getAttribute("data-image-width") || "35%",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { imageSrc, imageAlt, imageWidth } = node.attrs;
    const width = imageWidth || "35%";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "ns-side-by-side-card",
        "data-side-by-side": "true",
        "data-image-width": width,
        ...(imageSrc ? { "data-image-src": imageSrc } : {}),
        ...(imageAlt ? { "data-image-alt": imageAlt } : {}),
      }),
      [
        "div",
        {
          class: "ns-side-by-side-media",
          style: `flex: 0 0 ${width}; max-width: ${width};`,
        },
        imageSrc
          ? [
              "img",
              {
                src: imageSrc,
                alt: imageAlt || "Card picture",
                class: "ns-side-by-side-img",
              },
            ]
          : [
              "div",
              { class: "ns-side-by-side-placeholder-static" },
              ["span", {}, "Pic"],
            ],
      ],
      [
        "div",
        { class: "ns-side-by-side-content" },
        0,
      ],
    ];
  },

  addCommands() {
    return {
      insertSideBySideCard:
        (options = {}) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                imageSrc: options.imageSrc || null,
                imageAlt: options.imageAlt || "",
                imageWidth: options.imageWidth || "35%",
              },
              content: [
                {
                  type: "paragraph",
                  content: options.text ? [{ type: "text", text: options.text }] : undefined,
                },
              ],
            })
            .run();
        },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let currentNode = node;
      const getNoteId = this.options.getNoteId;

      // ── Outer Card Wrapper ──────────────────────────────────────────────
      const container = document.createElement("div");
      container.className = "ns-side-by-side-card group/card relative";
      container.setAttribute("data-side-by-side", "true");

      // ── Card Header Controls (hover overlay on top right) ───────────────
      const headerControls = document.createElement("div");
      headerControls.className = "ns-side-by-side-controls";
      headerControls.contentEditable = "false";

      // Width buttons
      const widthToggle = document.createElement("div");
      widthToggle.className = "ns-side-by-side-width-toggle";
      const widths = ["30%", "40%", "50%"];
      widths.forEach((w) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `ns-width-btn ${currentNode.attrs.imageWidth === w ? "is-active" : ""}`;
        btn.textContent = w;
        btn.title = `Set picture width to ${w}`;
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const pos = typeof getPos === "function" ? getPos() : null;
          if (typeof pos === "number") {
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(pos, undefined, {
                ...currentNode.attrs,
                imageWidth: w,
              })
            );
          }
        });
        widthToggle.appendChild(btn);
      });

      // Delete card button
      const deleteCardBtn = document.createElement("button");
      deleteCardBtn.type = "button";
      deleteCardBtn.className = "ns-card-del-btn";
      deleteCardBtn.title = "Delete block";
      deleteCardBtn.innerHTML = `
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      `;
      deleteCardBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = typeof getPos === "function" ? getPos() : null;
        if (typeof pos === "number") {
          editor.view.dispatch(editor.view.state.tr.delete(pos, pos + currentNode.nodeSize));
        }
      });

      headerControls.appendChild(widthToggle);
      headerControls.appendChild(deleteCardBtn);
      container.appendChild(headerControls);

      // ── Main Body (Side-by-side columns) ────────────────────────────────
      const body = document.createElement("div");
      body.className = "ns-side-by-side-body";

      // ── Left Column: Pic ────────────────────────────────────────────────
      const mediaCol = document.createElement("div");
      mediaCol.className = "ns-side-by-side-media";
      mediaCol.contentEditable = "false";
      mediaCol.style.flex = `0 0 ${currentNode.attrs.imageWidth || "35%"}`;
      mediaCol.style.maxWidth = `${currentNode.attrs.imageWidth || "35%"}`;

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.className = "hidden";
      fileInput.style.display = "none";

      const processFile = async (file: File) => {
        if (!file.type.startsWith("image/")) {
          toast.error("Please pick a valid image (PNG, JPG, WebP)");
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Image must be smaller than 5 MB");
          return;
        }

        try {
          toast.info("Uploading picture...");
          const noteId = getNoteId?.();
          const uid = useAuth.getState().user?.uid;
          let url = "";

          if (isImageStorageConfigured() && uid && noteId) {
            try {
              url = await uploadPublicImage(file, noteId, "note-assets");
            } catch (err) {
              console.warn("Cloud upload failed, using optimized local data URL", err);
              url = await imageFileToOptimizedDataUrl(file);
            }
          } else {
            url = await imageFileToOptimizedDataUrl(file);
          }

          if (url) {
            const pos = typeof getPos === "function" ? getPos() : null;
            if (typeof pos === "number") {
              editor.view.dispatch(
                editor.view.state.tr.setNodeMarkup(pos, undefined, {
                  ...currentNode.attrs,
                  imageSrc: url,
                })
              );
              toast.success("Picture added!");
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to add picture";
          toast.error(msg);
        }
      };

      fileInput.addEventListener("change", (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) void processFile(file);
        fileInput.value = "";
      });

      const renderMedia = () => {
        mediaCol.innerHTML = "";
        mediaCol.appendChild(fileInput);

        const currentSrc = currentNode.attrs.imageSrc;
        if (currentSrc) {
          // Display actual image with hover controls
          const imgWrapper = document.createElement("div");
          imgWrapper.className = "ns-side-by-side-img-wrapper group/media relative";

          const img = document.createElement("img");
          img.src = currentSrc;
          img.alt = currentNode.attrs.imageAlt || "Card picture";
          img.className = "ns-side-by-side-img";
          img.loading = "lazy";

          const mediaOverlay = document.createElement("div");
          mediaOverlay.className = "ns-side-by-side-img-overlay";

          const replaceBtn = document.createElement("button");
          replaceBtn.type = "button";
          replaceBtn.className = "ns-media-overlay-btn";
          replaceBtn.title = "Change picture";
          replaceBtn.innerHTML = `
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
            </svg>
            <span>Replace</span>
          `;
          replaceBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
          });

          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.className = "ns-media-overlay-btn text-rose-500 hover:text-rose-600";
          removeBtn.title = "Remove picture";
          removeBtn.innerHTML = `
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          `;
          removeBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const pos = typeof getPos === "function" ? getPos() : null;
            if (typeof pos === "number") {
              editor.view.dispatch(
                editor.view.state.tr.setNodeMarkup(pos, undefined, {
                  ...currentNode.attrs,
                  imageSrc: null,
                })
              );
            }
          });

          mediaOverlay.appendChild(replaceBtn);
          mediaOverlay.appendChild(removeBtn);
          imgWrapper.appendChild(img);
          imgWrapper.appendChild(mediaOverlay);
          mediaCol.appendChild(imgWrapper);
        } else {
          // Placeholder dropzone for empty Pic
          const dropzone = document.createElement("div");
          dropzone.className = "ns-side-by-side-dropzone";
          dropzone.title = "Click or drag an image here";
          dropzone.innerHTML = `
            <div class="ns-dropzone-icon-box">
              <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
            </div>
            <span class="ns-dropzone-title">Pic</span>
            <span class="ns-dropzone-desc">Click or drop image</span>
          `;

          dropzone.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
          });

          dropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add("is-dragover");
          });

          dropzone.addEventListener("dragleave", (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove("is-dragover");
          });

          dropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove("is-dragover");
            const file = e.dataTransfer?.files?.[0];
            if (file) void processFile(file);
          });

          mediaCol.appendChild(dropzone);
        }
      };

      renderMedia();
      body.appendChild(mediaCol);

      // ── Right Column: Details (contentDOM) ──────────────────────────────
      const contentCol = document.createElement("div");
      contentCol.className = "ns-side-by-side-content";
      contentCol.setAttribute("data-placeholder", "Details & notes…");
      body.appendChild(contentCol);

      container.appendChild(body);

      // ── Bottom Plus (+) Button (exactly as drawn in user diagram) ────────
      const addRowWrapper = document.createElement("div");
      addRowWrapper.className = "ns-side-by-side-bottom-add";
      addRowWrapper.contentEditable = "false";

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "ns-side-by-side-add-btn";
      addBtn.title = "Add another Pic & Details block below";
      addBtn.setAttribute("aria-label", "Add another block below");
      addBtn.innerHTML = `
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      `;

      addBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = typeof getPos === "function" ? getPos() : null;
        if (typeof pos === "number") {
          const insertPos = pos + currentNode.nodeSize;
          editor
            .chain()
            .focus()
            .insertContentAt(insertPos, {
              type: "sideBySideCard",
              attrs: {
                imageSrc: null,
                imageWidth: currentNode.attrs.imageWidth || "35%",
              },
              content: [
                {
                  type: "paragraph",
                },
              ],
            })
            .run();
        }
      });

      addRowWrapper.appendChild(addBtn);
      container.appendChild(addRowWrapper);

      return {
        dom: container,
        contentDOM: contentCol,
        update(updatedNode) {
          if (updatedNode.type.name !== "sideBySideCard") return false;
          const oldSrc = currentNode.attrs.imageSrc;
          const oldWidth = currentNode.attrs.imageWidth;
          currentNode = updatedNode;

          const newWidth = updatedNode.attrs.imageWidth || "35%";
          mediaCol.style.flex = `0 0 ${newWidth}`;
          mediaCol.style.maxWidth = `${newWidth}`;

          // Update active width button styling
          widthToggle.querySelectorAll(".ns-width-btn").forEach((b) => {
            const btn = b as HTMLElement;
            if (btn.textContent === newWidth) btn.classList.add("is-active");
            else btn.classList.remove("is-active");
          });

          if (oldSrc !== updatedNode.attrs.imageSrc || oldWidth !== newWidth) {
            renderMedia();
          }
          return true;
        },
      };
    };
  },
});
