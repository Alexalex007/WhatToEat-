import React from 'react';
import { motion } from 'motion/react';
import {
  Compass,
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
  isAnonymous: boolean;
  onLogout: () => void;
  hasMapTarget: boolean;
}

const NAV_ITEMS: {
  id: AppTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'lobby', label: '房間', shortLabel: '房間', icon: Users },
  { id: 'filters', label: '揀食咩', shortLabel: '揀食咩', icon: SlidersHorizontal },
  { id: 'arena', label: '輪盤 & AI', shortLabel: '輪盤AI', icon: Compass },
  { id: 'map', label: '地圖路線', shortLabel: '地圖', icon: MapPin },
];

export function TopNav({
  activeTab,
  onChangeTab,
  roomName,
  inviteCode,
  memberCount,
  userName,
  userPhoto,
  isAnonymous,
  onLogout,
  hasMapTarget,
}: TopNavProps) {
  return (
    <>
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-black/[0.08]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Left: Brand + Room Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#0071E3] text-white flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,113,227,0.3)]">
              <Utensils className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base sm:text-lg text-[#1D1D1F] truncate">
                  今日食咩好？
                </span>
                {inviteCode && (
                  <span className="hidden sm:inline-block font-mono-tabular text-xs font-semibold text-[#6E6E73]">
                    #{inviteCode}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#6E6E73] truncate">
                {roomName || '今日飯局'} · {memberCount} 人
              </p>
            </div>
          </div>

          {/* Center: Desktop Segmented Nav with Smooth Sliding Indicator */}
          <nav
            aria-label="主選單"
            className="hidden md:flex relative items-center gap-1 bg-[#E8E8ED]/80 p-1 rounded-xl border border-black/[0.06] overflow-hidden"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeTab(item.id)}
                  className={`apple-btn relative px-3.5 py-2 rounded-[9px] text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 z-10 ${
                    isActive
                      ? 'text-[#0071E3]'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="top-nav-pill"
                      transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                      className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] -z-10"
                    />
                  )}
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.id === 'map' && hasMapTarget && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: User & Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-black/[0.1]"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#1D1D1F] text-white text-xs font-bold flex items-center justify-center">
                  {userName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-[#1D1D1F] max-w-[100px] truncate">
                {userName}
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="apple-btn min-h-[38px] px-3 py-1.5 rounded-xl border border-black/[0.1] bg-white hover:bg-[#F5F5F7] text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isAnonymous ? '離開' : '登出'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="手機導覽"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-black/[0.08] px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5"
      >
        <div className="grid grid-cols-4 gap-1 relative overflow-hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`apple-btn relative min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer z-10 ${
                  isActive ? 'text-[#0071E3]' : 'text-[#6E6E73]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-pill"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    className="absolute inset-0 bg-[#0071E3]/[0.09] rounded-xl -z-10"
                  />
                )}
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.id === 'map' && hasMapTarget && !isActive && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#34C759]" />
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
