import React from "react";
export default function Card({ title, children, className="" }) {
  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
      )}
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}
