import React, { useRef, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface CustomCaptchaProps {
  id: string;
  value: string;
  onChange: (val: string) => void;
  onCodeGenerated: (code: string) => void;
  isDarkMode?: boolean;
}

export default function CustomCaptcha({
  id,
  value,
  onChange,
  onCodeGenerated,
  isDarkMode = true
}: CustomCaptchaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentCode, setCurrentCode] = useState("");

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"; // excluded confusing characters
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const drawCaptcha = (code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Always draw on a white background regardless of theme
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw noise lines in medium grey #888888
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = "rgba(136, 136, 136, 0.45)";
      ctx.lineWidth = Math.random() * 2 + 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Draw noise dots in medium grey #888888
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = "rgba(136, 136, 136, 0.35)";
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw characters
    ctx.textBaseline = "middle";
    const fontFamilies = ["Arial", "Verdana", "Courier New", "Georgia", "Impact", "Trebuchet MS"];
    const darkColors = ["#1a1a2e", "#c0392b", "#1a5276", "#145a32"];
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const fontSize = Math.floor(Math.random() * 7) + 24; // 24px - 31px
      ctx.font = `bold ${fontSize}px ${fontFamilies[Math.floor(Math.random() * fontFamilies.length)]}`;
      
      // Randomly pick from dark colors
      ctx.fillStyle = darkColors[Math.floor(Math.random() * darkColors.length)];

      const x = 12 + i * 23 + Math.random() * 4;
      const y = canvas.height / 2 + (Math.random() * 8 - 4);
      const angle = (Math.random() * 24 - 12) * Math.PI / 180; // -12 to +12 degrees

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  };

  const regenerate = () => {
    const code = generateCode();
    setCurrentCode(code);
    onCodeGenerated(code);
    // Slight delay to ensure canvas rendering context is ready
    setTimeout(() => {
      drawCaptcha(code);
    }, 50);
  };

  useEffect(() => {
    regenerate();
  }, [id]);

  const captchaText = "Enter the code above";

  return (
    <div className="flex flex-col gap-2.5 my-3 w-full">
      <div className="flex items-center gap-3">
        <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white shadow-inner flex shrink-0">
          <canvas
            ref={canvasRef}
            width={160}
            height={46}
            style={{ display: "block" }}
            className="cursor-default"
          />
        </div>
        <button
          type="button"
          onClick={regenerate}
          className="flex items-center justify-center p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer group shrink-0"
          title="Refresh CAPTCHA Code"
        >
          <RefreshCw className="h-4 w-4 text-slate-500 dark:text-slate-400 group-hover:rotate-45 transition-transform" />
          <span className="ml-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">Refresh</span>
        </button>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={captchaText}
        autoComplete="off"
        required
        ref={(el) => {
          if (el) {
            el.style.setProperty("color", "#000000", "important");
            el.style.setProperty("background-color", "#ffffff", "important");
          }
        }}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: '16px',
          fontWeight: '600',
          color: '#000000',
          backgroundColor: '#FFFFFF',
          WebkitTextFillColor: '#000000',
          opacity: 1,
          border: '2px solid #FF6600',
          borderRadius: '8px',
          outline: 'none',
          letterSpacing: '2px'
        }}
      />
    </div>
  );
}
