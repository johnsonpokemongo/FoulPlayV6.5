import React from "react";
export default function SafeText({ value }) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") return <>{value}</>;
  if (Array.isArray(value)) {
    const parts = value.map(v => {
      if (typeof v === "string" || typeof v === "number") return v;
      if (React.isValidElement(v)) return v;
      if (v && typeof v === "object") return v.label ?? v.title ?? v.name ?? v.value ?? "";
      return String(v ?? "");
    }).filter(Boolean);
    return <>{parts.join(" ")}</>;
  }
  if (React.isValidElement(value)) return value;
  if (typeof value === "object") {
    const best = value.label ?? value.title ?? value.name ?? value.value;
    return <>{best ?? ""}</>;
  }
  return <>{String(value)}</>;
}
