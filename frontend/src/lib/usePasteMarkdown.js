import { useCallback } from "react";
import TurndownService from "turndown";

/**
 * Custom rules for Turndown to handle GATE Overflow content.
 * Preserves LaTeX delimiters ($, $$) that might be inside HTML.
 */
const td = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
});

// Preserve LaTeX math delimiters
td.addRule("math", {
  filter: function (node) {
    return (
      node.nodeType === Node.ELEMENT_NODE &&
      node.hasAttribute &&
      (node.getAttribute("class") || "").includes("math")
    );
  },
  replacement: function (content) {
    return content;
  },
});

// Ensure <pre><code> blocks stay as fenced code blocks
td.addRule("codeBlockPreserve", {
  filter: ["pre"],
  replacement: function (content, node) {
    const code = node.querySelector("code");
    const lang = code ? code.className.replace("language-", "") : "";
    const text = code ? code.textContent : content;
    return "\n\n```" + lang + "\n" + text + "\n```\n\n";
  },
});

export default function usePasteMarkdown() {
  const handlePaste = useCallback((e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const html = clipboardData.getData("text/html");
    if (!html) return; // no HTML, let default plain text behavior happen

    e.preventDefault();

    let markdown = "";
    try {
      markdown = td.turndown(html);
    } catch {
      // If turndown fails, fall back to plain text
      markdown = clipboardData.getData("text/plain") || "";
    }

    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end, textarea.value.length);
    const newValue = before + markdown + after;

    // Trigger React onChange by using native setter + dispatch
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    ).set;
    nativeInputValueSetter.call(textarea, newValue);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    // Restore cursor position
    const newPos = start + markdown.length;
    textarea.setSelectionRange(newPos, newPos);
  }, []);

  return { onPaste: handlePaste };
}
