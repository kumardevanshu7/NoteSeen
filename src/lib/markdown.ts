/**
 * Small, dependency-free Markdown interop.
 *
 * NoteSeen stores rich text as HTML, but plain .md/.txt files are the lingua
 * franca of note taking, so both directions get a pragmatic converter that
 * covers the formatting the editor can actually produce.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdownToHtml(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\W)\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|\W)_([^_\n]+)_/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/==([^=]+)==/g, "<mark>$1</mark>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let listType: "ul" | "ol" | "task" | null = null;
  let inCode = false;
  let codeBuffer: string[] = [];

  const closeList = () => {
    if (listType === "ul") out.push("</ul>");
    if (listType === "ol") out.push("</ol>");
    if (listType === "task") out.push("</ul>");
    listType = null;
  };

  const openList = (next: "ul" | "ol" | "task") => {
    if (listType === next) return;
    closeList();
    if (next === "task") out.push('<ul data-type="taskList">');
    else out.push(`<${next}>`);
    listType = next;
  };

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeList();
      out.push("<hr>");
      continue;
    }

    const task = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(line);
    if (task) {
      openList("task");
      const checked = task[1].toLowerCase() === "x";
      out.push(
        `<li data-type="taskItem" data-checked="${checked}"><p>${inlineMarkdownToHtml(task[2])}</p></li>`,
      );
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      openList("ul");
      out.push(`<li><p>${inlineMarkdownToHtml(bullet[1])}</p></li>`);
      continue;
    }

    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      openList("ol");
      out.push(`<li><p>${inlineMarkdownToHtml(ordered[1])}</p></li>`);
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      closeList();
      out.push(`<blockquote><p>${inlineMarkdownToHtml(quote[1])}</p></blockquote>`);
      continue;
    }

    closeList();
    out.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
  }

  if (inCode && codeBuffer.length > 0) {
    out.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }
  closeList();

  return out.join("\n") || "<p></p>";
}

export function plainTextToHtml(text: string): string {
  const blocks = text.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  return (
    blocks
      .map((block) => {
        const lines = block.split("\n").map((line) => escapeHtml(line));
        return `<p>${lines.join("<br>")}</p>`;
      })
      .join("\n") || "<p></p>"
  );
}

function inlineNodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";

  const children = Array.from(node.childNodes).map(inlineNodeToMarkdown).join("");

  switch (node.tagName) {
    case "STRONG":
    case "B":
      return `**${children}**`;
    case "EM":
    case "I":
      return `*${children}*`;
    case "S":
    case "DEL":
      return `~~${children}~~`;
    case "MARK":
      return `==${children}==`;
    case "U":
      return `<u>${children}</u>`;
    case "CODE":
      return `\`${children}\``;
    case "BR":
      return "\n";
    case "A": {
      const href = node.getAttribute("href");
      return href ? `[${children}](${href})` : children;
    }
    case "IMG": {
      const src = node.getAttribute("src") ?? "";
      const alt = node.getAttribute("alt") ?? "image";
      return src.startsWith("data:") ? `![${alt}](embedded-image)` : `![${alt}](${src})`;
    }
    default:
      return children;
  }
}

export function htmlToMarkdown(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;

  const blocks: string[] = [];

  const walkList = (list: HTMLElement, ordered: boolean, depth: number) => {
    const indent = "  ".repeat(depth);
    let index = 1;
    for (const item of Array.from(list.children)) {
      if (!(item instanceof HTMLElement) || item.tagName !== "LI") continue;
      const nested = item.querySelector(":scope > ul, :scope > ol");
      const clone = item.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(":scope > ul, :scope > ol").forEach((el) => el.remove());
      const content = inlineNodeToMarkdown(clone).trim();

      if (item.getAttribute("data-type") === "taskItem") {
        const checked = item.getAttribute("data-checked") === "true";
        blocks.push(`${indent}- [${checked ? "x" : " "}] ${content}`);
      } else if (ordered) {
        blocks.push(`${indent}${index}. ${content}`);
        index += 1;
      } else {
        blocks.push(`${indent}- ${content}`);
      }

      if (nested instanceof HTMLElement) {
        walkList(nested, nested.tagName === "OL", depth + 1);
      }
    }
    blocks.push("");
  };

  for (const node of Array.from(template.content.children)) {
    if (!(node instanceof HTMLElement)) continue;
    switch (node.tagName) {
      case "H1":
        blocks.push(`# ${inlineNodeToMarkdown(node).trim()}`, "");
        break;
      case "H2":
        blocks.push(`## ${inlineNodeToMarkdown(node).trim()}`, "");
        break;
      case "H3":
      case "H4":
      case "H5":
      case "H6":
        blocks.push(`### ${inlineNodeToMarkdown(node).trim()}`, "");
        break;
      case "UL":
        walkList(node, false, 0);
        break;
      case "OL":
        walkList(node, true, 0);
        break;
      case "BLOCKQUOTE":
        blocks.push(
          inlineNodeToMarkdown(node)
            .trim()
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n"),
          "",
        );
        break;
      case "PRE":
        blocks.push("```", node.textContent ?? "", "```", "");
        break;
      case "HR":
        blocks.push("---", "");
        break;
      default:
        blocks.push(inlineNodeToMarkdown(node).trim(), "");
    }
  }

  return blocks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
