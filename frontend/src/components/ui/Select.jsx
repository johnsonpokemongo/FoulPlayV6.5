import React from "react";
export default function Select({ label, value, onChange, options=[], tooltip }) {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm text-gray-300 font-medium">{label}</label>}
      <select
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 outline-none"
        value={value} onChange={(e)=>onChange?.(e.target.value)}>
        {options.map((opt) => {
          if (typeof opt === "string") return <option key={opt} value={opt}>{opt}</option>;
          return <option key={opt.value ?? opt.label} value={opt.value}>{opt.label ?? opt.value}</option>;
        })}
      </select>
    </div>
  );
}
