import { CodeBlock, type CodeBlockOptions } from "@tiptap/extension-code-block";
import { toast } from "sonner";

export const CodeBlockWithCopy = CodeBlock.extend<CodeBlockOptions>({
  addNodeView() {
    return ({ node }) => {
      const container = document.createElement("div");
      container.className = "ns-code-block-container group relative";

      // Top header with language label & Copy button
      const header = document.createElement("div");
      header.className = "ns-code-block-header";
      header.contentEditable = "false";

      const langLabel = document.createElement("span");
      langLabel.className = "ns-code-block-lang";
      langLabel.textContent = (node.attrs.language as string) || "Code";

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "ns-code-copy-btn";
      copyBtn.setAttribute("title", "Copy code to clipboard");
      copyBtn.setAttribute("aria-label", "Copy code");

      const renderDefaultCopyBtn = () => {
        copyBtn.innerHTML = `
          <svg class="ns-copy-icon size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
          <span class="ns-copy-text">Copy</span>
        `;
      };

      const renderCopiedBtn = () => {
        copyBtn.innerHTML = `
          <svg class="ns-check-icon size-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          <span class="ns-copy-text text-emerald-500 font-medium">Copied!</span>
        `;
      };

      renderDefaultCopyBtn();

      let copyTimer: ReturnType<typeof setTimeout> | null = null;

      copyBtn.addEventListener("mousedown", (e) => {
        // Prevent stealing editor focus
        e.preventDefault();
      });

      copyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const codeContent = node.textContent || "";
        if (!codeContent) {
          toast.info("Code block is empty");
          return;
        }

        void navigator.clipboard.writeText(codeContent).then(
          () => {
            copyBtn.classList.add("is-copied");
            renderCopiedBtn();
            toast.success("Code copied to clipboard");

            if (copyTimer) clearTimeout(copyTimer);
            copyTimer = setTimeout(() => {
              copyBtn.classList.remove("is-copied");
              renderDefaultCopyBtn();
            }, 2000);
          },
          () => {
            toast.error("Failed to copy code");
          },
        );
      });

      header.appendChild(langLabel);
      header.appendChild(copyBtn);

      const pre = document.createElement("pre");
      pre.className = "ns-code-pre";
      const code = document.createElement("code");
      if (node.attrs.language) {
        code.className = this.options.languageClassPrefix + node.attrs.language;
      }
      pre.appendChild(code);

      container.appendChild(header);
      container.appendChild(pre);

      return {
        dom: container,
        contentDOM: code,
        update(updatedNode) {
          if (updatedNode.type.name !== "codeBlock") return false;
          langLabel.textContent = (updatedNode.attrs.language as string) || "Code";
          if (updatedNode.attrs.language) {
            code.className = "language-" + (updatedNode.attrs.language as string);
          } else {
            code.className = "";
          }
          return true;
        },
        destroy() {
          if (copyTimer) clearTimeout(copyTimer);
        },
      };
    };
  },
});
