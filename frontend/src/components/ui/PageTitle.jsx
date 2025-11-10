import React from "react";

export default function PageTitle({ title, subtitle, Icon, color = "text-sky-400", actions = null }) {
  const IconEl = Icon ? <Icon className={`w-6 h-6 ${color}`} aria-hidden="true" /> : null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {IconEl}
        <div>
          <div className="text-2xl font-semibold">{title}</div>
          {subtitle ? <div className="text-sm text-gray-400">{subtitle}</div> : null}
        </div>
      </div>
      {actions}
    </div>
  );
}
