import React, { useEffect, useMemo, useRef, useState } from "react";
import { Settings as SettingsIcon, Zap, BarChart3, FileText, Wrench, Swords } from "lucide-react";
import QuickStartTab from "./QuickStartTab.jsx";
import SettingsTab from "./SettingsTab.jsx";
import PerformanceTab from "./PerformanceTab.jsx";
import AdvancedTab from "./AdvancedTab.jsx";
import LogsStatsTab from "./LogsStatsTab.jsx";
import BattleViewTab from "./BattleViewTab.jsx";
let res;

const DEFAULT_WS_URI = "wss://sim3.psim.us/showdown/websocket";
const websocketUri =
  (typeof localStorage !== "undefined" && localStorage.getItem("websocketUri")) ||
  (import.meta && import.meta.env && (import.meta.env.VITE_WEBSOCKET_URI || import.meta.env.VITE_WS_URI)) ||
  DEFAULT_WS_URI;

const API_BASE = (
  (import.meta && import.meta.env && (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL)) ||
  (typeof window !== "undefined" && (window.API_BASE || window.API_URL)) ||
  "http://localhost:8000"
).replace(/\/$/, "");

async function api(path, init) {
  const res = await fetch(`${API_BASE}${path}`, init);
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const msg = ct.includes("application/json") ? JSON.stringify(await res.json()) : await res.text();
    throw new Error(msg || res.statusText);
  }
  return ct.includes("application/json") ? res.json() : res.text();
}

function SidebarItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-indigo-600/20 text-indigo-300" : "text-gray-300 hover:bg-gray-800"
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

