import { useCallback } from "react";
import { resourcesApi } from "@/lib/api";

const IMAGE_RE = /^image\//;

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);
  const newValue = before + text + after;
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  ).set;
  nativeSetter.call(textarea, newValue);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  const newPos = start + text.length;
  textarea.setSelectionRange(newPos, newPos);
}

export default function useImagePaste() {
  const onPaste = useCallback(async (e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;
    const items = clipboardData.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && IMAGE_RE.test(item.type)) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        try {
          const result = await resourcesApi.upload(file);
          insertAtCursor(e.target, `\n![](${result.url})\n`);
        } catch (err) {
          console.error("[ImagePaste] Upload failed:", err);
        }
        return;
      }
    }
  }, []);

  const onDrop = useCallback(async (e) => {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type && IMAGE_RE.test(file.type)) {
        e.preventDefault();
        try {
          const result = await resourcesApi.upload(file);
          insertAtCursor(e.target, `\n![](${result.url})\n`);
        } catch (err) {
          console.error("[ImageDrop] Upload failed:", err);
        }
        return;
      }
    }
  }, []);

  return { onPaste, onDrop };
}
