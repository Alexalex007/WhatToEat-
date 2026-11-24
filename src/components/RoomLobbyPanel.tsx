import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowRight,
  CalendarClock,
  Check,
  Copy,
  Heart,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Share2,
  Timer,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  DISH_FORMAT_CATEGORIES,
  getMealPeriodLabel,
  HK_MOOD_FILTERS,
  SIX_CUISINE_CATEGORIES,
} from '../data/hkFoods';
import { Board, BoardMember, MealHistoryEntry } from '../types';
import { CuisineFoodSelector } from './CuisineFoodSelector';

interface RoomLobbyPanelProps {
  currentUserUid: string;
  activeBoard: Board | null;
  memberships: BoardMember[];
  members: BoardMember[];
  mealHistory7Days: MealHistoryEntry[];
  personalFavorites: string[];
  onSelectRoom: (boardId: string) => void;
  onCreateRoom: (name: string, desc: string) => Promise<void>;
  onJoinRoom: (code: string) => Promise<void>;
  onRotateInviteCode: () => Promise<void>;
  onSetQrAutoRotate: (enabled: boolean) => Promise<void>;
  onDeleteMealHistory: (historyId: string) => Promise<void>;
  onSavePersonalFavorites: (favs: string[]) => Promise<void>;
  onGoToFilters: () => void;
  onGoToArena: () => void;
}

function formatDaysAgo(entry: MealHistoryEntry): string {
  const ms = entry.decidedAt?.toMillis?.();
  if (!ms) return '剛才';
  const days = Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000));
  if (days <= 0) return '今日';
  return `${days} 日前`;
}

