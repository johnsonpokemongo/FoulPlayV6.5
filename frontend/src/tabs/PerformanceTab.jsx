import React, { useState } from "react";
import { BarChart3, Info } from "lucide-react";
import Card from "@/components/ui/Card.jsx";
import Slider from "@/components/ui/Slider.jsx";

export default function PerformanceTab({
  // existing perf props (unchanged)
  searchMs = 5000,
  setSearchMs = () => {},
  searchParallelism = 1,
  setSearchParallelism = () => {},
  runCount = 1,
  setRunCount = () => {},
  maxConcurrent = 1,
  setMaxConcurrent = () => {},

  // NEW props (already being passed from parent)
  enableEpoke = false,
  setEnableEpoke = () => {},
  manualDecisionMode = false,
  setManualDecisionMode = () => {},
  epokeTimeoutMs = 600,
  setEpokeTimeoutMs = () => {},
  decisionDeadlineMs = 5000,
  setDecisionDeadlineMs = () => {},
}) {
  const [showGuide, setShowGuide] = useState(false);
  const [showAlgoInfo, setShowAlgoInfo] = useState(null);

  const algorithms = [
    {
      id: "mcts",
      name: "MCTS",
      icon: "🌳",
      desc: "Monte Carlo Tree Search",
      detail: "Best for most formats",
      active: true,
      explanation: {
        title: "Monte Carlo Tree Search (MCTS)",
        description:
          "The current active algorithm. Uses random game simulations to explore possible moves and outcomes.",
        howItWorks: [
          "Builds a tree of possible game states",
          "Runs thousands of random simulations",
          "Chooses moves with highest win probability",
          "Balances exploration vs exploitation",
        ],
        strengths: [
          "Excellent with randomness and uncertainty",
          "Gets better with more thinking time",
          "Works well for complex positions",
        ],
        bestFor: "Gen 9 OU, Random Battles, formats with high variance",
      },
    },
    {
      id: "expectiminimax",
      name: "Expectiminimax",
      icon: "🎲",
      desc: "Alpha-Beta Pruning",
      detail: "Fast deterministic search",
      active: false,
      explanation: {
        title: "Expectiminimax with Alpha-Beta Pruning",
        description:
          "A future algorithm that uses tree search with probability calculations at chance nodes.",
        howItWorks: [
          "Searches game tree deterministically",
          "Prunes branches using alpha-beta cutoffs",
          "Handles randomness via expected values",
          "Faster than MCTS for simple positions",
        ],
        strengths: [
          "Very fast for low-depth searches",
          "Deterministic (same input = same output)",
          "Lower CPU usage than MCTS",
        ],
        bestFor: "Simple formats, known team matchups, testing",
        status: "Engine implementation required",
      },
    },
    {
      id: "iterative_deepening",
      name: "Iterative Deepening",
      icon: "🔢",
      desc: "Depth-based Search",
      detail: "Time-constrained scenarios",
      active: false,
      explanation: {
        title: "Iterative Deepening Search",
        description:
          "A future algorithm that searches incrementally deeper until time runs out.",
        howItWorks: [
          "Starts with shallow 1-ply search",
          "Incrementally searches deeper (2-ply, 3-ply...)",
          "Uses previous results to guide deeper search",
          "Stops when time limit reached",
        ],
        strengths: [
          "Always has a valid answer (best so far)",
          "Good for strict time constraints",
          "Efficient use of thinking time",
        ],
        bestFor: "Time pressure situations, fast-paced formats",
        status: "Engine implementation required",
      },
    },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="text-green-400" size={32} />
        <h2 className="text-3xl font-bold">Performance Settings</h2>
      </div>

      {/* Card 1: Algorithm cards (unchanged) */}
      <Card title="🧠 Search Algorithm" tooltip="MCTS is the active AI algorithm">
        <div className="grid grid-cols-3 gap-4">
          {algorithms.map((algo) => (
            <button
              key={algo.id}
              onClick={() => setShowAlgoInfo(algo)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                algo.active
                  ? "border-purple-500 bg-purple-900 bg-opacity-30"
                  : "border-gray-600 bg-gray-700 opacity-60 hover:opacity-80 hover:border-gray-500"
              }`}
            >
              <div className="text-2xl mb-2">{algo.icon}</div>
              <h4 className="font-semibold text-sm mb-1">{algo.name}</h4>
              <p className="text-xs text-gray-400 mb-1">{algo.desc}</p>
              <p className="text-xs text-gray-500">{algo.detail}</p>
              {algo.active && (
                <div className="mt-2 text-xs text-purple-400 font-semibold">✓ Active</div>
              )}
              {!algo.active && (
                <div className="mt-2 text-xs text-gray-500">
                  Coming Soon - Click to learn more
                </div>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* NEW Card 2: Decision Strategy (EPoké + Manual Mode) */}
      <Card
        title="⚡ Decision Strategy"
        tooltip="EPoké fast path + Manual Mode controls; Manual Mode shows EPoké & MCTS suggestions and waits for you"
      >
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={!!enableEpoke}
                onChange={(e) => setEnableEpoke(e.target.checked)}
              />
              <span>Enable EPoké fast path</span>
            </label>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={!!manualDecisionMode}
                onChange={(e) => setManualDecisionMode(e.target.checked)}
              />
              <span>Manual Decision Mode (show EPoké + MCTS and wait)</span>
            </label>
          </div>

          <div className="space-y-4">
            <Slider
              label={"EPoké Timeout (ms)"}
              value={epokeTimeoutMs}
              onChange={setEpokeTimeoutMs}
              min={200}
              max={1500}
              step={50}
              tooltip="How long to wait for EPoké before falling back to MCTS"
            />
            <Slider
              label={"Decision Deadline (ms)"}
              value={decisionDeadlineMs}
              onChange={setDecisionDeadlineMs}
              min={1000}
              max={10000}
              step={250}
              tooltip="When Manual Mode is ON: auto-pick after this time"
            />
          </div>
        </div>
      </Card>

      {/* Card 3: Search Parameters & Battle Limits (unchanged content) */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <span>⚙️ Search Parameters & Battle Limits</span>
            <button
              onClick={() => setShowGuide(true)}
              className="ml-2 p-1 rounded-lg hover:bg-gray-700 transition-colors"
              title="Parameter Guide"
            >
              <Info size={18} className="text-gray-400 hover:text-blue-400" />
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Row 1 - Think Time & Run Count */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Slider
                label="Think Time (ms)"
                value={searchMs}
                onChange={setSearchMs}
                min={100}
                max={10000}
                tooltip="Time the bot spends thinking per move. Higher = smarter decisions but slower gameplay."
              />
              <div className="mt-2 text-xs text-gray-400">
                {searchMs < 1000 && "⚡ Fast mode"}
                {searchMs >= 1000 && searchMs < 3000 && "⚖️ Balanced"}
                {searchMs >= 3000 && searchMs < 5000 && "🧠 Deep thinking"}
                {searchMs >= 5000 && "🎯 Maximum strength"}
              </div>
            </div>

            <div>
              <Slider
                label="Run Count"
                value={runCount}
                onChange={setRunCount}
                min={1}
                max={100}
                tooltip="Number of battles before auto-stop. Just convenience, doesn't affect AI quality."
              />
            </div>
          </div>

          {/* Row 2 - Search Parallelism & Max Concurrent Battles */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Slider
                label="Search Parallelism"
                value={searchParallelism}
                onChange={setSearchParallelism}
                min={1}
                max={8}
                tooltip="Number of parallel search threads. Set to your CPU core count."
              />
              <div className="mt-2 text-xs text-gray-400">
                {searchParallelism === 1 && "🔄 Single-threaded"}
                {searchParallelism === 2 && "⚡ Dual-core"}
                {searchParallelism >= 3 &&
                  searchParallelism <= 4 &&
                  "💪 Quad-core"}
                {searchParallelism >= 5 && "🚀 Multi-core"}
              </div>
            </div>

            <div>
              <Slider
                label="Max Concurrent Battles"
                value={maxConcurrent}
                onChange={setMaxConcurrent}
                min={1}
                max={5}
                tooltip="Number of simultaneous battles. Keep at 1 for stability!"
              />
              {maxConcurrent > 1 && (
                <div className="mt-2 bg-yellow-900 bg-opacity-20 border border-yellow-500 rounded-lg p-2">
                  <div className="text-xs text-yellow-300">
                    <strong>⚠️</strong> Experimental - may cause timeouts
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Algorithm Info Modal (unchanged) */}
      {showAlgoInfo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50"
          onClick={() => setShowAlgoInfo(null)}
        >
          <div
            className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{showAlgoInfo.icon}</span>
                <div className="text-xl font-semibold">
                  {showAlgoInfo.explanation.title}
                </div>
              </div>
              <button
                onClick={() => setShowAlgoInfo(null)}
                className="text-sm px-3 py-1 rounded-lg border border-gray-600 hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>

            {!showAlgoInfo.active && (
              <div className="bg-yellow-900 bg-opacity-20 border border-yellow-500 rounded-lg p-3">
                <div className="text-sm text-yellow-300 font-semibold">
                  🚧 {showAlgoInfo.explanation.status || "Coming Soon"}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-300">
              {showAlgoInfo.explanation.description}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="font-semibold text-blue-300 mb-2">
                  🔧 How It Works
                </div>
                <ul className="text-sm text-gray-300 space-y-1">
                  {showAlgoInfo.explanation.howItWorks.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="font-semibold text-green-300 mb-2">✨ Strengths</div>
                <ul className="text-sm text-gray-300 space-y-1">
                  {showAlgoInfo.explanation.strengths.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="font-semibold text-purple-300 mb-2">🎯 Best For</div>
              <div className="text-sm text-gray-300">
                {showAlgoInfo.explanation.bestFor}
              </div>
            </div>

            {showAlgoInfo.active && (
              <div className="bg-green-900 bg-opacity-20 border border-green-500 rounded-lg p-3">
                <div className="text-sm text-green-300">
                  ✓ This algorithm is currently active and being used for battles.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parameter Guide Modal (unchanged) */}
      {showGuide && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-xl font-semibold">📖 Parameter Guide</div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-sm px-3 py-1 rounded-lg border border-gray-600 hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="text-sm text-gray-300 mb-4">
              Understanding what each parameter does and how it affects bot performance.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="font-semibold text-blue-300 mb-2">
                  🕐 Think Time (Most Important)
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  <div>• Determines how long AI thinks per move</div>
                  <div>• More time = more simulations = better decisions</div>
                  <div>• <strong>Low values cause "crazy" moves!</strong></div>
                  <div>• Recommended: 3000ms+ for quality gameplay</div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="font-semibold text-purple-300 mb-2">
                  🔀 Search Parallelism
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  <div>• Number of parallel search threads</div>
                  <div>• Makes search faster, doesn't improve quality</div>
                  <div>• Set to CPU core count (check Activity Monitor)</div>
                  <div>• Diminishing returns beyond core count</div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="font-semibold text-green-300 mb-2">🎯 Run Count</div>
                <div className="text-sm text-gray-300 space-y-1">
                  <div>• Number of battles before auto-stop</div>
                  <div>• Just convenience, doesn't affect AI</div>
                  <div>• Use 1 for testing, 10+ for grinding</div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="font-semibold text-yellow-300 mb-2">
                  ⚠️ Max Concurrent (Keep at 1!)
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  <div>• Multiple battles at once</div>
                  <div>• <strong>Experimental and risky</strong></div>
                  <div>• High CPU load, possible timeouts</div>
                  <div>• Always use 1 unless testing</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
