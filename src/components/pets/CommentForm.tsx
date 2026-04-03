"use client";

import { useState } from "react";

export function CommentForm({
  petId,
  parentId,
  onCancel,
  compact,
}: {
  petId: string;
  parentId?: string;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, text: text.slice(0, 255), ...(parentId ? { parentId } : {}) }),
      });
      if (res.ok) {
        setText("");
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to post comment");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={parentId ? "Write a reply..." : "Add a comment..."}
          maxLength={255}
          className={`input-field flex-1 ${compact ? "text-sm py-2" : ""}`}
          autoFocus={!!parentId}
        />
        <button type="submit" disabled={loading} className={`btn-primary flex-shrink-0 ${compact ? "text-sm px-3 py-2" : "min-h-[44px]"}`}>
          {loading ? "..." : "Post"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={`btn-ghost flex-shrink-0 ${compact ? "text-sm px-3 py-2" : "min-h-[44px]"}`}>
            Cancel
          </button>
        )}
      </div>
      {!compact && <p className="text-xs text-surface-800 text-right">{text.length}/255</p>}
    </form>
  );
}
