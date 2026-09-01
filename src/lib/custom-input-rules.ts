import { Extension, textInputRule, wrappingInputRule } from "@tiptap/core";

/**
 * Notion-style live markdown & typography auto-conversions:
 * - `->` becomes `→`
 * - `<-` becomes `←`
 * - `<->` becomes `↔`
 * - `=>` becomes `⇒`
 * - `<=>` becomes `⇔`
 * - `[] ` or `[ ] ` at line start becomes an interactive to-do item (checkbox)
 * - `[[]] ` or `o ` at line start becomes a bullet list item
 */
export const CustomInputRules = Extension.create({
  name: "customInputRules",

  addInputRules() {
    const rules = [
      // Arrow conversions
      textInputRule({ find: /->\s?$/, replace: "→ " }),
      textInputRule({ find: /<-\s?$/, replace: "← " }),
      textInputRule({ find: /<->\s?$/, replace: "↔ " }),
      textInputRule({ find: /=>\s?$/, replace: "⇒ " }),
      textInputRule({ find: /<=>\s?$/, replace: "⇔ " }),
    ];

    // Checklist / To-do list input rule: [] or [ ] at start of line
    if (this.editor.schema.nodes.taskList) {
      rules.push(
        wrappingInputRule({
          find: /^\s*(\[\]|\[\s\])\s$/,
          type: this.editor.schema.nodes.taskList,
        }),
      );
    }

    // Circle / Bullet list input rule: [[]] or o at start of line
    if (this.editor.schema.nodes.bulletList) {
      rules.push(
        wrappingInputRule({
          find: /^\s*(\[\[\]\]|o)\s$/,
          type: this.editor.schema.nodes.bulletList,
        }),
      );
    }

    return rules;
  },
});
