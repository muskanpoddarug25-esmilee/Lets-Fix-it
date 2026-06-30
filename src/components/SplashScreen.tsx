import React from "react";

export default function SplashScreen() {
  return (
    <div
      id="splash-screen"
      className="flex flex-col items-center justify-center"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        backgroundColor: "#0a1628",
        animation: "fadeSplashOut 2s ease-in-out forwards",
      }}
    >
      <style>{`
        @keyframes chakraSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInText {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSplashOut {
          0% { opacity: 1; }
          75% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-spin-chakra {
          animation: chakraSpin 2s linear infinite;
        }
        .animate-fade-in-text {
          animation: fadeInText 1s ease-out forwards;
        }
      `}</style>

      <div className="flex flex-col items-center gap-6 max-w-xs text-center">
        {/* Spinning logo */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <img
            src="/LetsFixIt.png"
            alt="LetsFixIt India Logo"
            className="w-full h-full object-contain animate-spin-chakra"
          />
        </div>

        {/* Text descriptions */}
        <div className="space-y-2 animate-fade-in-text">
          <h1 className="text-3xl font-black tracking-wider text-white">
            LetsFixIt India
          </h1>
          <p className="text-sm font-bold tracking-wide" style={{ color: "#FF671F" }}>
            Spot it. Report it. Fix it. 🇮🇳
          </p>
        </div>
      </div>
    </div>
  );
}
