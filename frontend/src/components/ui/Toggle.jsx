import React from "react";
export default function Toggle({ label, checked=false, onChange }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={!!checked} onChange={(e)=>onChange?.(e.target.checked)} />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}
