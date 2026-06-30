import React from "react";

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

export default function ThemeToggle({ isDarkMode, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-[70px] h-[34px] rounded-full p-[2px] transition-all duration-300 ease-in-out cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#FF671F] focus:ring-offset-2 overflow-hidden shrink-0 ${
        isDarkMode 
          ? "hover:shadow-[0_0_12px_rgba(48,43,99,0.85)] border border-[#302b63]" 
          : "hover:shadow-[0_0_12px_rgba(247,151,30,0.85)] border border-[#ffd200]"
      }`}
      style={{
        background: isDarkMode 
          ? "linear-gradient(135deg, #0f0c29, #302b63)" 
          : "linear-gradient(135deg, #f7971e, #ffd200)",
        borderColor: isDarkMode ? "#302b63" : "#ffd200"
      }}
      aria-label="Toggle Day/Night Mode"
    >
      <style>{`
        @keyframes slow-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .slow-rotate-element {
          animation: slow-rotate 10s linear infinite;
        }
      `}</style>

      {/* Decorative stars / sparkles for Night Mode (visible on the right) */}
      <div 
        className={`absolute inset-0 transition-all duration-300 pointer-events-none ${
          isDarkMode ? "opacity-100 scale-100" : "opacity-0 scale-50"
        }`}
      >
        {/* Small star (6px) at top-right area */}
        <span 
          className="absolute text-[6px] leading-none animate-pulse" 
          style={{ 
            color: "#FFD700", 
            top: "5px", 
            right: "8px"
          }}
        >
          ✦
        </span>
        {/* Slightly larger star (9px) at middle-right area */}
        <span 
          className="absolute text-[9px] leading-none animate-pulse" 
          style={{ 
            color: "#FFD700", 
            top: "14px", 
            right: "20px",
            animationDelay: "150ms"
          }}
        >
          ✦
        </span>
      </div>

      {/* Decorative cloud for Day Mode (visible on the left) */}
      <div 
        className={`absolute left-2.5 top-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none ${
          isDarkMode ? "opacity-0 scale-50 -translate-x-2" : "opacity-100 scale-100 translate-x-0"
        }`}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="text-white drop-shadow-sm">
          <path d="M19.36 10.04a6 6 0 0 0-11.33-1.44 4.5 4.5 0 0 0-1.36 8.76h12.5a5 5 0 0 0 .19-7.32z"/>
        </svg>
      </div>

      {/* Sliding Circle Container */}
      <div
        className="w-[28px] h-[28px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center transition-transform duration-300 ease-in-out absolute top-[2px] left-[2px] pointer-events-none"
        style={{
          transform: isDarkMode ? "translateX(0px)" : "translateX(38px)"
        }}
      >
        {isDarkMode ? (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="text-indigo-800">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-500 w-3.5 h-3.5 slow-rotate-element">
            <circle cx="12" cy="12" r="5" fill="currentColor"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        )}
      </div>
    </button>
  );
}
