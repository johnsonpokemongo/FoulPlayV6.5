import React, { useState, useEffect } from "react";
import { Brain, Target, Clock, Zap } from "lucide-react";

const API_BASE = (typeof window !== "undefined" && (window.API_BASE || window.__API_BASE__)) || "http://localhost:8000";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function DecisionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="text-indigo-400" size={20} />
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ChoiceBar({ choice, percentage, isSelected, isEpoke }) {
  return (
    <div className={`rounded-lg p-3 transition-all ${
      isSelected
        ? "bg-emerald-600/30 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"
        : "bg-gray-900 border border-gray-700"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-sm ${isSelected ? "text-emerald-300 font-bold" : "text-gray-300"}`}>
            {choice}
          </span>
          {isSelected && (
            <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-semibold">
              SELECTED
            </span>
          )}
          {isEpoke && (
            <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-semibold">
              EPOké
            </span>
          )}
        </div>
        <span className={`text-sm font-semibold ${isSelected ? "text-emerald-300" : "text-gray-400"}`}>
          {percentage}%
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isSelected ? "bg-emerald-500" : "bg-indigo-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function DecisionDisplay() {
  const [decision, setDecision] = useState(null);
  const [turn, setTurn] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [inBattle, setInBattle] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState(0);

  useEffect(() => {
    let live = true;
    
    async function fetchData() {
      try {
        // Check if bot is running and in battle
        const status = await apiGet("/status");
        const battleActive = status.running && status.room_id;
        setInBattle(battleActive);
        
        if (!battleActive) {
          // Not in battle - clear display
          setDecision(null);
          setCountdown(0);
          return;
        }
        
        // In battle - fetch decision
        const data = await apiGet("/battle/decision");
        if (live && data && data.timestamp) {
          // Only update if timestamp is newer (fresh decision)
          if (data.timestamp > lastTimestamp) {
            setDecision(data);
            setTurn(data.turn || 0);
            setLastTimestamp(data.timestamp);
            
            // Start 5-second countdown if decision is ready
            if (data.selected_move) {
              setCountdown(5);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch decision:", e);
      }
    }
    
    fetchData();
    const id = setInterval(fetchData, 1000);
    
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [lastTimestamp]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Not in battle
  if (!inBattle) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
        <Brain className="mx-auto text-gray-600 mb-3" size={48} />
        <div className="text-gray-400">No active battle</div>
        <div className="text-gray-500 text-sm mt-2">Decision display will appear during battles</div>
      </div>
    );
  }

  // In battle but no decision yet
  if (!decision || !decision.selected_move) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
        <Brain className="mx-auto text-gray-600 mb-3 animate-pulse" size={48} />
        <div className="text-gray-400">Analyzing next move...</div>
      </div>
    );
  }

  const mctsChoices = decision.mcts_choices || [];
  const epokeChoice = decision.epoke_choice || null;
  const selectedMove = decision.selected_move || null;

  return (
    <div className="space-y-4">
      {/* Header with Turn and Countdown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="text-indigo-400" size={24} />
          <span className="text-xl font-bold text-gray-200">Turn {turn}</span>
        </div>
        
        {countdown > 0 && (
          <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-500/50 rounded-lg px-4 py-2">
            <Clock className="text-yellow-400 animate-pulse" size={20} />
            <span className="text-yellow-300 font-semibold">
              Executing in {countdown}s...
            </span>
          </div>
        )}
      </div>

      {/* EPOké Choice (if available) */}
      {epokeChoice && (
        <DecisionCard title="💜 EPOké Suggestion" icon={Zap}>
          <ChoiceBar
            choice={epokeChoice.move}
            percentage={Math.round(epokeChoice.confidence * 100)}
            isSelected={selectedMove === epokeChoice.move}
            isEpoke={true}
          />
        </DecisionCard>
      )}

      {/* MCTS Top Choices */}
      <DecisionCard title="🧠 MCTS Analysis" icon={Brain}>
        <div className="space-y-2">
          {mctsChoices.length > 0 ? (
            mctsChoices.slice(0, 5).map((choice, idx) => (
              <ChoiceBar
                key={idx}
                choice={choice.move}
                percentage={Math.round(choice.percentage)}
                isSelected={selectedMove === choice.move}
                isEpoke={false}
              />
            ))
          ) : (
            <div className="text-gray-500 text-sm py-4 text-center">
              Calculating MCTS choices...
            </div>
          )}
        </div>
      </DecisionCard>

      {/* Selected Move Highlight */}
      {selectedMove && countdown === 0 && (
        <div className="bg-emerald-900/30 border-2 border-emerald-500 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 rounded-full p-2">
              <Target className="text-white" size={24} />
            </div>
            <div>
              <div className="text-xs text-emerald-400 font-semibold uppercase">Executed</div>
              <div className="text-xl font-bold text-emerald-300">{selectedMove}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Agreement/Disagreement Indicator */}
      {epokeChoice && mctsChoices.length > 0 && (
        <div className={`rounded-lg p-3 border-2 ${
          epokeChoice.move === selectedMove && mctsChoices[0].move === selectedMove
            ? "bg-emerald-900/20 border-emerald-500"
            : "bg-yellow-900/20 border-yellow-500"
        }`}>
          <div className="text-sm font-semibold">
            {epokeChoice.move === selectedMove && mctsChoices[0].move === selectedMove ? (
              <span className="text-emerald-400">✓ EPOké and MCTS agree</span>
            ) : (
              <span className="text-yellow-400">⚠ EPOké and MCTS disagree</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
