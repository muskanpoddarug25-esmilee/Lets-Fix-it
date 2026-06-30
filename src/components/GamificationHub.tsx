import React, { useState, useEffect } from "react";
import { Gamepad2, Award, Sparkles, Trophy, Trash2, ArrowRight, ShieldAlert, CheckCircle2, RotateCcw, ArrowLeft } from "lucide-react";
import { UserProfile } from "../types";

interface GamificationHubProps {
  userProfile: UserProfile;
  onUpdatePoints: (pointsEarned: number) => void;
  isDarkMode: boolean;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

const CIVIC_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "What is the official nationwide citizen grievance helpline number for the Swachh Bharat Mission (MoHUA)?",
    options: ["1912", "1969", "1073", "112"],
    correctAnswerIndex: 1,
    explanation: "1969 is the dedicated MoHUA helpline for citizens to report cleanliness complaints, request services, and register civic suggestions."
  },
  {
    id: 2,
    question: "Under which Ministry of the Government of India is the Smart Cities Mission and urban planning administered?",
    options: ["Ministry of Home Affairs", "Ministry of Urban Infrastructure", "Ministry of Housing & Urban Affairs (MoHUA)", "Ministry of Electronics & IT"],
    correctAnswerIndex: 2,
    explanation: "The Smart Cities Mission is a major initiative under MoHUA, which oversees housing and municipal corporations across the nation."
  },
  {
    id: 3,
    question: "What is the unified emergency responder helpline number activated across all Indian States & Union Territories?",
    options: ["100", "101", "112", "102"],
    correctAnswerIndex: 2,
    explanation: "112 is India's all-in-one Emergency Response Support System (ERSS), integrating police, fire, health, and disaster alerts."
  },
  {
    id: 4,
    question: "Which Indian city has consistently secured the Rank 1 Cleanest City award in the Swachh Survekshan national rankings?",
    options: ["New Delhi", "Indore", "Mumbai", "Bengaluru"],
    correctAnswerIndex: 1,
    explanation: "Indore (Madhya Pradesh) has won the cleanest city award for 7 consecutive years due to exemplary municipal waste segregation and citizen participation."
  },
  {
    id: 5,
    question: "When reporting a pothole, which factor is most crucial for LetsFixIt computer vision models to estimate risk levels?",
    options: ["The color of the asphalt", "Its proximity to schools or hospitals and estimated depth", "The ambient temperature", "The name of the road"],
    correctAnswerIndex: 1,
    explanation: "Depth and location density (e.g. near schools or high-speed curves) determine the severity risk and forecast decay costing."
  }
];

