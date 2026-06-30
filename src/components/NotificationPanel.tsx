import React from "react";
import { Bell, ShieldAlert, Award, CheckCircle2, MapPin, ChevronRight, Megaphone, Trophy } from "lucide-react";

export interface SimulatedNotification {
  id: string;
  type: "alert" | "badge" | "status_change" | "new_vote" | "points_earned" | "badge_unlocked" | "announcement" | string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  linkTo?: string;
  issueId?: string;
}

interface NotificationPanelProps {
  notifications: SimulatedNotification[];
  onMarkAllAsRead: () => void;
  onItemClick: (id: string) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

export default function NotificationPanel({ 
  notifications, 
  onMarkAllAsRead, 
  onItemClick, 
  onClose,
  isDarkMode 
}: NotificationPanelProps) {
  
  // Custom styles as per the user's explicit FIX 1 instructions
  const containerStyle: React.CSSProperties = {
    background: isDarkMode ? '#1a1a2e' : '#ffffff',
    backdropFilter: 'none',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    position: 'absolute',
    top: '60px',
    right: '0',
    zIndex: 9999,
    width: '380px',
    maxHeight: '480px',
    overflowY: 'auto',
    padding: '20px',
    color: isDarkMode ? '#f0f0f0' : '#111111',
  };

  const textStyle: React.CSSProperties = {
    color: isDarkMode ? '#f0f0f0' : '#111111',
    opacity: 1, // Fully opaque
  };

  const subTextStyle: React.CSSProperties = {
    color: isDarkMode ? '#cccccc' : '#444444',
    opacity: 1, // Fully opaque
  };

  return (
    <div style={containerStyle} className="animate-fadeIn">
      {/* Header */}
      <div 
        className="flex justify-between items-center pb-3 border-b mb-3"
        style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
      >
        <div className="flex items-center gap-2">
          <Bell className="h-4.5 w-4.5 text-orange-400" />
          <h4 className="text-xs font-extrabold uppercase tracking-wider" style={textStyle}>
            Civic Broadcasts
          </h4>
        </div>
        <div className="flex items-center gap-3">
          {notifications.some((n) => !n.read) && (
            <button
              onClick={onMarkAllAsRead}
              className="text-[10px] text-orange-400 hover:text-orange-300 font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Clear All
            </button>
          )}
          <button 
            onClick={onClose} 
            className="text-sm font-bold opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
            style={textStyle}
          >
            ✕
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-8 w-8 text-slate-500 mx-auto mb-2 opacity-60" />
            <p className="text-xs" style={subTextStyle}>No new broadcasts near your location.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => onItemClick(notif.id)}
              className="p-3 rounded-xl border flex gap-3 hover:bg-slate-500/10 cursor-pointer transition-all group items-center"
              style={{
                borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                backgroundColor: !notif.read 
                  ? "rgba(249, 115, 22, 0.05)" 
                  : "transparent"
              }}
            >
              {/* Icon map */}
              <div className="shrink-0">
                {notif.type === "alert" && (
                  <div className="p-1.5 bg-red-500/10 rounded-lg text-red-400 border border-red-500/20">
                    <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
                  </div>
                )}
                {(notif.type === "badge" || notif.type === "badge_unlocked") && (
                  <div className="p-1.5 bg-yellow-500/10 rounded-lg text-yellow-400 border border-yellow-500/20">
                    <Award className="h-3.5 w-3.5" />
                  </div>
                )}
                {(notif.type === "status_change" || notif.type === "new_vote") && (
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                )}
                {notif.type === "points_earned" && (
                  <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                    <Trophy className="h-3.5 w-3.5" />
                  </div>
                )}
                {notif.type === "announcement" && (
                  <div className="p-1.5 bg-[#FF6B00]/10 rounded-lg text-[#FF6B00] border border-[#FF6B00]/20">
                    <Megaphone className="h-3.5 w-3.5" />
                  </div>
                )}
                {!["alert", "badge", "badge_unlocked", "status_change", "new_vote", "points_earned", "announcement"].includes(notif.type) && (
                  <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                    <Bell className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>

              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h5 className="text-xs font-bold leading-tight break-words" style={textStyle}>
                    {notif.title}
                  </h5>
                  <span className="text-[8px] font-mono tracking-wider uppercase shrink-0" style={subTextStyle}>
                    {notif.time}
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed break-words" style={subTextStyle}>
                  {notif.message}
                </p>
                {notif.type === "alert" && (
                  <span className="inline-flex items-center gap-1 text-[8px] font-semibold text-orange-400 uppercase mt-1">
                    <MapPin className="h-2.5 w-2.5" /> Geo-alert dispatched
                  </span>
                )}
              </div>

              {/* Action Arrow icon */}
              <div className="shrink-0 flex items-center justify-center text-slate-500 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all">
                <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div 
        className="mt-4 pt-3 border-t text-[9px] font-mono tracking-wide uppercase text-center"
        style={{ 
          borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          color: isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)"
        }}
      >
        BROADCASTING FROM DELHI MUNICIPAL CENTER
      </div>
    </div>
  );
}
