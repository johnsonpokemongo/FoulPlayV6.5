import React, { useState, useEffect, useRef } from "react";
import { FileText, Trophy, Target, TrendingUp, Clock, ChevronDown, Copy, RotateCw, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

const API_BASE = typeof window !== "undefined" && (window.API_BASE || window.__API_BASE__) || "http://localhost:8000";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = "white" }) {
  const colors = {
    white: "text-gray-100",
    green: "text-emerald-400",
    red: "text-rose-400",
    blue: "text-indigo-400",
    purple: "text-purple-400",
  };
  
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
        {Icon && <Icon size={14} />}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
    </div>
  );
}

export default function LogsStatsTab() {
  const [statsView, setStatsView] = useState("session");
  const [stats, setStats] = useState({ session: null, alltime: null });
  const [history, setHistory] = useState([]);
  const [logSource, setLogSource] = useState("bot");
  const [logs, setLogs] = useState([]);
  const logsRef = useRef(null);
  
  useEffect(() => {
    let live = true;
    
    async function load() {
      try {
        const s = await apiGet("/stats");
        if (live) {
          setStats({
            session: s?.session || { total: 0, wins: 0, losses: 0, start_time: null },
            alltime: s?.alltime || { total: 0, wins: 0, losses: 0 },
          });
        }
      } catch {
        if (live) {
          setStats({ session: { total: 0, wins: 0, losses: 0 }, alltime: { total: 0, wins: 0, losses: 0 } });
        }
      }
      
      try {
        const h = await apiGet("/battle/history?limit=20");
        const battles = Array.isArray(h) ? h : h && h.battles ? h.battles : [];
        if (live) setHistory(battles);
      } catch {
        if (live) setHistory([]);
      }
    }
    
    load();
    const id = setInterval(load, 5000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);
  
  useEffect(() => {
    let live = true;
    
    async function pullLogs() {
      const endpoint =
        logSource === "bot"
          ? "/logs?n=500"
          : logSource === "backend"
          ? "/logs/backend?n=500"
          : "/logs/frontend?n=500";
      
      try {
        const r = await apiGet(endpoint);
        if (live) {
          setLogs(r && r.lines ? r.lines : []);
          if (logsRef.current) {
            logsRef.current.scrollTop = logsRef.current.scrollHeight;
          }
        }
      } catch {}
    }
    
    pullLogs();
    const id = setInterval(pullLogs, 3000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [logSource]);
  
  const currentStats = statsView === "session" ? stats.session : stats.alltime;
  const wins = Number(currentStats?.wins || 0);
  const losses = Number(currentStats?.losses || 0);
  const total = wins + losses;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";
  
  const recentPerformance = (history || [])
    .slice(-10)
    .reverse()
    .map((b, i) => ({
      game: i + 1,
      result: b.result === "win" || b.win ? 1 : 0,
    }));
  
  const latestElo = history && history.length > 0 ? history[0]?.elo || history[0]?.rating : null;
  const streak = currentStats?.streak || 0;
  
  async function copyLogsToClipboard() {
    try {
      await navigator.clipboard.writeText((logs || []).join("\n"));
      alert("Logs copied to clipboard!");
    } catch {
      alert("Failed to copy logs");
    }
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="text-emerald-400" size={32} />
        <h2 className="text-3xl font-bold">Logs & Statistics</h2>
      </div>
      
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm text-gray-300 font-medium">Stats View:</label>
        <div className="relative">
          <select
            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white appearance-none pr-10"
            value={statsView}
            onChange={(e) => setStatsView(e.target.value)}
          >
            <option value="session">Current Session</option>
            <option value="alltime">All-Time Stats</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>
        {statsView === "session" && stats.session?.start_time && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock size={14} />
            <span>Started: {new Date(stats.session.start_time).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
      
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Battles" value={total} icon={Trophy} color="white" />
          <StatCard label="Wins" value={wins} icon={Target} color="green" />
          <StatCard label="Losses" value={losses} icon={Target} color="red" />
          <StatCard label="Win Rate" value={`${winRate}%`} icon={TrendingUp} color="blue" />
          <StatCard label="Current ELO" value={latestElo || "—"} icon={Trophy} color="purple" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Best Streak</div>
            <div className="text-lg font-bold text-emerald-400">{streak} wins</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Total Playtime</div>
            <div className="text-lg font-bold text-indigo-400">
              {currentStats?.playtime || "—"}
            </div>
          </div>
        </div>
        
        {recentPerformance && recentPerformance.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Recent Performance (Last 10 Games)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={recentPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="game" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{
                    background: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => (value === 1 ? "Win" : "Loss")}
                />
                <Line
                  type="stepAfter"
                  dataKey="result"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      
      <Card title="Recent Battles">
        <div className="divide-y divide-gray-700">
          {(history || []).slice(0, 10).map((b, idx) => {
            const isWin = b?.result === "win" || b?.win;
            const format = b?.format || b?.rule || "gen9ou";
            const roomId = b?.room_id || b?.id || b?.roomId || "—";
            const opponent = b?.opponent || b?.foe || "—";
            const elo = b?.elo || b?.rating;
            
            return (
              <div key={idx} className="py-3 flex items-center justify-between text-sm">
                <div className="flex-1">
                  <div className="text-gray-200 font-medium">
                    {format} <span className="text-gray-500">•</span> vs {opponent}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {roomId}
                    {elo && <span> • ELO: {elo}</span>}
                  </div>
                </div>
                <div className={`font-bold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                  {isWin ? "WON" : "LOST"}
                </div>
              </div>
            );
          })}
          {(!history || history.length === 0) && (
            <div className="text-sm text-gray-500 py-8 text-center">No battle history yet</div>
          )}
        </div>
      </Card>
      
      <Card>
        <div className="space-y-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-300 font-medium">Log Source</label>
              <div className="relative">
                <select
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white appearance-none pr-10"
                  value={logSource}
                  onChange={(e) => setLogSource(e.target.value)}
                >
                  <option value="bot">Bot Logs</option>
                  <option value="backend">Backend Logs</option>
                  <option value="frontend">Frontend Logs</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setLogs([])}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 size={14} />
                Clear
              </button>
              <button
                onClick={copyLogsToClipboard}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Copy size={14} />
                Copy
              </button>
            </div>
          </div>
        </div>
        
        <div
          ref={logsRef}
          className="bg-black rounded-lg p-4 font-mono text-xs h-96 overflow-y-auto border border-gray-700"
        >
          {(!logs || logs.length === 0) && (
            <div className="text-gray-500 text-center py-8">
              No logs yet. Logs will appear when the bot is running.
            </div>
          )}
          {(logs || []).map((line, i) => {
            const lineStr = typeof line === "string" ? line : JSON.stringify(line);
            const lower = lineStr.toLowerCase();
            let color = "text-gray-300";
            let bg = "";
            let bold = false;
            
            if (lower.includes("choice:") || lower.includes("switch:")) {
              color = "text-amber-300";
              bg = "bg-amber-900/20";
              bold = true;
            } else if (lower.includes("error") || lower.includes("failed")) {
              color = "text-red-400";
              bg = "bg-red-900/10";
            } else if (lower.includes("warning") || lower.includes("warn")) {
              color = "text-yellow-400";
            } else if (lower.includes("won") || lower.includes("winner") || lower.includes("victory")) {
              color = "text-green-400";
              bg = "bg-green-900/10";
              bold = true;
            } else if (lower.includes("lost") || lower.includes("defeat") || lower.includes("forfeited")) {
              color = "text-red-400";
              bg = "bg-red-900/10";
            } else if (lower.includes("battle") || lower.includes("turn")) {
              color = "text-cyan-400";
            } else if (lower.includes("move") && !lower.includes("choice")) {
              color = "text-sky-300";
            } else if (lower.includes("connected") || lower.includes("started")) {
              color = "text-blue-400";
            } else if (lower.includes("info")) {
              color = "text-blue-300";
            }
            
            return (
              <div
                key={i}
                className={`${color} ${bg} px-2 py-1 rounded hover:bg-gray-800/50 transition-colors ${
                  bold ? "font-bold" : ""
                }`}
              >
                {lineStr}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
