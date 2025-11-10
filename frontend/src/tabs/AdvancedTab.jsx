import React, { useState, useEffect } from "react";
import { Wrench, Database, BookOpen } from "lucide-react";
import Card from "@/components/ui/Card.jsx";

const API_BASE = typeof window !== "undefined" && (window.API_BASE || window.__API_BASE__) || "http://localhost:8000";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdvancedTab() {
  const [pkmnHealth, setPkmnHealth] = useState(false);
  const [epokeHealth, setEpokeHealth] = useState(false);

  useEffect(() => {
    async function checkServices() {
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

    checkServices();
    const id = setInterval(checkServices, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="text-purple-400" size={32} />
        <h2 className="text-3xl font-bold">Advanced Tools</h2>
      </div>

      <Card title="🔧 Service Status">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">PKMN Service</span>
              <span className={`text-xs font-semibold ${pkmnHealth ? "text-green-400" : "text-red-400"}`}>
                {pkmnHealth ? "● ONLINE" : "● OFFLINE"}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Pokémon data, moves, damage calc
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">EPoké ML</span>
              <span className={`text-xs font-semibold ${epokeHealth ? "text-green-400" : "text-gray-500"}`}>
                {epokeHealth ? "● ONLINE" : "● OFFLINE"}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Fast move suggestions (optional)
            </div>
          </div>
        </div>
      </Card>

      <Card title="📊 Tools & Resources">
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Database size={20} className="text-blue-400" />
              <span className="font-semibold">Pokédex Lookup</span>
            </div>
            <div className="text-sm text-gray-400 mb-3">
              Search moves, abilities, items, and Pokémon stats
            </div>
            <button
              disabled={!pkmnHealth}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pkmnHealth
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              {pkmnHealth ? "Open Pokédex" : "Service Offline"}
            </button>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen size={20} className="text-purple-400" />
              <span className="font-semibold">Damage Calculator</span>
            </div>
            <div className="text-sm text-gray-400 mb-3">
              Calculate damage ranges for any matchup
            </div>
            <button
              disabled={!pkmnHealth}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pkmnHealth
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              {pkmnHealth ? "Open Calculator" : "Service Offline"}
            </button>
          </div>
        </div>
      </Card>

      <Card title="ℹ️ System Information">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Version:</span>
            <span className="text-gray-200 font-mono">V6.5</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Backend API:</span>
            <span className="text-gray-200 font-mono">{API_BASE}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">PKMN Service:</span>
            <span className="text-gray-200 font-mono">http://127.0.0.1:8787</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">EPoké Service:</span>
            <span className="text-gray-200 font-mono">http://127.0.0.1:8788</span>
          </div>
        </div>
      </Card>

      <div className="bg-yellow-900 bg-opacity-20 border border-yellow-500 rounded-lg p-4">
        <div className="text-sm text-yellow-300 space-y-2">
          <div>
            <strong>🚧 Tools Panel Coming Soon</strong>
          </div>
          <div>
            Advanced features like Pokédex lookup and damage calculator will be integrated in a future update.
          </div>
        </div>
      </div>
    </div>
  );
}
