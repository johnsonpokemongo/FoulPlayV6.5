import React, { useRef, useState } from "react";

const API_BASE = (
  (typeof import !== "undefined" && import.meta && import.meta.env && (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL)) ||
  (typeof window !== "undefined" && (window.API_BASE || window.API_URL)) ||
  "http://localhost:8000"
).replace(/\/$/, "");

export default function TeamUploadButton({ onUploaded }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function pick() {
    if (!inputRef.current) return;
    inputRef.current.click();
  }

  async function onFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setBusy(true);
    try {
      const txt = await f.text();
      const res = await fetch(`${API_BASE}/teams/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: f.name, content: txt })
      });
      const data = await res.json().catch(() => ({}));
      if (data && data.ok && data.team_name) {
        onUploaded && onUploaded(data.team_name);
        alert(`Team uploaded: ${data.team_name}`);
      } else {
        alert(data?.error || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input type="file" accept=".txt,text/plain" ref={inputRef} className="hidden" onChange={onFile} />
      <button
        onClick={pick}
        disabled={busy}
        className="px-3 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
      >
        {busy ? "Uploading..." : "Import Team (.txt)"}
      </button>
    </div>
  );
}
