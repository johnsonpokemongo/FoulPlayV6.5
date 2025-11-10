import React from "react";
export default function Slider({ label, value=0, onChange, min=0, max=100, step=1, unit="" }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label && <span className="text-sm text-gray-300 font-medium">{label}</span>}
        <span className="text-sm font-semibold text-blue-400">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={Number(value)}
        onChange={(e)=>onChange?.(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}
