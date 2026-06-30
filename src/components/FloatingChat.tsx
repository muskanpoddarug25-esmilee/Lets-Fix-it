import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Loader2 } from "lucide-react";
import { ChatMessage } from "../types";

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Namaste! I am LetsFixItAI, your digital civic companion. You can ask me questions about municipal departments in India, expected turnaround times, civic guidelines, or even check if your daily commute path is safe. How can I help you today?",
      createdAt: new Date().toLocaleTimeString(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [chatMessages, isOpen]);

  // Handle opening the chat
  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasUnread(false);
    }
  };

  // Helper to format AI responses
  const formatAiResponse = (text: string): string => {
    if (!text) return "";
    let cleaned = text;
    // Strip all ### from responses before displaying
    cleaned = cleaned.replace(/###\s*/g, "");
    // Convert numbered lists to clean 1. 2. 3. format (remove leading dashes/stars before digits if any)
    cleaned = cleaned.replace(/^\s*[-*]\s+(\d+\.)/gm, "$1");
    // Remove any ** bold markers
    cleaned = cleaned.replace(/\*\*/g, "");
    return cleaned;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: "user",
      text: chatInput,
      createdAt: new Date().toLocaleTimeString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text }),
      });

      const data = await response.json();
      const rawText = data.text || "I apologize, but I am having trouble connecting to the network. Please try again.";
      const formattedText = formatAiResponse(rawText);

      setChatMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "ai",
          text: formattedText,
          createdAt: new Date().toLocaleTimeString(),
        },
      ]);

      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "ai",
          text: "Failed to connect to LetsFixItAI. Please make sure your server is running and try again.",
          createdAt: new Date().toLocaleTimeString(),
        },
      ]);
      if (!isOpen) {
        setHasUnread(true);
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .user-bubble-important {
          color: #1a1a1a !important;
          background-color: #FFEBE0 !important;
        }
        .ai-bubble-important {
          color: #1a1a1a !important;
          background-color: #F3E5F5 !important;
        }
        #floating-chat-popup input::placeholder {
          color: #888888 !important;
          opacity: 1 !important;
        }
      `}</style>
      {/* Floating Action Button */}
      <button
        id="floating-chat-btn"
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-[9999] flex items-center justify-center bg-[#FF6600] text-white rounded-full shadow-2xl transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
        style={{ width: "60px", height: "60px" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-white"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/><path d="M6 11V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>
        {hasUnread && !isOpen && (
          <span className="absolute top-1.5 right-1.5 h-3 w-3 bg-orange-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div
          id="floating-chat-popup"
          className="fixed bottom-[92px] right-6 z-[9999] bg-white border border-[#E1BEE7] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn"
          style={{ width: "350px", height: "480px" }}
        >
          {/* Header */}
          <div className="bg-[#FF6600] text-white px-4 py-3.5 flex items-center justify-between border-b border-[#E05300] shrink-0">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/><path d="M6 11V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>
              <span className="font-extrabold text-sm tracking-tight">LetsFixItAI Companion</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-[#E05300] rounded-lg transition-colors text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FCF8FF]">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 max-w-[85%] ${
                  msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    msg.sender === "user"
                      ? "bg-[#001F5B] text-white"
                      : "bg-[#FF6600] text-white"
                  }`}
                >
                  {msg.sender === "user" ? "U" : "AI"}
                </div>

                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed border shadow-sm ${
                    msg.sender === "user"
                      ? "bg-[#FFEBE0] border-[#FFCCBC] rounded-tr-none user-bubble-important"
                      : "bg-[#F3E5F5] border-[#E1BEE7] rounded-tl-none ai-bubble-important"
                  }`}
                  ref={(el) => {
                    if (el) {
                      el.style.setProperty("color", "#1a1a1a", "important");
                      if (msg.sender === "user") {
                        el.style.setProperty("background-color", "#FFEBE0", "important");
                      } else {
                        el.style.setProperty("background-color", "#F3E5F5", "important");
                      }
                    }
                  }}
                >
                  {msg.text}
                  <span
                    className="block text-[8px] mt-1 text-right font-mono uppercase"
                    style={{ color: "#888888" }}
                  >
                    {msg.createdAt}
                  </span>
                </div>
              </div>
            ))}

            {isChatLoading && (
              <div className="flex gap-2 mr-auto max-w-[85%]">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-[#FF6600] text-white text-[10px] font-bold">
                  AI
                </div>
                <div
                  className="p-3 bg-[#F3E5F5] border border-[#E1BEE7] rounded-2xl rounded-tl-none text-xs flex items-center gap-1.5 font-mono"
                  ref={(el) => {
                    if (el) {
                      el.style.setProperty("color", "#1a1a1a", "important");
                      el.style.setProperty("background-color", "#F3E5F5", "important");
                    }
                  }}
                >
                  <Loader2 className="h-3 w-3 animate-spin text-[#FF6600]" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Footer Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-[#FFF3E0] flex gap-2 shrink-0"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about departments, turnaround..."
              className="flex-1 px-3 py-2 border border-[#FFF3E0] focus:border-[#FF6B00] text-xs rounded-xl focus:outline-none shadow-inner"
              style={{
                color: "#111111",
                backgroundColor: "#FFFFFF",
              }}
              ref={(el) => {
                if (el) {
                  el.style.setProperty("color", "#111111", "important");
                }
              }}
              placeholder-style={{ color: "#888888" }}
            />
            <style>{`
              #floating-chat-popup input::placeholder {
                color: #888888 !important;
                opacity: 1 !important;
              }
            `}</style>
            <button
              type="submit"
              disabled={isChatLoading || !chatInput.trim()}
              className="p-2 bg-[#FF6600] hover:bg-[#E05300] disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
