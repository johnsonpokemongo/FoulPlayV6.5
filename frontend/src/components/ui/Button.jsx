import React from "react";
export default function Button({ children, onClick, disabled, kind="primary" }) {
  const base = "px-3 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const k = kind==="danger" ? "bg-red-600 hover:bg-red-500" :
            kind==="secondary" ? "bg-gray-700 hover:bg-gray-600" :
            "bg-green-600 hover:bg-green-500";
  return <button onClick={onClick} disabled={disabled} className={`${base} ${k}`}>{children}</button>;
}
