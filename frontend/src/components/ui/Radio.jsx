import React from "react";
export default function Radio({ options=[], value, onChange, className="", getOptionLabel=(o)=>o?.label??String(o??""), getOptionValue=(o)=>o?.value??o, name }) {
  return (
    <div className={`grid gap-2 ${className}`}>
      {options.map((o,i)=>{
        const v=getOptionValue(o);
        const checked = getOptionValue(value)===v || value===v;
        return (
          <label key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-white/10 cursor-pointer ${checked?"bg-white/10":"bg-white/[0.04]"}`}>
            <input type="radio" name={name} className="accent-sky-400" checked={checked} onChange={()=>onChange?.(o)} />
            <span>{getOptionLabel(o)}</span>
          </label>
        );
      })}
    </div>
  );
}