function formatCountdown(secondsLeft: number): string {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function RoomLobbyPanel({
  currentUserUid,
  activeBoard,
  memberships,
  members,
  mealHistory7Days,
  personalFavorites,
  onSelectRoom,
  onCreateRoom,
  onJoinRoom,
  onRotateInviteCode,
  onSetQrAutoRotate,
  onDeleteMealHistory,
  onSavePersonalFavorites,
  onGoToFilters,
  onGoToArena,
}: RoomLobbyPanelProps) {
  const [newRoomName, setNewRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [rotatingQr, setRotatingQr] = useState(false);
  const [togglingAuto, setTogglingAuto] = useState(false);
  const [countdownSec, setCountdownSec] = useState(120);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFavoritesEditor, setShowFavoritesEditor] = useState(false);
  const [draftCuisines, setDraftCuisines] = useState<string[]>([SIX_CUISINE_CATEGORIES[0].id]);
  const [draftFavorites, setDraftFavorites] = useState<string[]>(personalFavorites);
  const [savingFavs, setSavingFavs] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  const rotateLockRef = useRef(false);

  const inviteCode = activeBoard?.inviteCode || '';
  const roomName = activeBoard?.name || '今日飯局';
  const isOwner = Boolean(activeBoard && activeBoard.ownerId === currentUserUid);
  const qrAutoRotate = Boolean(activeBoard?.qrAutoRotate);

  useEffect(() => {
    setCountdownSec(120);
  }, [inviteCode, qrAutoRotate]);

  useEffect(() => {
    if (!qrAutoRotate || !activeBoard) return;

    const timer = window.setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          if (isOwner && !rotateLockRef.current) {
            rotateLockRef.current = true;
            void onRotateInviteCode()
              .catch(() => {
                // Ignore transient error
              })
              .finally(() => {
                rotateLockRef.current = false;
              });
          }
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [qrAutoRotate, activeBoard, isOwner, onRotateInviteCode]);

  const shareUrl =
    typeof window !== 'undefined' && inviteCode
      ? `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(inviteCode)}`
      : '';

  const shareMessage = `《今日食咩好？》「${roomName}」房間碼：${inviteCode} 👉 ${shareUrl}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`「${roomName}」房間碼：${inviteCode}`)}`;

  const moodLabelById = useMemo(
    () =>
      HK_MOOD_FILTERS.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.label;
        return acc;
      }, {}),
    []
  );

  const cuisineLabelById = useMemo(
    () =>
      SIX_CUISINE_CATEGORIES.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.shortLabel;
        return acc;
      }, {}),
    []
  );

  const formatLabelById = useMemo(
    () =>
      DISH_FORMAT_CATEGORIES.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.label;
        return acc;
      }, {}),
    []
  );

  const handleCopy = async (text: string, type: 'code' | 'link') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      setActionError('未能自動複製，請手動複製。');
    }
  };

  const handleManualRotate = async () => {
    if (!isOwner || rotatingQr) return;
    setActionError(null);
    setRotatingQr(true);
    try {
      await onRotateInviteCode();
      setCountdownSec(120);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '更換 QR Code 失敗');
    } finally {
      setRotatingQr(false);
    }
  };

  const handleToggleAutoRotate = async (enabled: boolean) => {
    if (!isOwner || togglingAuto || enabled === qrAutoRotate) return;
    setActionError(null);
    setTogglingAuto(true);
    try {
      await onSetQrAutoRotate(enabled);
      setCountdownSec(120);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '切換自動更換模式失敗');
    } finally {
      setTogglingAuto(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!newRoomName.trim()) {
      setActionError('請輸入飯局名稱');
      return;
    }
    setCreating(true);
    try {
      await onCreateRoom(newRoomName.trim(), '');
      setNewRoomName('');
      setShowCreateForm(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '建立飯局失敗');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!joinCode.trim()) {
      setActionError('請輸入 6 位房間碼');
      return;
    }
    setJoining(true);
    try {
      await onJoinRoom(joinCode.trim());
      setJoinCode('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '加入房間失敗');
    } finally {
      setJoining(false);
    }
  };

  const handleSaveFavs = async () => {
    setSavingFavs(true);
    setActionError(null);
    try {
      await onSavePersonalFavorites(draftFavorites);
      setShowFavoritesEditor(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSavingFavs(false);
    }
  };

  const readyCount = members.filter((m) => m.status === 'ready').length;

  return (
    <div className="space-y-6">
      {/* Room Header + QR Share */}
      <section className="bg-white border border-black/[0.08] rounded-[22px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1D1D1F]">
                {roomName}
              </h1>
            </div>

            {memberships.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-[#6E6E73] mr-1">切換房間：</span>
                {memberships.map((m) => {
                  const isCurrent = m.boardId === activeBoard?.id;
                  return (
                    <button
                      key={m.boardId}
                      type="button"
                      onClick={() => onSelectRoom(m.boardId)}
                      className={`apple-btn min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                        isCurrent
                          ? 'bg-[#1D1D1F] border-[#1D1D1F] text-white'
                          : 'bg-[#F5F5F7] border-black/[0.08] text-[#6E6E73] hover:text-[#1D1D1F]'
                      }`}
                    >
                      {m.boardName}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onGoToFilters}
                className="apple-btn min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-semibold inline-flex items-center gap-2 shadow-[0_1px_4px_rgba(0,113,227,0.28)] cursor-pointer"
              >
                <span>揀今日食咩</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onGoToArena}
                className="apple-btn min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1D1D1F] hover:bg-[#333336] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <span>輪盤 / AI 決定</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftFavorites(personalFavorites);
                  setShowFavoritesEditor((prev) => !prev);
                }}
                className="apple-btn min-h-[44px] px-4 py-2 rounded-xl border border-black/[0.1] bg-[#F5F5F7] hover:bg-[#EBEBF0] text-xs sm:text-sm font-semibold text-[#1D1D1F] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Heart className="w-4 h-4 text-[#FF3B30]" />
                <span>平時常食 ({personalFavorites.length})</span>
              </button>
            </div>
          </div>

          {/* QR Code & Share Box */}
          {inviteCode && (
            <div className="bg-[#F5F5F7] border border-black/[0.08] rounded-2xl p-4 sm:p-5 lg:w-[400px] shrink-0 space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-2xl bg-white border border-black/[0.08] shrink-0">
                  <QRCodeSVG value={shareUrl} size={120} level="M" />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <div className="text-xs font-semibold text-[#6E6E73]">房間碼</div>
                    <div className="font-mono-tabular text-2xl font-bold tracking-wider text-[#1D1D1F]">
                      {inviteCode}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(inviteCode, 'code')}
                    className="apple-btn w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-black/[0.1] hover:border-[#0071E3] text-xs font-semibold text-[#1D1D1F] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedType === 'code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>已複製代碼</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>複製代碼</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* QR Rotation Controls */}
              <div className="pt-3 border-t border-black/[0.08] space-y-2.5">
                {isOwner ? (
                  <>
                    <div className="relative grid grid-cols-2 p-1 bg-[#E8E8ED]/80 rounded-xl border border-black/[0.06] overflow-hidden">
                      <button
                        type="button"
                        disabled={togglingAuto}
                        onClick={() => handleToggleAutoRotate(false)}
                        className={`apple-btn relative min-h-[34px] py-1.5 px-2 rounded-[9px] text-xs font-semibold cursor-pointer z-10 ${
                          !qrAutoRotate ? 'text-[#1D1D1F]' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                        }`}
                      >
                        {!qrAutoRotate && (
                          <motion.span
                            layoutId="qr-mode-pill"
                            transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                            className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_2px_rgba(0,0,0,0.08)] -z-10"
                          />
                        )}
                        <span>手動更換</span>
                      </button>
                      <button
                        type="button"
                        disabled={togglingAuto}
                        onClick={() => handleToggleAutoRotate(true)}
                        className={`apple-btn relative min-h-[34px] py-1.5 px-2 rounded-[9px] text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer z-10 ${
                          qrAutoRotate ? 'text-[#0071E3]' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                        }`}
                      >
                        {qrAutoRotate && (
                          <motion.span
                            layoutId="qr-mode-pill"
                            transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                            className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_2px_rgba(0,0,0,0.08)] -z-10"
                          />
                        )}
                        <Timer className="w-3.5 h-3.5" />
                        <span>每 2 分鐘自動轉</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={handleManualRotate}
                        disabled={rotatingQr}
                        className="apple-btn flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-black/[0.1] hover:border-[#0071E3] text-xs font-semibold text-[#1D1D1F] inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${rotatingQr ? 'animate-spin' : ''}`} />
                        <span>手動更換 QR Code</span>
                      </button>
                      {qrAutoRotate && (
                        <span className="px-2.5 py-1.5 rounded-xl bg-[#FFFBEB] text-[#B45309] font-mono-tabular text-xs font-bold shrink-0">
                          {formatCountdown(countdownSec)}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between text-xs text-[#6E6E73]">
                    <span>QR Code 模式：{qrAutoRotate ? '每 2 分鐘自動更換' : '手動更換'}</span>
                    {qrAutoRotate && (
                      <span className="font-mono-tabular font-bold text-[#0071E3]">
                        {formatCountdown(countdownSec)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(shareUrl, 'link')}
                  className="apple-btn min-h-[40px] px-2.5 py-2 rounded-xl bg-white border border-black/[0.1] hover:bg-[#EBEBF0] text-xs font-semibold text-[#1D1D1F] inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  {copiedType === 'link' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>已複製</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      <span>分享連結</span>
                    </>
                  )}
                </button>

                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apple-btn min-h-[40px] px-2.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold inline-flex items-center justify-center gap-1"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={telegramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apple-btn min-h-[40px] px-2.5 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold inline-flex items-center justify-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Telegram</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
          {actionError}
        </div>
      )}

      {/* Personal Favorites Editor */}
      {showFavoritesEditor && (
        <section className="bg-white border border-[#0071E3]/40 rounded-[22px] p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg text-[#1D1D1F]">平時常食清單</h2>
            <button
              type="button"
              onClick={() => setShowFavoritesEditor(false)}
              className="text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
            >
              關閉
            </button>
          </div>
          <CuisineFoodSelector
            selectedCuisines={draftCuisines}
            onChangeCuisines={setDraftCuisines}
            selectedFoods={draftFavorites}
            onChangeFoods={setDraftFavorites}
            layoutIdPrefix="fav"
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.08]">
            <button
              type="button"
              onClick={handleSaveFavs}
              disabled={savingFavs}
              className="apple-btn min-h-[42px] px-5 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {savingFavs && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>儲存</span>
            </button>
          </div>
        </section>
      )}

      {/* 7-Day Non-Repeat Meal History */}
      {mealHistory7Days.length > 0 && (
        <section className="bg-white border border-black/[0.08] rounded-[22px] p-5 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#0071E3]" />
            <h2 className="font-semibold text-sm sm:text-base text-[#1D1D1F]">
              7 日內已食過（自動唔會重複）
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {mealHistory7Days.map((entry) => (
              <span
                key={entry.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F5F7] border border-black/[0.07] text-xs font-semibold text-[#1D1D1F]"
              >
                <span>{entry.foodName}</span>
                <span className="text-[#6E6E73] font-normal">· {formatDaysAgo(entry)}</span>
                <button
                  type="button"
                  onClick={() => void onDeleteMealHistory(entry.id)}
                  aria-label={`移除 ${entry.foodName}`}
                  className="text-[#6E6E73] hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Create / Join Room Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-black/[0.08] rounded-[22px] p-5 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#0071E3]" />
            <h2 className="font-semibold text-base text-[#1D1D1F]">加入朋友房間</h2>
          </div>
          <form onSubmit={handleJoinSubmit} className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="輸入 6 位房間碼"
              maxLength={12}
              className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-black/[0.1] bg-[#F5F5F7] focus:bg-white focus:outline-none focus:border-[#0071E3] font-mono-tabular text-sm"
            />
            <button
              type="submit"
              disabled={joining}
              className="apple-btn min-h-[44px] px-4 py-2 rounded-xl bg-[#1D1D1F] hover:bg-[#333336] text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>入房</span>}
            </button>
          </form>
        </div>

        <div className="bg-white border border-black/[0.08] rounded-[22px] p-5 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#0071E3]" />
              <h2 className="font-semibold text-base text-[#1D1D1F]">開新飯局</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="text-xs font-semibold text-[#0071E3] hover:underline cursor-pointer"
            >
              {showCreateForm ? '收起' : '建立'}
            </button>
          </div>

          {!showCreateForm ? (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="apple-btn w-full min-h-[44px] px-4 py-2 rounded-xl border border-[#0071E3] text-[#0071E3] hover:bg-[#0071E3]/[0.06] text-sm font-semibold cursor-pointer"
            >
              開新飯局房間
            </button>
          ) : (
            <form onSubmit={handleCreateSubmit} className="flex gap-2">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="飯局名稱"
                maxLength={60}
                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-black/[0.1] bg-[#F5F5F7] focus:bg-white focus:outline-none focus:border-[#0071E3] text-sm"
              />
              <button
                type="submit"
                disabled={creating}
                className="apple-btn min-h-[44px] px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>建立</span>}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Live Members Grid */}
      <section className="bg-white border border-black/[0.08] rounded-[22px] p-5 sm:p-6 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#0071E3]" />
          <h2 className="font-semibold text-lg text-[#1D1D1F]">
            成員狀態（{readyCount}/{members.length} 已提交）
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {members.map((member) => {
            const isMe = member.uid === currentUserUid;
            const isReady = member.status === 'ready';
            const foods = member.todayFoods?.length ? member.todayFoods : member.favoriteFoods || [];
            const cuisines = member.selectedCuisines || [];
            const formats = member.selectedFormats || [];
            const moods = member.moodFilters || [];

            return (
              <div
                key={member.uid}
                className={`p-4 rounded-2xl border ${
                  isMe
                    ? 'bg-[#0071E3]/[0.03] border-[#0071E3]/30'
                    : 'bg-[#F5F5F7] border-black/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {member.photoURL ? (
                      <img
                        src={member.photoURL}
                        alt={member.displayName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-black/[0.1] shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#1D1D1F] text-white text-sm font-bold flex items-center justify-center shrink-0">
                        {member.displayName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-[#1D1D1F] truncate">
                          {member.displayName}
                        </span>
                        {isMe && (
                          <span className="text-[11px] font-semibold text-[#0071E3]">
                            · 你
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6E6E73]">
                        {getMealPeriodLabel(member.mealPeriod)} · 預算 {member.budgetMax || '$$'} · 範圍{' '}
                        {member.maxWalkKm || 2}km
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 ${
                      isReady ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEF3C7] text-[#B45309]'
                    }`}
                  >
                    {isReady ? '已提交' : '揀緊食咩...'}
                  </span>
                </div>

                {cuisines.length > 0 && (
                  <div className="text-xs text-[#6E6E73] mb-1">
                    <span className="font-semibold text-[#1D1D1F]">菜系：</span>
                    {cuisines.map((cid) => cuisineLabelById[cid] || cid).join('、')}
                  </div>
                )}

                {formats.length > 0 && (
                  <div className="text-xs text-[#6E6E73] mb-1">
                    <span className="font-semibold text-[#1D1D1F]">類型：</span>
                    {formats.map((fid) => formatLabelById[fid] || fid).join('、')}
                  </div>
                )}

                {moods.length > 0 && (
                  <div className="text-xs text-[#6E6E73] mb-1">
                    <span className="font-semibold text-[#1D1D1F]">要求：</span>
                    {moods.map((mid) => moodLabelById[mid] || mid).join('、')}
                  </div>
                )}

                <div className="text-xs text-[#6E6E73]">
                  <span className="font-semibold text-[#1D1D1F]">想食：</span>
                  {foods.length > 0 ? foods.join('、') : '未揀'}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
