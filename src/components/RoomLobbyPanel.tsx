import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  FlaskConical,
  Heart,
  Link2,
  Loader2,
  Plus,
  Send,
  Share2,
  UserPlus,
  Users,
} from 'lucide-react';
import { HK_MOOD_FILTERS } from '../data/hkFoods';
import { Board, BoardMember, DemoFriendProfile } from '../types';
import { ThreeTierFoodSelector } from './ThreeTierFoodSelector';

interface RoomLobbyPanelProps {
  currentUserUid: string;
  activeBoard: Board | null;
  memberships: BoardMember[];
  members: (BoardMember | DemoFriendProfile)[];
  personalFavorites: string[];
  demoMode: boolean;
  onSelectRoom: (boardId: string) => void;
  onCreateRoom: (name: string, desc: string) => Promise<void>;
  onJoinRoom: (code: string) => Promise<void>;
  onSavePersonalFavorites: (favs: string[]) => Promise<void>;
  onGoToFilters: () => void;
  onGoToArena: () => void;
}

export function RoomLobbyPanel({
  currentUserUid,
  activeBoard,
  memberships,
  members,
  personalFavorites,
  demoMode,
  onSelectRoom,
  onCreateRoom,
  onJoinRoom,
  onSavePersonalFavorites,
  onGoToFilters,
  onGoToArena,
}: RoomLobbyPanelProps) {
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFavoritesEditor, setShowFavoritesEditor] = useState(false);
  const [draftFavorites, setDraftFavorites] = useState<string[]>(personalFavorites);
  const [savingFavs, setSavingFavs] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  const inviteCode = activeBoard?.inviteCode || (demoMode ? '882618' : '');
  const roomName = activeBoard?.name || (demoMode ? '週末銅鑼灣聚餐 (Demo)' : '今日飯局');

  const shareUrl =
    typeof window !== 'undefined' && inviteCode
      ? `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(inviteCode)}`
      : '';

  const shareMessage = `喂！今晚食咩好？快啲入嚟《今日食咩好？》嘅「${roomName}」一齊揀食咩啦！房間號碼：${inviteCode} 👉 ${shareUrl}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`快啲入「${roomName}」一齊揀食咩！房間號碼：${inviteCode}`)}`;

  const moodLabelById = HK_MOOD_FILTERS.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.label;
    return acc;
  }, {});

  const handleCopy = async (text: string, type: 'code' | 'link') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      setActionError('瀏覽器未能自動複製，請手動選取複製。');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!newRoomName.trim()) {
      setActionError('請輸入新飯局名稱，例如「星期五放工聚餐」。');
      return;
    }
    setCreating(true);
    try {
      await onCreateRoom(newRoomName.trim(), newRoomDesc.trim());
      setNewRoomName('');
      setNewRoomDesc('');
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
      setActionError('請輸入 6 位數字房間號碼。');
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
      setActionError(err instanceof Error ? err.message : '儲存最愛美食失敗');
    } finally {
      setSavingFavs(false);
    }
  };

  const readyCount = members.filter((m) => m.status === 'ready').length;

  return (
    <div className="space-y-6">
      {/* Top Room Hero & Share Card */}
      <section className="bg-white border border-[#E7E2DA] rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#E85D3F]/10 text-[#E85D3F] text-xs font-bold">
                即時飯局大廳
              </span>
              {demoMode && (
                <span className="px-2.5 py-1 rounded-lg bg-[#FEF3C7] text-[#92400E] text-xs font-semibold inline-flex items-center gap-1">
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>已加入 4 位測試朋友</span>
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1C1917]">
              {roomName}
            </h1>
            {activeBoard?.description && (
              <p className="text-sm text-[#6B6560]">{activeBoard.description}</p>
            )}

            {/* Switch Room Pills */}
            {memberships.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs font-semibold text-[#6B6560] mr-1">切換飯局：</span>
                {memberships.map((m) => {
                  const isCurrent = m.boardId === activeBoard?.id;
                  return (
                    <button
                      key={m.boardId}
                      type="button"
                      onClick={() => onSelectRoom(m.boardId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#1C1917] border-[#1C1917] text-white'
                          : 'bg-[#FAF8F5] border-[#E7E2DA] text-[#6B6560] hover:text-[#1C1917]'
                      }`}
                    >
                      {m.boardName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Invite & Share Box */}
          {inviteCode && (
            <div className="bg-[#FAF8F5] border border-[#E7E2DA] rounded-2xl p-4 sm:p-5 lg:w-[360px] shrink-0 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#6B6560]">6 位數字房間號碼</div>
                  <div className="font-mono-tabular text-2xl font-bold tracking-wider text-[#1C1917]">
                    {inviteCode}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(inviteCode, 'code')}
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-[#E7E2DA] hover:border-[#E85D3F] text-xs font-semibold text-[#1C1917] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedType === 'code' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>已複製</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>複製代碼</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(shareUrl, 'link')}
                  className="min-h-[42px] px-2.5 py-2 rounded-xl bg-white border border-[#E7E2DA] hover:bg-[#F5F1EA] text-xs font-semibold text-[#1C1917] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                  className="min-h-[42px] px-2.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={telegramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[42px] px-2.5 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Telegram</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Quick CTA Row */}
        <div className="mt-6 pt-5 border-t border-[#E7E2DA] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onGoToFilters}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#E85D3F] hover:bg-[#D44A2C] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>設定我今日想食咩 & 禁忌</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onGoToArena}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>直接去轉輪盤 / AI 救場</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setDraftFavorites(personalFavorites);
              setShowFavoritesEditor((prev) => !prev);
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] hover:bg-[#F3EFE8] text-xs sm:text-sm font-semibold text-[#1C1917] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Heart className="w-4 h-4 text-[#E85D3F]" />
            <span>編輯平時最愛美食 ({personalFavorites.length})</span>
          </button>
        </div>
      </section>

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
          {actionError}
        </div>
      )}

      {/* Personal Baseline Favorites Drawer/Panel */}
      {showFavoritesEditor && (
        <section className="bg-white border-2 border-[#E85D3F]/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          <ThreeTierFoodSelector
            selectedFoods={draftFavorites}
            onChange={setDraftFavorites}
            title="我嘅「平時最愛美食清單」（個人檔案）"
            subtitle="每次進入新飯局，系統會自動幫你預先勾選呢份清單，唔使次次重新揀。"
          />
          <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-[#E7E2DA]">
            <button
              type="button"
              onClick={() => setShowFavoritesEditor(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E7E2DA] text-sm font-semibold text-[#6B6560] hover:text-[#1C1917] cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveFavs}
              disabled={savingFavs}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#E85D3F] hover:bg-[#D44A2C] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {savingFavs && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>儲存個人最愛清單</span>
            </button>
          </div>
        </section>
      )}

      {/* Create / Join Room Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Join by 6-digit code */}
        <div className="bg-white border border-[#E7E2DA] rounded-3xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#E85D3F]" />
            <h2 className="font-bold text-base text-[#1C1917]">輸入房間號碼加入朋友飯局</h2>
          </div>
          <form onSubmit={handleJoinSubmit} className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="輸入 6 位房間號碼（例：882618）"
              maxLength={12}
              className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#E85D3F] font-mono-tabular text-sm"
            />
            <button
              type="submit"
              disabled={joining}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>入房</span>}
            </button>
          </form>
        </div>

        {/* Create new room */}
        <div className="bg-white border border-[#E7E2DA] rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#E85D3F]" />
              <h2 className="font-bold text-base text-[#1C1917]">開新飯局房間</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="text-xs font-semibold text-[#E85D3F] hover:underline cursor-pointer"
            >
              {showCreateForm ? '收起' : '建立新飯局'}
            </button>
          </div>

          {!showCreateForm ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-[#6B6560]">
                自動生成 6 位數字房間號碼同邀請連結，隨時約另一班朋友食飯。
              </p>
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E85D3F] text-[#E85D3F] hover:bg-[#E85D3F]/5 text-sm font-semibold shrink-0 cursor-pointer"
              >
                建立新飯局
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-2.5">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="飯局名稱（例：星期五放工 Happy Friday）"
                maxLength={60}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#E85D3F] text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="備註（可留空，例：銅鑼灣附近食）"
                  maxLength={120}
                  className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#E85D3F] text-sm"
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#E85D3F] hover:bg-[#D44A2C] text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>確認建立</span>}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Live Lobby Members Grid */}
      <section className="bg-white border border-[#E7E2DA] rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#E85D3F]" />
            <h2 className="font-bold text-lg text-[#1C1917]">
              房間成員即時狀態（{readyCount}/{members.length} 已提交）
            </h2>
          </div>
          <span className="text-xs text-[#6B6560]">朋友更改選擇後會即時同步顯示</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {members.map((member) => {
            const isMe = member.uid === currentUserUid;
            const isReady = member.status === 'ready';
            const foods = member.todayFoods?.length ? member.todayFoods : member.favoriteFoods || [];
            const moods = member.moodFilters || [];

            return (
              <div
                key={member.uid}
                className={`p-4 rounded-2xl border transition-colors ${
                  isMe
                    ? 'bg-[#FFFBF8] border-[#E85D3F]/40'
                    : 'bg-[#FAF8F5] border-[#E7E2DA]'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {member.photoURL ? (
                      <img
                        src={member.photoURL}
                        alt={member.displayName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-[#E7E2DA] shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#1C1917] text-white text-sm font-bold flex items-center justify-center shrink-0">
                        {member.displayName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-[#1C1917] truncate">
                          {member.displayName}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.5 rounded bg-[#E85D3F]/10 text-[#E85D3F] text-[10px] font-bold">
                            你
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6B6560]">
                        預算 {member.budgetMax || '$$'} · 步行 {member.maxWalkKm || 2}km 內
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
                      isReady
                        ? 'bg-[#DCFCE7] text-[#15803D]'
                        : 'bg-[#FEF3C7] text-[#B45309]'
                    }`}
                  >
                    {isReady ? '已提交' : '揀緊食咩...'}
                  </span>
                </div>

                {/* Member mood filters */}
                {moods.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {moods.map((mid) => (
                      <span
                        key={mid}
                        className="px-2 py-0.5 rounded-md bg-white border border-[#E7E2DA] text-[11px] font-semibold text-[#1C1917]"
                      >
                        {moodLabelById[mid] || mid}
                      </span>
                    ))}
                  </div>
                )}

                {/* Member today foods */}
                <div className="text-xs text-[#6B6560]">
                  <span className="font-semibold text-[#1C1917]">今日想食：</span>
                  {foods.length > 0 ? foods.join('、') : '未有勾選，等你撳幾款美食'}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
