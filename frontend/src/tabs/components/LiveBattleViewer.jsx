import React from "react";
export default function LiveBattleViewer(){ const url=window.__POCKETMON_VIEWER_URL__ || "/viewer"; return (<div className="rounded-lg overflow-hidden border border-gray-800"><iframe title="PocketMon Viewer" src={url} style={{width:"100%",height:"540px",border:"0"}} sandbox="allow-scripts allow-same-origin" /></div>); }