export default function FoulPlayGUI() {
  const [enableEpoke, setEnableEpoke] = useState(false);
  const [error, setError] = useState(null);

  const [manualDecisionMode, setManualDecisionMode] = useState(false);
  const [epokeTimeoutMs, setEpokeTimeoutMs] = useState(600);
  const [decisionDeadlineMs, setDecisionDeadlineMs] = useState(5000);

  const [searchMs, setSearchMs] = useState(5000);
  const [searchParallelism, setSearchParallelism] = useState(1);
  const [runCount, setRunCount] = useState(1);
  const [maxConcurrent, setMaxConcurrent] = useState(1);

  const [page, setPage] = useState("quickstart");
  const [apiBase, setApiBase] = useState(API_BASE);

  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionStats, setSessionStats] = useState({});
  const [currentStats, setCurrentStats] = useState({});
  const [battleHistory, setBattleHistory] = useState([]);
  const [winRate, setWinRate] = useState(0);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [botMode, setBotMode] = useState("search_ladder");
  const [format, setFormat] = useState("gen9ou");
  const [teamFile, setTeamFile] = useState("");

  const [logs, setLogs] = useState("");
  const [logSource, setLogSource] = useState("backend");
  const logsRef = useRef(null);

  const nav = useMemo(
    () => [
      { id: "quickstart", name: "Quick Start", icon: Zap },
      { id: "battle", name: "Live Battle", icon: Swords },
      { id: "settings", name: "Settings", icon: SettingsIcon },
      { id: "performance", name: "Performance", icon: BarChart3 },
      { id: "advanced", name: "Advanced", icon: Wrench },
      { id: "logs", name: "Logs & Stats", icon: FileText },
    ],
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const s = await api("/status");
        if (!cancelled && s) {
          setRunning(Boolean(s.running));
          setSessionStats(s.session_stats || {});
          setCurrentStats(s.current_stats || {});
          const battles = s.session_stats?.battles || [];
          setBattleHistory(battles);
          const wins = battles.filter((b) => b.result === "win").length;
          const total = battles.length || 1;
          setWinRate(Math.round((wins / total) * 100));
          if (typeof s.search_time_ms === "number") setSearchMs(s.search_time_ms);
          if (typeof s.search_parallelism === "number") setSearchParallelism(s.search_parallelism);
          if (typeof s.run_count === "number") setRunCount(s.run_count);
          if (typeof s.max_concurrent_battles === "number") setMaxConcurrent(s.max_concurrent_battles);
        }
      } catch {}
      if (!cancelled) setTimeout(tick, 1500);
    }
    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  async function pullLogs() {
    try {
      const txt = await api(`/logs/${logSource}`);
      setLogs(typeof txt === "string" ? txt : JSON.stringify(txt, null, 2));
      if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
    } catch {}
  }
  useEffect(() => {
    const id = setInterval(pullLogs, 2000);
    return () => clearInterval(id);
  }, [logSource]);

  async function startBot() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const basePayload = {
        ps_username: username || "",
        ps_password: password || "",
        pokemon_format: format || "gen9randombattle",
        search_time_ms: Number(searchMs) || 800,
        search_parallelism: Number(searchParallelism) || 1,
        run_count: Number(runCount) || 1,
        max_concurrent_battles: Number(maxConcurrent) || 1,
        websocket_uri: websocketUri || DEFAULT_WS_URI,
        bot_mode: botMode || "search_ladder",
      };

      const epokeExtras = {
        enable_epoke: Boolean(enableEpoke),
        epoke_timeout_ms: Number(epokeTimeoutMs) || 600,
        decision_deadline_ms: Number(decisionDeadlineMs) || 5000,
      };

      const endpoints = [`${API_BASE}/start`, `${API_BASE}/control/start`];

      for (const url of endpoints) {
        let r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...basePayload, ...epokeExtras }),
        });
        let txt = await r.text();
        let data;
        try { data = JSON.parse(txt); } catch { data = txt; }

        if (r.ok) {
          setRunning(true);
          if (typeof pullLogs === "function") pullLogs();
          setBusy(false);
          return;
        }
        if (r.status === 409) {
          setError("Already running");
          setRunning(true);
          setBusy(false);
          return;
        }

        if (r.status !== 404 && Boolean(enableEpoke)) {
          r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(basePayload),
          });
          txt = await r.text();
          try { data = JSON.parse(txt); } catch { data = txt; }
          if (r.ok) {
            setRunning(true);
            if (typeof pullLogs === "function") pullLogs();
            setBusy(false);
            return;
          }
          if (r.status === 409) {
            setError("Already running");
            setRunning(true);
            setBusy(false);
            return;
          }
        }
      }

      throw new Error("Start endpoint not found on backend (/start or /control/start).");
    } catch (e) {
      console.error("Start failed:", e);
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function stopBot() {
    if (busy || !running) return;
    setBusy(true);
    try {
      await api("/stop", { method: "POST" });
      setRunning(false);
    } catch {}
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="flex">
        <aside className="hidden md:flex w-64 h-screen sticky top-0 flex-col gap-2 p-4 bg-gray-900 border-r border-gray-800">
          <div>
            <div className="text-fuchsia-400 font-bold text-xl">Foul Play</div>
            <div className="text-xs text-gray-400 -mt-1 mb-3">
              Pokémon Showdown Bot
              <br />
              v6.4
            </div>
          </div>

          <nav className="space-y-1 overflow-y-auto">
            {nav.map((n) => (
              <SidebarItem
                key={n.id}
                icon={n.icon}
                label={n.name}
                active={page === n.id}
                onClick={() => setPage(n.id)}
              />
            ))}
          </nav>

          <div className="mt-auto space-y-2">
            <div className="rounded-lg border border-gray-800 p-3">
              <div className="text-xs text-gray-400 mb-2">Status</div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    running ? "bg-emerald-500 animate-pulse" : "bg-gray-500"
                  }`}
                />
                <span className="text-sm">{running ? "Ready" : "Stopped"}</span>
              </div>
              {error && <div className="mt-2 text-xs text-rose-400 break-all">{String(error)}</div>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={startBot}
                disabled={busy || running}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  running ? "bg-gray-800 text-gray-400" : "bg-emerald-600 hover:bg-emerald-500"
                } transition-colors`}
              >
                Start
              </button>
              <button
                onClick={stopBot}
                disabled={busy || !running}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  !running ? "bg-gray-800 text-gray-400" : "bg-rose-600 hover:bg-rose-500"
                } transition-colors`}
              >
                Stop
              </button>
            </div>
            <div className="text-[11px] text-gray-500 text-center">API: {apiBase}</div>
          </div>
        </aside>

        <main className="flex-1 h-screen overflow-y-auto">
          <div className="md:hidden sticky top-0 z-10 bg-gray-900 border-b border-gray-800">
            <div className="flex overflow-x-auto no-scrollbar gap-1 p-2">
              {nav.map((n) => (
                <button
                  key={n.id}
                  className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                    page === n.id ? "bg-indigo-600/20 text-indigo-300" : "text-gray-300 bg-gray-800"
                  }`}
                  onClick={() => setPage(n.id)}
                >
                  {n.name}
                </button>
              ))}
            </div>
          </div>

          {page === "quickstart" && (
            <QuickStartTab
              apiBase={apiBase}
              setApiBase={setApiBase}
              startBot={startBot}
              stopBot={stopBot}
              running={running}
              username={username}
              setUsername={setUsername}
              password={password}
              setPassword={setPassword}
              botMode={botMode}
              setBotMode={setBotMode}
              format={format}
              setFormat={setFormat}
              teamFile={teamFile}
              setTeamFile={setTeamFile}
              handleBrowseTeam={() => {}}
              searchMs={searchMs}
              setSearchMs={setSearchMs}
              sessionStats={sessionStats}
            />
          )}

          {page === "battle" && (
            <div className="p-6">
              <BattleViewTab />
            </div>
          )}

          {page === "settings" && (
            <SettingsTab
              username={username}
              setUsername={setUsername}
              password={password}
              setPassword={setPassword}
              botMode={botMode}
              setBotMode={setBotMode}
              format={format}
              setFormat={setFormat}
              teamFile={teamFile}
              setTeamFile={setTeamFile}
              searchMs={searchMs}
              setSearchMs={setSearchMs}
            />
          )}

          {page === "performance" && (
            <PerformanceTab
              searchMs={searchMs}
              setSearchMs={setSearchMs}
              searchParallelism={searchParallelism}
              setSearchParallelism={setSearchParallelism}
              runCount={runCount}
              setRunCount={setRunCount}
              maxConcurrent={maxConcurrent}
              setMaxConcurrent={setMaxConcurrent}
              enableEpoke={enableEpoke}
              setEnableEpoke={setEnableEpoke}
              manualDecisionMode={manualDecisionMode}
              setManualDecisionMode={setManualDecisionMode}
              epokeTimeoutMs={epokeTimeoutMs}
              setEpokeTimeoutMs={setEpokeTimeoutMs}
              decisionDeadlineMs={decisionDeadlineMs}
              setDecisionDeadlineMs={setDecisionDeadlineMs}
            />
          )}

          {page === "advanced" && <AdvancedTab />}

          {page === "logs" && (
            <LogsStatsTab
              statsView={"session"}
              setStatsView={() => {}}
              sessionStats={sessionStats}
              currentStats={currentStats}
              winRate={winRate}
              recentPerformance={(sessionStats.battles || [])
                .slice(-10)
                .map((b, i) => ({ game: i + 1, result: b.result === "win" ? 1 : 0 }))}
              battleHistory={battleHistory}
              logSource={logSource}
              setLogSource={setLogSource}
              logs={logs}
              setLogs={setLogs}
              pullLogs={pullLogs}
              logsRef={logsRef}
            />
          )}
        </main>
      </div>
    </div>
  );
}
