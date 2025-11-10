import React from "react";
export default function FileInput({ label, value, onChange, accept }) {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm text-gray-300 font-medium">{label}</label>}
      <div className="flex items-center gap-3">
        <input
          type="text"
          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 outline-none"
          value={value ?? ""} onChange={(e)=>onChange?.(e.target.value)} placeholder="teams/gen9ou.txt"
        />
        <input
          type="file" accept={accept}
          className="text-sm"
          onChange={(e)=>{
            const f = e.target.files?.[0];
            if (f) onChange?.(f.name);
          }}
        />
      </div>
    </div>
  );
}
