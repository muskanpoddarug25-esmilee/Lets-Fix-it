import React, { useState } from "react";
import { Report } from "../types";
import { ShieldCheck, Navigation, Loader2, Compass, AlertTriangle, ShieldAlert } from "lucide-react";

interface AIChatExplorerProps {
  reports: Report[];
  userCity?: string;
  onClose?: () => void;
}

interface SafetyResultParsed {
  status: string;
  issues: string;
  advice: string;
  alternate: string;
}

export default function AIChatExplorer({ reports, userCity = "New Delhi", onClose }: AIChatExplorerProps) {
  const [routeInput, setRouteInput] = useState("");
  const [isSafetyLoading, setIsSafetyLoading] = useState(false);
  const [safetyResult, setSafetyResult] = useState<SafetyResultParsed | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const closeCommute = onClose || (() => {});

  const parseSafetyResponse = (text: string): SafetyResultParsed => {
    let status = "SAFE";
    let issues = "None";
    let advice = "";
    let alternate = "N/A";

    const statusMatch = text.match(/SAFETY_STATUS:\s*(SAFE|UNSAFE)/i);
    if (statusMatch) {
      status = statusMatch[1].trim().toUpperCase();
    } else if (text.toUpperCase().includes("UNSAFE")) {
      status = "UNSAFE";
    }

    const issuesMatch = text.match(/ISSUES_FOUND:\s*([\s\S]*?)(?=(ADVICE:|ALTERNATE_ROUTE:|$))/i);
    if (issuesMatch) {
      issues = issuesMatch[1].trim();
    }

    const adviceMatch = text.match(/ADVICE:\s*([\s\S]*?)(?=(ALTERNATE_ROUTE:|$))/i);
    if (adviceMatch) {
      advice = adviceMatch[1].trim();
    }

    const alternateMatch = text.match(/ALTERNATE_ROUTE:\s*([\s\S]*?)$/i);
    if (alternateMatch) {
      alternate = alternateMatch[1].trim();
    }

    return { status, issues, advice, alternate };
  };

  const handleCheckSafety = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeInput.trim() || isSafetyLoading) return;

    setIsSafetyLoading(true);
    setSafetyResult(null);
    setErrorMsg(null);

    const apiKey = "AIzaSyAxfKGkS_B6zjxHyc02GJbGGicIEkV0iw4";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const activeCityReports = (reports || []).filter(
      (r) => r.location?.city?.toLowerCase() === userCity.toLowerCase() && r.status !== "Resolved"
    );
    const reportsSummary = activeCityReports
      .map(
        (r) =>
          `- [${r.category.toUpperCase()}] at ${r.location.address}. Severity: ${r.aiAnalysis?.severity || "Medium"}. Status: ${r.status}. Description: ${r.description}`
      )
      .join("\n");

    const prompt = `You are a commute safety assistant for Indian cities.
The user's commute route: "${routeInput}"
City: "${userCity}"

Here are the active, unresolved civic reports reported by citizens in this city in our database:
${reportsSummary || "No active unresolved reports."}

Analyze this route for safety concerns (like potholes, broken streetlights, waterlogging, traffic accidents, construction zones) using the real reports data above if they are on or near the commute route. If there are matching reports from the list above, describe them (e.g. mention the count of unresolved potholes/broken lights/construction work).

Respond in this exact format:
SAFETY_STATUS: SAFE or UNSAFE
ISSUES_FOUND: (list matching reports and safety issues found, or "None")
ADVICE: (one sentence advice)
ALTERNATE_ROUTE: (suggest alternate if unsafe, or "N/A")`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to check route right now. Please try again.");
      }

      const data = await response.json();
      const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!textResult) {
        throw new Error("Empty response from AI");
      }

      const parsed = parseSafetyResponse(textResult);
      setSafetyResult(parsed);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Unable to check route right now. Please try again.");
    } finally {
      setIsSafetyLoading(false);
    }
  };

  const isModal = !!onClose;

  const content = (
    <>
      {isModal && (
        <button 
          onClick={closeCommute} 
          style={{
            position: 'absolute', 
            top: '12px', 
            right: '16px', 
            fontSize: '22px', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            color: 'var(--text-primary)'
          }}
          className="hover:scale-110 transition-transform"
        >
          ✕
        </button>
      )}

      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Compass className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="font-extrabold text-sm uppercase tracking-wider" style={{ color: "var(--card-text)" }}>
          Commute Safety Guard
        </h3>
      </div>

      <div className="space-y-4">
        <div className="bg-[#FFF8F0] dark:bg-slate-950/60 border border-[#FFF3E0] dark:border-slate-800/80 rounded-xl p-3">
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--card-subtext)" }}>
            Provide your commute route or text query (e.g. <strong>"I am walking through Saket block J to the metro station"</strong>). 
            The AI checks the route for potential safety concerns like potholes, broken streetlights, waterlogging, traffic, etc.
          </p>
        </div>

        <form onSubmit={handleCheckSafety} className="space-y-3">
          <label className="block text-[10px] font-mono uppercase font-bold animate-fadeIn" style={{ color: "var(--card-subtext)" }}>
            Commute Route Description
          </label>
          <div className="flex flex-col gap-2.5">
            <input
              type="text"
              value={routeInput}
              onChange={(e) => setRouteInput(e.target.value)}
              placeholder="e.g., Walk from Saket Metro to Select Citywalk"
              className="w-full px-3.5 py-2.5 border focus:border-[#FF6B00] text-xs rounded-xl focus:outline-none shadow-inner commute-route-input"
              style={{
                color: "var(--card-text)",
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--card-border)"
              }}
              required
            />
            <style>{`
              .commute-route-input::placeholder {
                color: var(--text-muted) !important;
                opacity: 0.8 !important;
              }
            `}</style>
            <button
              type="submit"
              disabled={isSafetyLoading}
              className="w-full py-2.5 bg-[#FF6B00] hover:bg-[#E05300] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              {isSafetyLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  <span>Check Safety</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {isSafetyLoading && (
        <div className="mt-4 p-4 text-center text-xs font-bold animate-pulse bg-slate-100 dark:bg-slate-800/50 rounded-xl flex items-center justify-center gap-2" style={{ color: "var(--card-text)" }}>
          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
          <span>Analyzing your route...</span>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-xl text-red-700 text-xs font-semibold text-center">
          {errorMsg}
        </div>
      )}

      {safetyResult && !isSafetyLoading && (
        <div className="mt-4 space-y-3 animate-fadeIn">
          {safetyResult.status === "SAFE" ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold leading-relaxed shadow-sm" style={{ color: "var(--card-text)" }}>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5 mb-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                No major issues found on your route! Have a safe journey
              </span>
              {safetyResult.advice && (
                <p className="mt-2 text-[11px] font-medium" style={{ color: "var(--card-subtext)" }}>
                  <strong>Advice:</strong> {safetyResult.advice}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-xs font-semibold leading-relaxed shadow-sm" style={{ color: "var(--card-text)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-orange-600 shrink-0" />
                  <span className="font-extrabold text-orange-600 dark:text-orange-400">Route Safety Warning</span>
                </div>
                <div className="space-y-2">
                  <p style={{ color: "var(--card-text)" }}>
                    <strong>Issues Found:</strong> {safetyResult.issues}
                  </p>
                  {safetyResult.advice && (
                    <p className="text-[11px] mt-1" style={{ color: "var(--card-subtext)" }}>
                      <strong>Advice:</strong> {safetyResult.advice}
                    </p>
                  )}
                </div>
              </div>

              {safetyResult.alternate && safetyResult.alternate !== "N/A" && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs font-semibold leading-relaxed shadow-sm flex gap-2.5 items-start" style={{ color: "var(--card-text)" }}>
                  <ShieldCheck className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-mono text-blue-600 dark:text-blue-400 uppercase font-bold">SUGGESTED ALTERNATE ROUTE</span>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--card-subtext)" }}>{safetyResult.alternate}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );

  if (!isModal) {
    return (
      <div 
        className="border border-[#FFF3E0] dark:border-slate-800 border-l-4 border-l-[#FF6B00] rounded-2xl p-6 flex flex-col w-full max-w-4xl shadow-2xl relative overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800"
        style={{ 
          backgroundColor: "var(--card-bg)",
          minHeight: "550px"
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div 
      onClick={closeCommute} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(10, 22, 40, 0.75)',
        zIndex: 998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        className="border border-[#FFF3E0] dark:border-slate-800 border-l-4 border-l-[#FF6B00] rounded-2xl p-6 flex flex-col h-[550px] w-full max-w-xl shadow-2xl relative overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800"
        style={{ 
          zIndex: 999,
          backgroundColor: "var(--card-bg)"
        }}
      >
        {content}
      </div>
    </div>
  );
}
