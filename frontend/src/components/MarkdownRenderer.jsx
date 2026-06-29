import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * Renders Markdown with GFM (tables, strikethrough, task lists),
 * LaTeX math ($...$ and $$...$$), and code blocks.
 * Drop-in replacement for the existing <Latex> component for
 * statement/explanation rendering.
 */
const MarkdownRenderer = memo(function MarkdownRenderer({ children, className = "" }) {
  if (!children) return null;
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