export default function GamificationHub({ userProfile, onUpdatePoints, isDarkMode }: GamificationHubProps) {
  const [activeGame, setActiveGame] = useState<"menu" | "potholes" | "cleanup" | "quiz">("menu");
  const [gameState, setGameState] = useState<"intro" | "playing" | "ended">("intro");
  const [pointsAwarded, setPointsAwarded] = useState(0);

  // 1. Pothole Game State
  const [potholes, setPotholes] = useState<{ id: number; active: boolean; scale: number; type: "cracked" | "deep" }[]>([]);
  const [potholeScore, setPotholeScore] = useState(0);
  const [potholesMissed, setPotholesMissed] = useState(0);
  const [roadHealth, setRoadHealth] = useState(100);

  // 2. Clean up Game State
  const [wasteItems, setWasteItems] = useState<{ id: number; type: "dry" | "wet" | "hazardous"; label: string; icon: string }[]>([]);
  const [currentWasteIndex, setCurrentWasteIndex] = useState(0);
  const [cleanupScore, setCleanupScore] = useState(0);
  const [cleanupLives, setCleanupLives] = useState(3);

  // 3. Quiz Game State
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  // Pothole Game Loop
  useEffect(() => {
    if (activeGame !== "potholes" || gameState !== "playing") return;

    // Create 6 grid slots for potholes
    const initial = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      active: false,
      scale: 1,
      type: "cracked" as const
    }));
    setPotholes(initial);
    setPotholeScore(0);
    setRoadHealth(100);
    setPotholesMissed(0);

    const interval = setInterval(() => {
      setPotholes((prev) => {
        // Randomly activate an inactive pothole
        const inactive = prev.filter((p) => !p.active);
        if (inactive.length === 0) {
          // If all potholes are active and we don't fix them, road health drops
          setRoadHealth((h) => Math.max(0, h - 12));
          return prev;
        }

        const randomSlot = inactive[Math.floor(Math.random() * inactive.length)];
        return prev.map((p) => {
          if (p.id === randomSlot.id) {
            return {
              ...p,
              active: true,
              scale: 0.4,
              type: Math.random() > 0.4 ? "cracked" : "deep"
            };
          }
          return p;
        });
      });
    }, 1100);

    // Slowly grow existing potholes if not clicked
    const growthInterval = setInterval(() => {
      setPotholes((prev) => {
        let healthDamage = 0;
        const next = prev.map((p) => {
          if (p.active) {
            if (p.scale >= 1.2) {
              // Pothole burst / got critical
              healthDamage += p.type === "deep" ? 15 : 8;
              return { ...p, active: false }; // clear it after damage
            }
            return { ...p, scale: p.scale + 0.15 };
          }
          return p;
        });
        if (healthDamage > 0) {
          setRoadHealth((h) => Math.max(0, h - healthDamage));
        }
        return next;
      });
    }, 500);

    return () => {
      clearInterval(interval);
      clearInterval(growthInterval);
    };
  }, [activeGame, gameState]);

  // Check road health game over
  useEffect(() => {
    if (activeGame === "potholes" && gameState === "playing" && roadHealth <= 0) {
      setGameState("ended");
      const earned = Math.floor(potholeScore * 2);
      setPointsAwarded(earned);
      onUpdatePoints(earned);
    }
  }, [roadHealth]);

  // Cleanup Waste items initialization
  const spawnWasteItem = () => {
    const items = [
      { id: 1, type: "dry" as const, label: "Empty Plastic Bottle", icon: "🍼" },
      { id: 2, type: "wet" as const, label: "Sari Tomato Peelings", icon: "🍅" },
      { id: 3, type: "hazardous" as const, label: "Discarded Alkaline Battery", icon: "🔋" },
      { id: 4, type: "dry" as const, label: "Used Cardboard Tea Box", icon: "📦" },
      { id: 5, type: "wet" as const, label: "Spent Chai Tea Leaves", icon: "🍂" },
      { id: 6, type: "hazardous" as const, label: "Shattered Fluorescent Bulb", icon: "💡" },
      { id: 7, type: "dry" as const, label: "Crinkled Newspaper", icon: "📰" },
      { id: 8, type: "wet" as const, label: "Rotten Banana Stem", icon: "🍌" }
    ];
    // shuffle items
    setWasteItems(items.sort(() => Math.random() - 0.5));
    setCurrentWasteIndex(0);
    setCleanupScore(0);
    setCleanupLives(3);
  };

  const handleCleanupAnswer = (category: "dry" | "wet" | "hazardous") => {
    const currentItem = wasteItems[currentWasteIndex];
    if (currentItem.type === category) {
      setCleanupScore((s) => s + 10);
    } else {
      setCleanupLives((l) => l - 1);
    }

    if (currentWasteIndex < wasteItems.length - 1 && cleanupLives > (currentItem.type === category ? 0 : 1)) {
      setCurrentWasteIndex((idx) => idx + 1);
    } else {
      setGameState("ended");
      const finalScore = cleanupScore + (currentItem.type === category ? 10 : 0);
      const earned = Math.floor(finalScore / 2);
      setPointsAwarded(earned);
      onUpdatePoints(earned);
    }
  };

  // Quiz Handling
  const startQuiz = () => {
    setCurrentQuizIndex(0);
    setSelectedAnswer(null);
    setQuizScore(0);
    setShowExplanation(false);
  };

  const handleQuizAnswer = (optionIndex: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optionIndex);
    const correct = CIVIC_QUIZ_QUESTIONS[currentQuizIndex].correctAnswerIndex === optionIndex;
    if (correct) {
      setQuizScore((s) => s + 20);
    }
    setShowExplanation(true);
  };

  const nextQuizQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    if (currentQuizIndex < CIVIC_QUIZ_QUESTIONS.length - 1) {
      setCurrentQuizIndex((idx) => idx + 1);
    } else {
      setGameState("ended");
      const earned = quizScore;
      setPointsAwarded(earned);
      onUpdatePoints(earned);
    }
  };

  const fixPothole = (id: number) => {
    setPotholes((prev) =>
      prev.map((p) => {
        if (p.id === id && p.active) {
          setPotholeScore((s) => s + 10);
          return { ...p, active: false };
        }
        return p;
      })
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Hub Header */}
      <div className="flex flex-col gap-2">
        <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-[#FF6B00] text-[10px] font-extrabold rounded uppercase font-mono tracking-widest w-fit">
          LetsFixIt Playroom
        </span>
        <h2 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Gamepad2 className="h-6 w-6 text-orange-500" /> Bharat Gamification Hub
        </h2>
        <p className="text-xs text-slate-400">
          Play fun, educational, theme-related mini-games to sharpen your civic awareness and earn real upgrade points for your account!
        </p>
      </div>

      {activeGame === "menu" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Game 1: Pothole Patrol */}
          <div 
            className="p-6 rounded-2xl border flex flex-col justify-between h-80 group hover:shadow-2xl hover:border-orange-500/40 transition-all cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
            onClick={() => {
              setActiveGame("potholes");
              setGameState("intro");
            }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-500/10 to-transparent z-0"></div>
            <div className="relative z-10 space-y-4">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-2xl w-fit">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-orange-400 transition-colors">Pothole Patrol</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Emergency! Potholes are forming across the Delhi highway. Tap and compact them before they expand and compromise road safety metrics!
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 relative z-10">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Reflex Action Game</span>
              <span className="text-[#FF6B00] group-hover:translate-x-1.5 transition-transform"><ArrowRight className="h-4 w-4" /></span>
            </div>
          </div>

          {/* Game 2: Public Property Clean-up */}
          <div 
            className="p-6 rounded-2xl border flex flex-col justify-between h-80 group hover:shadow-2xl hover:border-emerald-500/40 transition-all cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
            onClick={() => {
              setActiveGame("cleanup");
              setGameState("intro");
              spawnWasteItem();
            }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent z-0"></div>
            <div className="relative z-10 space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl w-fit">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">Swachh Sort Center</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sort incoming municipal trash into Dry, Wet, or Hazardous bins. Achieve perfect segregation and prevent land degradation!
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 relative z-10">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">sorting & speed game</span>
              <span className="text-emerald-400 group-hover:translate-x-1.5 transition-transform"><ArrowRight className="h-4 w-4" /></span>
            </div>
          </div>

          {/* Game 3: National Civic Quiz */}
          <div 
            className="p-6 rounded-2xl border flex flex-col justify-between h-80 group hover:shadow-2xl hover:border-indigo-500/40 transition-all cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
            onClick={() => {
              setActiveGame("quiz");
              setGameState("intro");
              startQuiz();
            }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent z-0"></div>
            <div className="relative z-10 space-y-4">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-2xl w-fit">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors">National Civic & Swachh Quiz</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Test your knowledge of Indian municipal protocols, emergency hotlines, and citizen integration campaigns. Become an enlightened citizen!
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 relative z-10">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">knowledge trivia quiz</span>
              <span className="text-indigo-400 group-hover:translate-x-1.5 transition-transform"><ArrowRight className="h-4 w-4" /></span>
            </div>
          </div>
        </div>
      )}

      {/* 1. Pothole Patrol Game Screen */}
      {activeGame === "potholes" && (
        <div 
          className="relative p-8 rounded-2xl border flex flex-col items-center justify-center min-h-[400px] text-center space-y-6"
          style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
        >
          {/* Back Button */}
          <button
            onClick={() => { setActiveGame("menu"); setGameState("intro"); }}
            className="absolute z-30 flex items-center gap-1.5 transition-all cursor-pointer border border-white/10 hover:opacity-95"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(0,0,0,0.4)",
              color: "white",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: "bold"
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
          {gameState === "intro" && (
            <div className="max-w-md space-y-6">
              <ShieldAlert className="h-16 w-16 text-orange-500 mx-auto animate-bounce" />
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">Initialize Pothole Patrol</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Potholes will rapidly open on the roadway grid. Tap each hole to apply instant asphalt repair. If Road Health drops to 0% due to unfixed craters, the patrol fails!
                </p>
              </div>
              <button
                onClick={() => setGameState("playing")}
                className="px-6 py-3 bg-[#FF6B00] hover:bg-[#E05300] text-white font-extrabold text-sm uppercase rounded-xl tracking-wider transition-all cursor-pointer"
              >
                Commence Patrol
              </button>
            </div>
          )}

          {gameState === "playing" && (
            <div className="w-full space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800 w-full">
                <div className="text-left">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Road Health Meter</span>
                  <div className="w-48 bg-slate-800 rounded-full h-3 mt-1 overflow-hidden border border-slate-900">
                    <div 
                      className={`h-full transition-all duration-300 ${roadHealth > 50 ? "bg-emerald-500" : roadHealth > 25 ? "bg-amber-500" : "bg-red-500 animate-pulse"}`}
                      style={{ width: `${roadHealth}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold mt-1 block">{roadHealth}% Safety Standard</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Repairs Executed</span>
                  <span className="text-xl font-black text-orange-500">{potholeScore / 10} Roads Fixed</span>
                </div>
              </div>

              {/* Highway Grid */}
              <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto p-4 bg-slate-900/40 rounded-2xl border border-slate-800">
                {potholes.map((p) => (
                  <div 
                    key={p.id}
                    onClick={() => p.active && fixPothole(p.id)}
                    className={`h-24 rounded-xl flex items-center justify-center cursor-pointer transition-all border relative overflow-hidden select-none ${
                      p.active 
                        ? p.type === "deep" 
                          ? "bg-red-500/10 border-red-500/40 hover:bg-red-500/20" 
                          : "bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20"
                        : "bg-slate-950/40 border-slate-800/50 hover:bg-slate-900/30"
                    }`}
                  >
                    {p.active ? (
                      <div 
                        className="flex flex-col items-center transition-all"
                        style={{ transform: `scale(${p.scale})` }}
                      >
                        <span className="text-2xl animate-pulse">
                          {p.type === "deep" ? "🕳️" : "⚠️"}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-wider mt-1 px-1 rounded ${p.type === "deep" ? "bg-red-500 text-white" : "bg-amber-500 text-slate-950"}`}>
                          {p.type === "deep" ? "Critical" : "Crack"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-700 uppercase">Clear Highway</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameState === "ended" && (
            <div className="max-w-md space-y-6">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto animate-bounce" />
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">Patrol Completed</h3>
                <p className="text-sm text-slate-300">
                  You successfully repaired the roads and kept civilian vehicles safe from severe damage!
                </p>
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 mt-4">
                  <span className="block text-[10px] font-mono uppercase text-slate-500">Upgrade Reward</span>
                  <span className="text-2xl font-black text-[#FF6B00] flex items-center justify-center gap-1">
                    +{pointsAwarded} Civic Points
                  </span>
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setGameState("playing");
                    setRoadHealth(100);
                    setPotholeScore(0);
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer border border-slate-700"
                >
                  <RotateCcw className="h-4 w-4" /> Try Again
                </button>
                <button
                  onClick={() => setActiveGame("menu")}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Return to Hub Menu
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Swachh Sort Center Screen */}
      {activeGame === "cleanup" && (
        <div 
          className="relative p-8 rounded-2xl border flex flex-col items-center justify-center min-h-[400px] text-center space-y-6"
          style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
        >
          {/* Back Button */}
          <button
            onClick={() => { setActiveGame("menu"); setGameState("intro"); }}
            className="absolute z-30 flex items-center gap-1.5 transition-all cursor-pointer border border-white/10 hover:opacity-95"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(0,0,0,0.4)",
              color: "white",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: "bold"
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
          {gameState === "intro" && (
            <div className="max-w-md space-y-6">
              <Trash2 className="h-16 w-16 text-emerald-500 mx-auto animate-bounce" />
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">Start Swachh Sort Center</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Municipal waste items are arriving at the recycling terminal. Correctly classify them as Dry Waste, Wet Waste, or Hazardous Waste before you run out of lives!
                </p>
              </div>
              <button
                onClick={() => setGameState("playing")}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm uppercase rounded-xl tracking-wider transition-all cursor-pointer"
              >
                Start Sorting
              </button>
            </div>
          )}

          {gameState === "playing" && wasteItems.length > 0 && (
            <div className="w-full space-y-8 max-w-xl mx-auto">
              {/* Game Stats */}
              <div className="flex justify-between items-center bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="text-left">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Errors Allowed</span>
                  <span className="text-sm font-extrabold text-red-400">
                    {"❤️".repeat(cleanupLives) || "💔 Game Over"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Segregation Index</span>
                  <span className="text-xl font-black text-emerald-400">+{cleanupScore} Points</span>
                </div>
              </div>

              {/* Current Waste Spawner card */}
              <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-4 animate-scaleUp">
                <span className="text-5xl block animate-pulse">{wasteItems[currentWasteIndex].icon}</span>
                <div>
                  <h4 className="text-base font-black text-white">{wasteItems[currentWasteIndex].label}</h4>
                  <span className="text-[10px] font-mono uppercase text-slate-500">Item {currentWasteIndex + 1} of {wasteItems.length}</span>
                </div>
              </div>

              {/* Bin triggers */}
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleCleanupAnswer("dry")}
                  className="py-4 bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/30 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">🔵</span>
                  <span className="text-[10px] font-black uppercase text-blue-400">Dry Waste</span>
                </button>

                <button
                  onClick={() => handleCleanupAnswer("wet")}
                  className="py-4 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">🟢</span>
                  <span className="text-[10px] font-black uppercase text-emerald-400">Wet Waste</span>
                </button>

                <button
                  onClick={() => handleCleanupAnswer("hazardous")}
                  className="py-4 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">🔴</span>
                  <span className="text-[10px] font-black uppercase text-red-400">Hazardous</span>
                </button>
              </div>
            </div>
          )}

          {gameState === "ended" && (
            <div className="max-w-md space-y-6">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto animate-bounce" />
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">Sorting Session Finished</h3>
                <p className="text-sm text-slate-300">
                  Outstanding work sorting waste! Effective waste management directly preserves urban biodiversity.
                </p>
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 mt-4">
                  <span className="block text-[10px] font-mono uppercase text-slate-500">Points Awarded</span>
                  <span className="text-2xl font-black text-emerald-400 flex items-center justify-center gap-1">
                    +{pointsAwarded} Civic Points
                  </span>
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setGameState("playing");
                    spawnWasteItem();
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer border border-slate-700"
                >
                  <RotateCcw className="h-4 w-4" /> Reset Game
                </button>
                <button
                  onClick={() => setActiveGame("menu")}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Return to Hub
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. National Civic Quiz Screen */}
      {activeGame === "quiz" && (
        <div 
          className="relative p-8 rounded-2xl border flex flex-col items-center justify-center min-h-[400px] text-center space-y-6"
          style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
        >
          {/* Back Button */}
          <button
            onClick={() => { setActiveGame("menu"); setGameState("intro"); }}
            className="absolute z-30 flex items-center gap-1.5 transition-all cursor-pointer border border-white/10 hover:opacity-95"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(0,0,0,0.4)",
              color: "white",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: "bold"
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
          {gameState === "intro" && (
            <div className="max-w-md space-y-6">
              <Award className="h-16 w-16 text-indigo-500 mx-auto animate-bounce" />
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">National Civic & Swachh Trivia</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Earn points by correctly answering key trivia about national helplines, municipal departments, and Swachh Bharat cleanliness protocols!
                </p>
              </div>
              <button
                onClick={() => setGameState("playing")}
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-sm uppercase rounded-xl tracking-wider transition-all cursor-pointer"
              >
                Initiate Exam
              </button>
            </div>
          )}

          {gameState === "playing" && (
            <div className="w-full space-y-6 max-w-xl mx-auto text-left">
              <div className="flex justify-between items-center bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
                  Question {currentQuizIndex + 1} of {CIVIC_QUIZ_QUESTIONS.length}
                </span>
                <span className="text-xs font-black text-indigo-400">
                  Current Score: {quizScore} Points
                </span>
              </div>

              {/* Question card */}
              <div className="p-6 bg-slate-950/30 border border-slate-800/80 rounded-2xl">
                <h4 className="text-sm font-extrabold text-white leading-relaxed">
                  {CIVIC_QUIZ_QUESTIONS[currentQuizIndex].question}
                </h4>
              </div>

              {/* Options list */}
              <div className="space-y-3">
                {CIVIC_QUIZ_QUESTIONS[currentQuizIndex].options.map((option, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const isCorrect = CIVIC_QUIZ_QUESTIONS[currentQuizIndex].correctAnswerIndex === idx;
                  const isWrong = isSelected && !isCorrect;

                  let optionStyle = "bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/30";
                  if (selectedAnswer !== null) {
                    if (isCorrect) {
                      optionStyle = "bg-emerald-500/10 border-emerald-500/50 text-emerald-400";
                    } else if (isWrong) {
                      optionStyle = "bg-red-500/10 border-red-500/50 text-red-400";
                    } else {
                      optionStyle = "bg-slate-950/20 border-slate-900 text-slate-600";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuizAnswer(idx)}
                      disabled={selectedAnswer !== null}
                      className={`w-full p-4 border rounded-xl text-xs font-semibold text-left transition-all flex justify-between items-center ${
                        selectedAnswer === null ? "cursor-pointer" : "cursor-default"
                      } ${optionStyle}`}
                    >
                      <span>{option}</span>
                      {selectedAnswer !== null && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {selectedAnswer !== null && isWrong && <ShieldAlert className="h-4 w-4 text-red-500" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation panel */}
              {showExplanation && (
                <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-2 animate-fadeIn text-xs leading-relaxed">
                  <h5 className="font-extrabold text-indigo-400 uppercase text-[9px] tracking-wider">Civic Insight</h5>
                  <p className="text-slate-300">{CIVIC_QUIZ_QUESTIONS[currentQuizIndex].explanation}</p>
                  <button
                    onClick={nextQuizQuestion}
                    className="mt-3 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg cursor-pointer text-[10px] uppercase flex items-center gap-1 ml-auto"
                  >
                    <span>Next Question</span> <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {gameState === "ended" && (
            <div className="max-w-md space-y-6">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto animate-bounce" />
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">Quiz Completed Successfully</h3>
                <p className="text-sm text-slate-300">
                  Excellent work on completing the Civic Exam! Educated citizens are the foundation of smart local governance.
                </p>
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 mt-4">
                  <span className="block text-[10px] font-mono uppercase text-slate-500">Points Awarded</span>
                  <span className="text-2xl font-black text-indigo-400 flex items-center justify-center gap-1">
                    +{pointsAwarded} Civic Points
                  </span>
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setGameState("playing");
                    startQuiz();
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer border border-slate-700"
                >
                  <RotateCcw className="h-4 w-4" /> Retry Quiz
                </button>
                <button
                  onClick={() => setActiveGame("menu")}
                  className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Return to Hub
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
