import React, { useState } from "react";
import { Zap, Clock, Trophy, Target, TrendingUp, Info } from "lucide-react";
import Card from "@/components/ui/Card.jsx";
import Input from "@/components/ui/Input.jsx";
import Select from "@/components/ui/Select.jsx";
import FileInput from "@/components/ui/FileInput.jsx";
import StatCard from "@/components/ui/StatCard.jsx";

export default function QuickStartTab({
  username,
  setUsername,
  password,
  setPassword,
  botMode,
  setBotMode,
  format,
  setFormat,
  teamFile,
  setTeamFile,
  handleBrowseTeam,
  searchMs,
  setSearchMs,
  sessionStats = { total: 0, wins: 0, losses: 0, start_time: null },
}) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="text-yellow-400" size={32} />
        <h2 className="text-3xl font-bold">Quick Start</h2>
      </div>

      <Card title="🚀 Essential Settings" tooltip="Minimum settings needed to start battling">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Username"
            value={username}
            onChange={setUsername}
            placeholder="YourPSUsername"
            tooltip="Your Pokémon Showdown username"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            tooltip="Your password"
          />
          <Select
            label="Bot Mode"
            value={botMode}
            onChange={setBotMode}
            options={["search_ladder", "challenge_user", "accept_challenge"]}
            tooltip="Search ladder finds random opponents"
          />
          <Select
            label="Format"
            value={format}
            onChange={setFormat}
            options={["gen9ou", "gen9randombattle", "gen8ou", "gen7ou"]}
            tooltip="Battle format"
          />
        </div>
        <FileInput
          label="Team File"
          value={teamFile}
          onChange={setTeamFile}
          onBrowse={handleBrowseTeam}
          tooltip="Select team file or folder"
        />
      </Card>

      <Card
        title={
          <div className="flex items-center gap-2">
            <span>⚡ Performance Presets</span>
            <button
              onClick={() => setShowGuide(true)}
              className="ml-2 p-1 rounded-lg hover:bg-gray-700 transition-colors"
              title="Safe Starter Guide"
            >
              <Info size={18} className="text-gray-400 hover:text-blue-400" />
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: "💨 Fast", ms: 500, desc: "Quick decisions" },
            { name: "⚖️ Balanced", ms: 2000, desc: "Recommended" },
            { name: "🧠 Deep", ms: 5000, desc: "Maximum strength" },
          ].map((p) => (
            <button
              key={p.name}
              onClick={() => setSearchMs(p.ms)}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left border border-gray-600 hover:border-blue-500 transition-colors"
            >
              <div className="font-semibold mb-1">{p.name}</div>
              <div className="text-xs text-blue-400 mb-2">{p.ms}ms</div>
              <div className="text-xs text-gray-400">{p.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      

      {/* Safe Starter Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50" onClick={() => setShowGuide(false)}>
          <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-xl font-semibold">💡 Safe Starter Guide</div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-sm px-3 py-1 rounded-lg border border-gray-600 hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="text-sm text-gray-300">
              Use these combinations as reliable defaults. Adjust based on your CPU and desired play style.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-700 rounded-lg p-4 bg-gray-800">
                <div className="font-semibold mb-2">💨 Fast Laddering</div>
                <div className="text-sm space-y-1">
                  <div>
                    <strong>Think Time:</strong> 500–800ms
                  </div>
                  <div>
                    <strong>Parallelism:</strong> 1–2
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">Quick games, lighter CPU usage</div>
              </div>

              <div className="border border-blue-500 rounded-lg p-4 bg-blue-900 bg-opacity-20">
                <div className="font-semibold mb-2 text-blue-300">⚖️ Balanced (Recommended)</div>
                <div className="text-sm space-y-1">
                  <div>
                    <strong>Think Time:</strong> 2000–3000ms
                  </div>
                  <div>
                    <strong>Parallelism:</strong> 2–4
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">Best strength/performance ratio</div>
              </div>

              <div className="border border-gray-700 rounded-lg p-4 bg-gray-800">
                <div className="font-semibold mb-2">🧠 Deep Grind</div>
                <div className="text-sm space-y-1">
                  <div>
                    <strong>Think Time:</strong> 5000–8000ms
                  </div>
                  <div>
                    <strong>Parallelism:</strong> 3–4
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">Maximum strength, high CPU</div>
              </div>
            </div>

            <div className="bg-yellow-900 bg-opacity-20 border border-yellow-500 rounded-lg p-4">
              <div className="text-sm text-yellow-300 space-y-2">
                <div>
                  <strong>💡 Pro Tips:</strong>
                </div>
                <div>
                  • <strong>Think Time</strong> is the most important setting for move quality
                </div>
                <div>
                  • Set <strong>Parallelism</strong> to your CPU core count (check Activity Monitor)
                </div>
                <div>
                  • Keep <strong>Max Concurrent Battles</strong> at 1 to avoid timeouts
                </div>
                <div>• Start with Balanced preset and adjust from there</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
