import React, { useState } from "react";
import { Info } from "lucide-react";

export default function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-block">
      <Info
        size={14}
        className="text-gray-500 hover:text-blue-400 cursor-help transition-colors"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      />
      {visible && (
        <div className="absolute left-0 top-6 w-64 bg-gray-950 border border-gray-600 rounded-lg p-3 text-xs z-50 shadow-2xl">
          {text?.label ?? text?.title ?? text?.name ?? text?.value ?? text}
        </div>
      )}
    </span>
  );
}
