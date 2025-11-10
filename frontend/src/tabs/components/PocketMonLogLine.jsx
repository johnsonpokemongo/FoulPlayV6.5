import React from "react";

const RE = {
  turn: /^Turn\s+(\d+)/i,
  dropped: /\[POCKETMON:DROPPED_CHAT.*?\]\s*(.*)$/i,
  choice: /Choice:\s*(.+)/i,
  switchCmd: /Switch:\s*(.+)/i,
  chooseCmd: /\/choose\s+(move|switch)\s+(.+)/i,
  usedMove: /\b(used|uses)\s+([A-Za-z0-9' \-]+)!/i,
  sentOut: /(?:sent out|Go!)\s+([^!]+)!/i,
  fainted: /fainted!/i,
  superEff: /It's super effective!/i,
  notVery: /It's not very effective\./i,
  immune: /It doesn't affect|The attack missed!/i,
  percentLoss: /lost\s+([\d.]+)%\s+of its health!/i,
  timer: /has\s+\d+\s+seconds\s+left/i,
  booster: /Booster Energy|Quark Drive|Protosynthesis/i,
  knockoff: /Knock Off!/i,
  winner: /Winner:\s*(.+)/i,
  won: /won the battle/i,
  lost: /lost|forfeited/i,
};

function Badge({ children, cls }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

export default function PocketMonLogLine({ line }) {
  const raw = line ?? "";
  
  const isDropped = RE.dropped.test(raw);
  const isTurn = RE.turn.test(raw);
  const isChoice = RE.choice.test(raw) || RE.switchCmd.test(raw) || RE.chooseCmd.test(raw);
  const isTimer = RE.timer.test(raw);
  const isFainted = RE.fainted.test(raw);
  const isMove = RE.usedMove.test(raw);
  const isSentOut = RE.sentOut.test(raw);
  const isSE = RE.superEff.test(raw);
  const isNE = RE.notVery.test(raw);
  const isImm = RE.immune.test(raw);
  const hasPct = RE.percentLoss.test(raw);
  const isBoost = RE.booster.test(raw) || RE.knockoff.test(raw);
  const isWinner = RE.winner.test(raw);
  const isWon = RE.won.test(raw);
  const isLost = RE.lost.test(raw);
  
  let content = raw;
  let bgClass = "";
  
  if (isTurn) {
    const m = raw.match(RE.turn);
    content = (
      <span className="flex items-center gap-2">
        <Badge cls="bg-indigo-500/30 text-indigo-200 border border-indigo-500/50 font-bold">
          Turn {m[1]}
        </Badge>
        <span className="text-zinc-300">{raw.replace(RE.turn, "").trim()}</span>
      </span>
    );
    bgClass = "bg-indigo-900/20";
  }
  
  if (isChoice && !isDropped) {
    let choiceText = raw;
    
    if (RE.choice.test(raw)) {
      const m = raw.match(RE.choice);
      choiceText = m[1];
    } else if (RE.switchCmd.test(raw)) {
      const m = raw.match(RE.switchCmd);
      choiceText = `Switch → ${m[1]}`;
    } else if (RE.chooseCmd.test(raw)) {
      const m = raw.match(RE.chooseCmd);
      choiceText = `${m[1]} ${m[2]}`;
    }
    
    content = (
      <span className="flex items-center gap-2">
        <Badge cls="bg-amber-500/30 text-amber-200 border border-amber-500/50 font-bold">
          CHOICE
        </Badge>
        <span className="text-amber-100 font-bold text-base">{choiceText}</span>
      </span>
    );
    bgClass = "bg-amber-900/30 border-amber-500/40";
  }
  
  if (isDropped) {
    const m = raw.match(RE.dropped);
    const payload = (m && m[1]) || raw;
    content = (
      <span className="flex items-center gap-2">
        <Badge cls="bg-fuchsia-500/30 text-fuchsia-200 border border-fuchsia-500/50 font-bold">
          BLOCKED
        </Badge>
        <span className="text-fuchsia-300 font-semibold">{payload}</span>
      </span>
    );
    bgClass = "bg-fuchsia-900/20";
  }
  
  if (isMove && !isDropped && !isChoice) {
    const m = raw.match(RE.usedMove);
    const moveName = m?.[2] ?? "";
    const verb = m?.[1] ?? "used";
    const parts = raw.split(new RegExp(`\\b${verb}\\s+${moveName}!`, "i"));
    content = (
      <span className="text-zinc-200">
        {parts[0]}
        {verb}{" "}
        <span className="font-bold text-sky-300 bg-sky-900/20 px-1 rounded">{moveName}</span>!
        {parts[1]}
      </span>
    );
  }
  
  if (isSentOut && !isDropped) {
    const m = raw.match(RE.sentOut);
    const mon = (m?.[1] || "").trim();
    content = (
      <span className="text-zinc-200">
        {raw.substring(0, raw.indexOf(mon))}
        <span className="font-bold text-emerald-300 bg-emerald-900/20 px-1 rounded">{mon}</span>
        {raw.substring(raw.indexOf(mon) + mon.length)}
      </span>
    );
  }
  
  if (hasPct && !isDropped) {
    const m = raw.match(RE.percentLoss);
    const pct = m?.[1];
    const base = raw.replace(m[0], "").trim();
    content = (
      <span className="text-zinc-200">
        {base && <span>{base} </span>}
        <Badge cls="bg-rose-500/30 text-rose-200 border border-rose-500/50 font-bold">
          -{pct}% HP
        </Badge>
      </span>
    );
  }
  
  if (isWinner || isWon) {
    bgClass = "bg-emerald-900/30 border-emerald-500/40";
    if (isWinner) {
      const m = raw.match(RE.winner);
      const winner = m?.[1] || "";
      content = (
        <span className="flex items-center gap-2">
          <Badge cls="bg-emerald-500/30 text-emerald-200 border border-emerald-500/50 font-bold">
            VICTORY
          </Badge>
          <span className="text-emerald-200 font-bold">{winner}</span>
        </span>
      );
    }
  }
  
  if (isLost && !isWon) {
    bgClass = "bg-rose-900/30 border-rose-500/40";
  }
  
  const badges = [];
  if (isSE) badges.push(<Badge key="se" cls="bg-lime-500/30 text-lime-200 border border-lime-500/50 font-bold">SUPER EFFECTIVE</Badge>);
  if (isNE) badges.push(<Badge key="ne" cls="bg-yellow-500/30 text-yellow-200 border border-yellow-500/50 font-bold">NOT VERY EFFECTIVE</Badge>);
  if (isImm) badges.push(<Badge key="imm" cls="bg-slate-500/30 text-slate-200 border border-slate-500/50">NO EFFECT</Badge>);
  if (isFainted) badges.push(<Badge key="ko" cls="bg-rose-600/30 text-rose-200 border border-rose-600/50 font-bold">FAINTED</Badge>);
  if (isBoost) badges.push(<Badge key="boost" cls="bg-purple-500/30 text-purple-200 border border-purple-500/50">ABILITY/ITEM</Badge>);
  if (isTimer) badges.push(<Badge key="timer" cls="bg-orange-500/30 text-orange-200 border border-orange-500/50">TIMER</Badge>);
  
  const accent = isTurn
    ? "border-indigo-500/40"
    : isChoice
    ? "border-amber-500/50 shadow-amber-500/20 shadow-md"
    : isDropped
    ? "border-fuchsia-500/40"
    : isFainted
    ? "border-rose-600/50"
    : isSE
    ? "border-lime-500/40"
    : isTimer
    ? "border-orange-500/40"
    : isWon
    ? "border-emerald-500/50"
    : isLost
    ? "border-rose-500/50"
    : "border-zinc-700/50";
  
  return (
    <div className={`px-3 py-2 rounded-lg border ${accent} ${bgClass || "bg-zinc-900/40"} text-sm leading-6 hover:bg-zinc-800/60 transition-colors`}>
      <div className="flex flex-wrap items-center gap-2">
        {badges.length > 0 && <div className="flex flex-wrap gap-1">{badges}</div>}
        <div className="flex-1">{content}</div>
      </div>
    </div>
  );
}
