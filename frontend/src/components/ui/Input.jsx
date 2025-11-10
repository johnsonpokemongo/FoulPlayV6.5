import React from "react";
export default function Input({ label, type="text", value, onChange, placeholder }) {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm text-gray-300 font-medium">{label}</label>}
      <input
        type={type}
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        value={value ?? ""} onChange={(e)=>onChange?.(e.target.value)} placeholder={placeholder}
      />
    </div>
  );
}
