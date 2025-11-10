import React, { useState, useEffect, useMemo } from "react";
import { Activity, ChevronDown, ChevronRight } from "lucide-react";
import DecisionDisplay from "./components/DecisionDisplay";

const API_BASE = typeof window !== "undefined" && (window.API_BASE || window.__API_BASE__) || "http://localhost:8000";

const POCKETMON_URL = (typeof window !== "undefined" && (window.__POCKETMON_URL__ || window.POCKETMON_URL)) || "http://localhost:5174/";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function Dot({ ok }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`} />;
}

function SectionCard({ title, right, children }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ServiceHealth() {
  const [pkmnHealth, setPkmnHealth] = useState(false);
  const [epokeHealth, setEpokeHealth] = useState(false);
  
  useEffect(() => {
    async function check() {
      try {
        const pkmn = await apiGet("/pkmn/health");
        setPkmnHealth(pkmn.ok || false);
      } catch {
        setPkmnHealth(false);
      }
      
      try {
        const epoke = await apiGet("/epoke/health");
        setEpokeHealth(epoke.ok || false);
      } catch {
        setEpokeHealth(false);
      }
    }
    
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, []);
  
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className={`flex items-center gap-1 ${pkmnHealth ? "text-green-400" : "text-red-400"}`}>
        <Dot ok={pkmnHealth} />
        <span>PKMN</span>
      </div>
      <div className={`flex items-center gap-1 ${epokeHealth ? "text-green-400" : "text-gray-500"}`}>
        <Dot ok={epokeHealth} />
        <span>EPoké</span>
      </div>
    </div>
  );
}

function ChatMuteToggle() {
  const [mode, setMode] = useState("soft");
  const [busy, setBusy] = useState(false);
  
  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet("/control/chat-mute");
        if (r && r.mode) setMode(r.mode);
      } catch {}
    })();
  }, []);
  
  async function set(m) {
    if (busy) return;
    setBusy(true);
try {await fetch(`${API_BASE}/control/chat-mute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: m })
      });
      setMode(m);
    } catch {}
    setBusy(false);
  }
  
  const Btn = ({ m }) => (
    <button
      onClick={() => set(m)}
      disabled={busy}
      className={`px-3 py-1 text-xs border border-gray-600 ${
        mode === m ? "bg-gray-700 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
      } first:rounded-l-lg last:rounded-r-lg border-r-0 last:border-r`}
    >
      {m}
    </button>
  );
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">mute:</span>
      <div className="inline-flex rounded-lg overflow-hidden">
        <Btn m="off" />
        <Btn m="soft" />
        <Btn m="hard" />
      </div>
    </div>
  );
}

function CollapsibleSection({ title, open, onToggle, children }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-200 font-semibold">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span>{title}</span>
        </div>
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-700">{children}</div>}
    </div>
  );
}

