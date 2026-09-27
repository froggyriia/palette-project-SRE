import { useState } from "react";

export default function ColorSwatch({ hex }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard API can fail (permissions, non-https context) — not fatal
    }
  };

  return (
    <button
      onClick={copy}
      className="flex flex-col items-center gap-1 group"
      title="Скопировать hex"
      type="button"
    >
      <span
        className="w-16 h-16 rounded-lg border border-black/10 shadow-sm group-hover:scale-105 transition-transform"
        style={{ backgroundColor: hex }}
      />
      <span className="text-xs font-mono text-gray-600">
        {copied ? "скопировано!" : hex}
      </span>
    </button>
  );
}
