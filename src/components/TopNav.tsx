import React from 'react';
import {
  Compass,
  FlaskConical,
  LogOut,
  MapPin,
  SlidersHorizontal,
  Users,
  Utensils,
} from 'lucide-react';

export type AppTabId = 'lobby' | 'filters' | 'arena' | 'map';

interface TopNavProps {
  activeTab: AppTabId;
  onChangeTab: (tab: AppTabId) => void;
  roomName: string;
  inviteCode: string;
  memberCount: number;
  userName: string;
  userPhoto: string;
  demoMode: boolean;
  onToggleDemoMode: () => void;
  onLogout: () => void;
  hasMapTarget: boolean;
}

const NAV_ITEMS: { id: AppTabId; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'lobby', label: '房間大廳', shortLabel: '大廳', icon: Users },
  { id: 'filters', label: '今日篩選', shortLabel: '揀食咩', icon: SlidersHorizontal },
  { id: 'arena', label: '輪盤 & AI 救場', shortLabel: '輪盤AI', icon: Compass },
  { id: 'map', label: '附近餐廳路線', shortLabel: '地圖路線', icon: MapPin },
];

export function TopNav({
  activeTab,
  onChangeTab,
  roomName,
  inviteCode,
  memberCount,
  userName,
  userPhoto,
  demoMode,
  onToggleDemoMode,
  onLogout,
  hasMapTarget,
}: TopNavProps) {
  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E7E2DA]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Brand + Room summary */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#E85D3F] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Utensils className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base sm:text-lg text-[#1C1917] truncate">
                  今日食咩好？
                </span>
                {inviteCode && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E7E2DA] font-mono-tabular text-xs font-semibold text-[#6B6560]">
                    #{inviteCode}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#6B6560] truncate">
                {roomName || '今日飯局'} · {memberCount} 位成員
              </p>
            </div>
          </div>

          {/* Desktop Center Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E7E2DA]">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeTab(item.id)}
                  className={`relative px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-[#E85D3F] shadow-xs'
                      : 'text-[#6B6560] hover:text-[#1C1917]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.id === 'map' && hasMapTarget && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right controls: Demo Mode toggle + User / Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleDemoMode}
              title="開關模擬多人測試模式（自動加入 4 位口味唔同嘅虛擬朋友）"
              className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                demoMode
                  ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]'
                  : 'bg-[#FAF8F5] border-[#E7E2DA] text-[#6B6560] hover:text-[#1C1917]'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Demo 測試模式</span>
              <span className="sm:hidden">Demo</span>
              <span className="font-mono-tabular">{demoMode ? 'ON' : 'OFF'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#E7E2DA]">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-[#E7E2DA]"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#1C1917] text-white text-xs font-bold flex items-center justify-center">
                  {userName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-[#1C1917] max-w-[90px] truncate">
                {userName}
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#E7E2DA] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#6B6560] hover:text-[#1C1917] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">登出</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="主要導覽"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E7E2DA] px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5"
      >
        <div className="grid grid-cols-4 gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#E85D3F]/10 text-[#E85D3F]'
                    : 'text-[#6B6560] hover:text-[#1C1917]'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.id === 'map' && hasMapTarget && !isActive && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#16A34A]" />
                  )}
                </div>
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