function PokemonSprite({ name, hp = 100 }) {
  const spriteUrl = `https://play.pokemonshowdown.com/sprites/ani/${name?.toLowerCase().replace(/[^a-z0-9]/g, "")}.gif`;
  
  return (
    <div className="relative group">
      <div className="bg-gray-900 rounded-lg p-2 border border-gray-700 hover:border-indigo-500 transition-colors">
        <img
          src={spriteUrl}
          alt={name}
          className="w-16 h-16 pixelated"
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextElementSibling.style.display = "flex";
          }}
        />
        <div className="hidden items-center justify-center w-16 h-16 text-xs text-gray-500">
          {name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="text-xs text-center text-gray-300 mt-1 truncate">{name}</div>
        {hp < 100 && (
          <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${hp > 50 ? "bg-green-500" : hp > 25 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${hp}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function BattleViewTab() {
  const [status, setStatus] = useState({ ready: false, running: false, roomId: "", roomUrl: "" });
  const [battleState, setBattleState] = useState(null);
  const [openViewer, setOpenViewer] = useState(true);
  
  useEffect(() => {
    let live = true;
    
    async function readStatus() {
      try {
        const s = await apiGet("/status");
        if (live && s) {
          setStatus((prev) => ({
            ready: Boolean(s.ready ?? s.ok ?? true),
            running: Boolean(s.running ?? s.active ?? false),
            roomId: s.room_id || s.roomId || prev.roomId || "",
            roomUrl: s.room_url || s.roomUrl || prev.roomUrl || "",
          }));
        }
      } catch {}
      
      try {
        const room = await apiGet("/battle/room");
        if (live && room) {
          setStatus((prev) => ({
            ...prev,
            roomId: room.id || room.roomId || prev.roomId || "",
            roomUrl: room.url || room.roomUrl || prev.roomUrl || "",
          }));
        }
      } catch {}
      
      try {
        const state = await apiGet("/battle/state");
        if (live && state) {
          setBattleState(state);
        }
      } catch {}
    }
    
    readStatus();
    const id = setInterval(readStatus, 3000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);
  
  const badge = useMemo(
    () => (
      <span className="inline-flex items-center text-xs text-gray-300">
        <Dot ok={status.running} />
        <span className="ml-2">{status.running ? "Live" : status.ready ? "Ready" : "Idle"}</span>
      </span>
    ),
    [status.running, status.ready]
  );
  
  const yourTeam = battleState?.you?.team || battleState?.your_team || battleState?.yourTeam || [];
  const opponentRevealed = battleState?.opponent?.revealed || battleState?.opponent_revealed || battleState?.opponentPreview || [];
  
  return (
    <div className="p-6 space-y-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-100">Live Battle</h1>
        {status.roomUrl ? (
          <a href={status.roomUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-500 text-indigo-300 hover:bg-indigo-500/10 text-sm">Live Game</a>
        ) : (
          <button disabled className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm">Live Game</button>
        )}
      </div>
      
      <SectionCard 
        title="Status" 
        right={
          <>
            {badge}
            <ServiceHealth />
            <ChatMuteToggle />
          </>
        }
      >
        <div className="space-y-2 text-sm">
          <div className="text-gray-300">
            Bot:{" "}
            <span className={`font-medium ${status.running ? "text-emerald-400" : "text-gray-400"}`}>
              {status.running ? "Running" : status.ready ? "Ready" : "Stopped"}
            </span>
          </div>
          {status.roomId && (
            <div className="text-gray-300">
              Battle room:{" "}
              {status.roomUrl ? (
                <a
                  className="text-indigo-400 hover:text-indigo-300 underline"
                  href={status.roomUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {status.roomId}
                </a>
              ) : (
                <span className="text-gray-400">{status.roomId}</span>
              )}
            </div>
          )}
          {!status.roomId && <div className="text-gray-500 text-xs">No active battle</div>}
        </div>
      </SectionCard>
      
      <DecisionDisplay />
      
      <SectionCard title="Team Preview">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-3">Your Team</div>
            <div className="grid grid-cols-3 gap-3">
              {yourTeam.length > 0 ? (
                yourTeam.map((mon, i) => (
                  <div key={i} className="px-2 py-1 rounded-md bg-gray-900 border border-gray-700 text-xs text-gray-200 truncate">{mon.species || mon.name || mon}</div>
                ))
              ) : (
                <div className="col-span-3 py-8 text-center text-gray-500 text-sm">
                  No team data yet
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-400 mb-3">Opponent (Revealed)</div>
            <div className="grid grid-cols-3 gap-3">
              {opponentRevealed.length > 0 ? (
                opponentRevealed.map((mon, i) => (
                  <div key={i} className="px-2 py-1 rounded-md bg-gray-900 border border-gray-700 text-xs text-gray-200 truncate">{mon.species || mon.name || mon}</div>
                ))
              ) : (
                <div className="col-span-3 py-8 text-center text-gray-500 text-sm">
                  No opponent data yet
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>
      
      <CollapsibleSection
        title="Battle Viewer (PocketMon)"
        open={openViewer}
        onToggle={() => setOpenViewer((v) => !v)}
      >
        <div className="rounded-lg overflow-hidden border border-gray-800">
          <iframe
            title="PocketMon Viewer"
            src={POCKETMON_URL}
            style={{ width: "100%", height: "540px", border: "0" }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}