import React from "react";
import { InlineMath, BlockMath } from "react-katex";

/**
 * Renders text with inline ($...$) and display ($$...$$) LaTeX support.
 */
export default function Latex({ children, className = "" }) {
  const text = children ?? "";
  if (typeof text !== "string") return <span className={className}>{text}</span>;

  // Split by $$...$$ first, then by $...$
  const blocks = text.split(/(\$\$[^$]+\$\$)/g);
  return (
    <span className={className}>
      {blocks.map((block, i) => {
        if (block.startsWith("$$") && block.endsWith("$$")) {
          const math = block.slice(2, -2);
          try { return <BlockMath key={i} math={math} />; }
          catch { return <code key={i}>{block}</code>; }
        }
        const inlineParts = block.split(/(\$[^$]+\$)/g);
        return inlineParts.map((p, j) => {
          if (p.startsWith("$") && p.endsWith("$") && p.length > 2) {
            const math = p.slice(1, -1);
            try { return <InlineMath key={`${i}-${j}`} math={math} />; }
            catch { return <code key={`${i}-${j}`}>{p}</code>; }
          }
          return <span key={`${i}-${j}`} style={{ whiteSpace: "pre-wrap" }}>{p}</span>;
        });
      })}
    </span>
  );
}
