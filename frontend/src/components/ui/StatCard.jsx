import React from "react";
export default function StatCard({ title="Stat", value=0, subtitle="" }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div className="text-xs text-gray-400">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle ? <div className="text-xs text-gray-500 mt-1">{subtitle}</div> : null}
    </div>
  );
}
