import React, { useState } from "react";
import { Settings2, Info } from "lucide-react";
import Card from "@/components/ui/Card.jsx";
import Input from "@/components/ui/Input.jsx";
import Select from "@/components/ui/Select.jsx";
import FileInput from "@/components/ui/FileInput.jsx";
import Toggle from "@/components/ui/Toggle.jsx";

export default function SettingsTab({
  websocketUri,
  setWebsocketUri,
  username,
  setUsername,
  password,
  setPassword,
  avatar,
  setAvatar,
  botMode,
  setBotMode,
  userToChallenge,
  setUserToChallenge,
  format,
  setFormat,
  smogonStats,
  setSmogonStats,
  teamFile,
  setTeamFile,
  handleBrowseTeam,
  saveReplay,
  setSaveReplay,
  roomName,
  setRoomName,
  logLevel,
  setLogLevel,
  logToFile,
  setLogToFile,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings2 className="text-blue-400" size={32} />
        <h2 className="text-3xl font-bold">Bot Settings</h2>
      </div>

      <Card title="🌐 Connection" tooltip="Pokemon Showdown connection settings">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="WebSocket URI"
              value={websocketUri}
              onChange={setWebsocketUri}
              placeholder="wss://sim3.psim.us/showdown/websocket"
              tooltip="Pokemon Showdown server address"
            />
          </div>
          <Input
            label="Username"
            value={username}
            onChange={setUsername}
            placeholder="YourPSUsername"
            tooltip="Your Pokemon Showdown username"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            tooltip="Your Pokemon Showdown password"
          />
          <Input
            label="Avatar (Optional)"
            value={avatar}
            onChange={setAvatar}
            placeholder="pikachu"
            tooltip="Your avatar name (e.g., pikachu, charizard)"
          />
        </div>
      </Card>

      <Card title="🎮 Battle Configuration" tooltip="How the bot finds and plays battles">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Bot Mode"
            value={botMode}
            onChange={setBotMode}
            options={["search_ladder", "challenge_user", "accept_challenge"]}
            tooltip="search_ladder: Find random opponents | challenge_user: Challenge specific user | accept_challenge: Wait for challenges"
          />
          
          {botMode === "challenge_user" && (
            <Input
              label="User to Challenge"
              value={userToChallenge}
              onChange={setUserToChallenge}
              placeholder="OpponentUsername"
              tooltip="The username to challenge when in challenge_user mode"
            />
          )}
          
          {botMode === "accept_challenge" && (
            <Input
              label="Room Name"
              value={roomName}
              onChange={setRoomName}
              placeholder="lobby"
              tooltip="Room to join while waiting for challenges"
            />
          )}

          <Select
            label="Format"
            value={format}
            onChange={setFormat}
            options={[
              "gen9ou",
              "gen9randombattle",
              "gen9vgc2024regg",
              "gen9doublesou",
              "gen8ou",
              "gen7ou",
              "gen6ou",
            ]}
            tooltip="Battle format to play"
          />
        </div>

        <FileInput
          label="Team File"
          value={teamFile}
          onChange={setTeamFile}
          onBrowse={handleBrowseTeam}
          tooltip="Path to team file (not needed for Random Battles)"
        />
      </Card>

      <Card
        title={
          <div className="flex items-center gap-2">
            <span>⚙️ Advanced Options</span>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="ml-2 p-1 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Info size={18} className="text-gray-400 hover:text-blue-400" />
            </button>
          </div>
        }
      >
        {showAdvanced && (
          <div className="space-y-4">
            <Input
              label="Smogon Stats Format (Optional)"
              value={smogonStats}
              onChange={setSmogonStats}
              placeholder="Leave blank to use battle format"
              tooltip="Override which smogon stats to use for team building"
            />

            <Select
              label="Save Replay"
              value={saveReplay}
              onChange={setSaveReplay}
              options={["never", "always", "on_loss"]}
              tooltip="When to save battle replays"
            />

            <Select
              label="Log Level"
              value={logLevel}
              onChange={setLogLevel}
              options={["DEBUG", "INFO", "WARNING", "ERROR"]}
              tooltip="Logging verbosity level"
            />

            <Toggle
              label="Log to File"
              checked={logToFile}
              onChange={setLogToFile}
            />
          </div>
        )}

        {!showAdvanced && (
          <div className="text-sm text-gray-500">
            Click the info icon to show advanced options
          </div>
        )}
      </Card>

      <div className="bg-blue-900 bg-opacity-20 border border-blue-500 rounded-lg p-4">
        <div className="text-sm text-blue-300 space-y-2">
          <div>
            <strong>💡 Quick Tips:</strong>
          </div>
          <div>
            • <strong>search_ladder</strong> is the most common mode for ranked play
          </div>
          <div>
            • Use <strong>gen9randombattle</strong> if you don't have a team file
          </div>
          <div>
            • Settings are saved automatically when you start the bot
          </div>
        </div>
      </div>
    </div>
  );
}
