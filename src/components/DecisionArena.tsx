import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Compass,
  Filter,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { computeFilteredWheelPool, HK_MOOD_FILTERS } from '../data/hkFoods';
import { AiRescueResult, BoardMember, DemoFriendProfile, RoomSession } from '../types';

interface DecisionArenaProps {
  roomName: string;
  members: (BoardMember | DemoFriendProfile)[];
  session: RoomSession | null;
  onUpdateSession: (patch: Partial<RoomSession>) => Promise<void>;
  onSearchRestaurants: (keyword: string) => void;
}

const SLICE_PALETTE = [
  '#E85D3F',
  '#F59E0B',
  '#2F855A',
  '#0284C7',
  '#D97706',
  '#7C3AED',
  '#DB2777',
  '#0D9488',
  '#4F46E5',
  '#EA580C',
];

function drawWheelCanvas(
  canvas: HTMLCanvasElement,
  items: { name: string; weight: number }[],
  rotationRad: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const displaySize = canvas.clientWidth || 320;
  if (canvas.width !== displaySize * dpr || canvas.height !== displaySize * dpr) {
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
  }

  ctx.save();
  ctx.scale(dpr, dpr);
  const cx = displaySize / 2;
  const cy = displaySize / 2;
  const radius = Math.max(40, cx - 12);

  ctx.clearRect(0, 0, displaySize, displaySize);

  // Outer rim
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = '#1C1917';
  ctx.fill();

  if (items.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FAF8F5';
    ctx.fill();
    ctx.fillStyle = '#6B6560';
    ctx.font = '600 14px "Plus Jakarta Sans", "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('暫無候選美食', cx, cy);
    ctx.restore();
    return;
  }

  const totalWeight = items.reduce((acc, item) => acc + item.weight, 0);
  let startAngle = rotationRad - Math.PI / 2;

  items.forEach((item, idx) => {
    const sliceAngle = (item.weight / totalWeight) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = SLICE_PALETTE[idx % SLICE_PALETTE.length];
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Draw label radially
    ctx.save();
    const midAngle = startAngle + sliceAngle / 2;
    ctx.translate(cx, cy);
    ctx.rotate(midAngle);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    const fontSize = items.length > 10 ? 11 : items.length > 6 ? 12.5 : 14;
    ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", "Noto Sans TC", sans-serif`;
    const label = item.name.length > 9 ? `${item.name.slice(0, 8)}…` : item.name;
    ctx.fillText(label, radius - 16, 0);
    ctx.restore();

    startAngle = endAngle;
  });

  // Center hub
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#1C1917';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#E85D3F';
  ctx.fill();

  ctx.restore();
}

export function DecisionArena({
  roomName,
  members,
  session,
  onUpdateSession,
  onSearchRestaurants,
}: DecisionArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [localWinner, setLocalWinner] = useState<string>(session?.lastWinner || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const rejectedFoods = session?.rejectedFoods || [];
  const spinCount = session?.spinCount || 0;
  const weightMode = session?.weightMode || 'weighted';

  useEffect(() => {
    if (session?.lastWinner) {
      setLocalWinner(session.lastWinner);
    }
  }, [session?.lastWinner]);

  const pool = useMemo(
    () => computeFilteredWheelPool(members, rejectedFoods),
    [members, rejectedFoods]
  );

  const wheelSlices = useMemo(() => {
    return pool.candidates.map((c) => ({
      name: c.name,
      votes: c.votes,
      supporters: c.supporters,
      weight: weightMode === 'weighted' ? Math.max(1, c.votes + c.bonusScore) : 1,
    }));
  }, [pool.candidates, weightMode]);

  const playTick = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(640, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Ignore Web Audio errors when autoplay blocked
    }
  }, [soundEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawWheelCanvas(canvas, wheelSlices, rotationRef.current);
  }, [wheelSlices]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const handleSpin = () => {
    if (isSpinning || wheelSlices.length === 0) return;

    setSyncError(null);
    setIsSpinning(true);

    // Pick weighted winner first, then animate accurately to that slice
    const totalWeight = wheelSlices.reduce((acc, s) => acc + s.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosenIdx = 0;
    for (let i = 0; i < wheelSlices.length; i++) {
      rand -= wheelSlices[i].weight;
      if (rand <= 0) {
        chosenIdx = i;
        break;
      }
    }

    // Compute angular range of chosenIdx relative to rotation = 0
    let accWeightBefore = 0;
    for (let i = 0; i < chosenIdx; i++) {
      accWeightBefore += wheelSlices[i].weight;
    }
    const sliceStart = (accWeightBefore / totalWeight) * Math.PI * 2;
    const sliceSpan = (wheelSlices[chosenIdx].weight / totalWeight) * Math.PI * 2;
    const sliceTargetMid = sliceStart + sliceSpan * (0.25 + Math.random() * 0.5);

    // Pointer is at top (-PI/2), where startAngle = rotation - PI/2
    // So angle under pointer at rotation R has offset (2*PI - (R mod 2*PI)) mod 2*PI
    const desiredMod = (Math.PI * 2 - (sliceTargetMid % (Math.PI * 2))) % (Math.PI * 2);
    const currentMod = ((rotationRef.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let delta = desiredMod - currentMod;
    if (delta <= 0) delta += Math.PI * 2;

    const extraSpins = (5 + Math.floor(Math.random() * 3)) * Math.PI * 2;
    const startRotation = rotationRef.current;
    const targetRotation = startRotation + extraSpins + delta;

    const durationMs = 4200;
    const startTime = performance.now();
    let lastTickBucket = -1;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Cubic ease-out for natural physical friction
      const eased = 1 - Math.pow(1 - t, 3);
      const currentRot = startRotation + (targetRotation - startRotation) * eased;
      rotationRef.current = currentRot;

      if (canvasRef.current) {
        drawWheelCanvas(canvasRef.current, wheelSlices, currentRot);
      }

      const bucket = Math.floor((currentRot / (Math.PI * 2)) * Math.max(4, wheelSlices.length));
      if (bucket !== lastTickBucket && t < 0.96) {
        lastTickBucket = bucket;
        playTick();
      }

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        const winnerName = wheelSlices[chosenIdx].name;
        setIsSpinning(false);
        setLocalWinner(winnerName);
        void onUpdateSession({
          spinCount: spinCount + 1,
          lastWinner: winnerName,
          finalSearchKeyword: winnerName,
        }).catch((err) => {
          setSyncError(err instanceof Error ? err.message : '同步輪盤結果失敗');
        });
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  };

  const handleRejectAndSpinAgain = async () => {
    if (!localWinner || isSpinning) return;
    const nextRejected = rejectedFoods.includes(localWinner)
      ? rejectedFoods
      : [...rejectedFoods, localWinner];
    setLocalWinner('');
    try {
      await onUpdateSession({
        rejectedFoods: nextRejected,
        lastWinner: '',
      });
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : '更新否決清單失敗');
    }
  };

  const handleResetRejected = async () => {
    try {
      await onUpdateSession({
        rejectedFoods: [],
        lastWinner: '',
        spinCount: 0,
      });
      setLocalWinner('');
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : '重設失敗');
    }
  };

  const handleToggleWeightMode = async (mode: 'weighted' | 'equal') => {
    if (isSpinning || mode === weightMode) return;
    try {
      await onUpdateSession({ weightMode: mode });
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : '切換機率模式失敗');
    }
  };

  const handleAiRescue = async () => {
    setAiError(null);
    setAiLoading(true);

    const moodLabelMap = HK_MOOD_FILTERS.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.label;
      return acc;
    }, {});

    try {
      const resp = await fetch('/api/ai-rescue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          members: members.map((m) => ({
            displayName: m.displayName,
            favoriteFoods: m.favoriteFoods || [],
            todayFoods: m.todayFoods || [],
            moodFilters: (m.moodFilters || []).map((id) => moodLabelMap[id] || id),
            budgetMax: m.budgetMax || '$$',
            maxWalkKm: m.maxWalkKm || 2,
          })),
          rejectedFoods,
          availableCandidates: pool.candidates.map((c) => c.name),
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'AI 分析請求失敗，請稍後再試。');
      }

      const result = data as AiRescueResult;
      await onUpdateSession({
        aiFinalPick: result.finalPick,
        aiSummaryTone: result.summaryTone,
        aiMemberBreakdown: result.memberBreakdown,
        aiBackupName: result.backupName,
        aiBackupKeyword: result.backupKeyword,
        aiBackupReason: result.backupReason,
        finalSearchKeyword: result.searchKeyword || result.finalPick,
      });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI 終極救場發生錯誤');
    } finally {
      setAiLoading(false);
    }
  };

  const showAiNudge = spinCount >= 2 || pool.candidates.length === 0;

  return (
    <div className="space-y-6">
      {/* Stage 1: Smart Filter + Lucky Wheel */}
      <section className="bg-white border border-[#E7E2DA] rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[#E7E2DA]">
          <div>
            <span className="text-xs font-bold text-[#E85D3F]">第一階段決策 · 智能過濾 × 幸運大輪盤</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1C1917] mt-0.5">
              今日仲未決定？轉一轉先！
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6560] mt-1">
              系統已綜合 {members.length} 位成員口味，並按大家勾選嘅禁忌過濾衝突食物。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
              <button
                type="button"
                onClick={() => handleToggleWeightMode('weighted')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  weightMode === 'weighted'
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#6B6560] hover:text-[#1C1917]'
                }`}
              >
                按人氣加權
              </button>
              <button
                type="button"
                onClick={() => handleToggleWeightMode('equal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  weightMode === 'equal'
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#6B6560] hover:text-[#1C1917]'
                }`}
              >
                平均機率
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              aria-label={soundEnabled ? '關閉輪盤音效' : '開啟輪盤音效'}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] text-xs font-semibold text-[#1C1917] inline-flex items-center gap-1.5 cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#E85D3F]" /> : <VolumeX className="w-4 h-4 text-[#6B6560]" />}
              <span>{soundEnabled ? '音效開' : '靜音'}</span>
            </button>
          </div>
        </div>

        {/* Conflict Filter Notice */}
        {pool.filteredOut.length > 0 && (
          <div className="mt-5 p-4 rounded-2xl bg-[#FFFBEB] border border-[#F59E0B]/35 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#92400E]">
                <Filter className="w-4 h-4 shrink-0" />
                <span>已自動剔除 {pool.filteredOut.length} 個衝突或已否決選項：</span>
              </div>
              {rejectedFoods.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetRejected}
                  className="text-xs font-semibold text-[#E85D3F] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>重設已否決選項</span>
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pool.filteredOut.map((item) => (
                <span
                  key={`${item.name}_${item.reason}`}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#F59E0B]/30 text-xs text-[#78350F]"
                >
                  <strong className="line-through mr-1">{item.name}</strong>
                  <span className="text-[#92400E]">（{item.reason}）</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {syncError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm">
            {syncError}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Wheel Canvas Column */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="relative w-full max-w-[330px] aspect-square flex items-center justify-center">
              {/* Top Pointer Triangle */}
              <div
                className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-[#E85D3F] drop-shadow"
                aria-hidden="true"
              />
              <canvas
                ref={canvasRef}
                className="w-full h-full rounded-full shadow-lg"
                aria-label="幸運大輪盤"
              />
            </div>

            <button
              type="button"
              onClick={handleSpin}
              disabled={isSpinning || wheelSlices.length === 0}
              className="mt-6 w-full max-w-[280px] min-h-[52px] px-6 py-3.5 rounded-2xl bg-[#E85D3F] hover:bg-[#D44A2C] text-white text-base font-bold inline-flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Compass className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? '輪盤轉動中...' : '轉動輪盤'}</span>
            </button>
          </div>

          {/* Candidate Pool & Spin Winner Column */}
          <div className="lg:col-span-6 space-y-5">
            {localWinner ? (
              <div className="p-5 sm:p-6 rounded-3xl bg-[#FFF5F2] border-2 border-[#E85D3F] space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#E85D3F] text-white text-xs font-bold">
                    第 {Math.max(1, spinCount)} 轉結果
                  </span>
                  {session?.updatedByName && (
                    <span className="text-xs text-[#6B6560]">
                      由 {session.updatedByName} 轉出 · 全房同步
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-[#6B6560]">輪盤揀中咗：</div>
                  <div className="font-display text-3xl sm:text-4xl font-bold text-[#1C1917] mt-1">
                    {localWinner}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => onSearchRestaurants(localWinner)}
                    className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>就食呢樣！搜尋附近餐廳</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectAndSpinAgain}
                    disabled={isSpinning}
                    className="min-h-[48px] px-4 py-3 rounded-xl bg-white border border-[#E7E2DA] hover:bg-[#FAF8F5] text-sm font-semibold text-[#1C1917] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>唔滿意？再轉一次</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <div className="text-sm font-bold text-[#1C1917] mb-1">
                  目前可上輪盤候選項目（{wheelSlices.length} 款）
                </div>
                <p className="text-xs text-[#6B6560]">
                  {wheelSlices.length > 0
                    ? '撳左邊「轉動輪盤」，全組即時一齊抽籤！'
                    : '所有選項已被禁忌條件剔除或否決，建議直接撳下面「AI 終極分析救場」！'}
                </p>
              </div>
            )}

            {/* Candidate Chips List */}
            {wheelSlices.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#6B6560]">候選池同支持成員：</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                  {wheelSlices.map((slice, idx) => (
                    <div
                      key={slice.name}
                      className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: SLICE_PALETTE[idx % SLICE_PALETTE.length] }}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#1C1917] truncate">
                            {slice.name}
                          </div>
                          <div className="text-[11px] text-[#6B6560] truncate">
                            {slice.supporters.join('、')}
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white border border-[#E7E2DA] font-mono-tabular text-xs font-semibold text-[#1C1917] shrink-0">
                        {slice.votes} 票
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stage 2: AI Ultimate Rescue */}
      <section className="rounded-3xl overflow-hidden border border-[#E7E2DA] bg-white shadow-sm">
        <div className="p-5 sm:p-7 bg-gradient-to-r from-[#E85D3F] via-[#DB2777] to-[#7C3AED] text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 text-xs font-bold">
                <Bot className="w-4 h-4" />
                <span>第二階段決策 · Gemini AI 終極和事佬</span>
              </div>
              {showAiNudge && (
                <div className="inline-flex items-center gap-1.5 ml-0 sm:ml-2 px-2.5 py-1 rounded-lg bg-[#FEF3C7] text-[#92400E] text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {pool.candidates.length === 0
                      ? '大家口味衝突好大，輪盤無晒選項！'
                      : `輪盤轉咗 ${spinCount} 次仲未決定？`}
                  </span>
                </div>
              )}
              <h2 className="font-display text-2xl sm:text-3xl font-bold leading-snug">
                最後都係揀唔到？交俾 AI 終極分析救場！
              </h2>
              <p className="text-sm text-white/90">
                AI 會深度閱讀晒每位成員平時最愛、今日特別要求、禁忌衝突同被輪盤否決過嘅嘢，一次過拍板搵出最平衡大家嘅終極提案。
              </p>
            </div>

            <button
              type="button"
              onClick={handleAiRescue}
              disabled={aiLoading || members.length === 0}
              className="min-h-[54px] px-6 py-3.5 rounded-2xl bg-white hover:bg-[#FAF8F5] text-[#1C1917] font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.99] cursor-pointer disabled:opacity-60 shrink-0"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#E85D3F]" />
                  <span>AI 拆解口味矛盾中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-[#E85D3F]" />
                  <span>立即召喚 AI 拍板救場！</span>
                </>
              )}
            </button>
          </div>
        </div>

        {aiError && (
          <div className="m-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {aiError}
          </div>
        )}

        {/* AI Structured Result Card */}
        {session?.aiFinalPick && (
          <div className="p-5 sm:p-7 space-y-6 bg-white">
            {/* 1. Final Pick */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#E85D3F]">【AI 終極拍板推介】</div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#1C1917]">
                  {session.aiFinalPick}
                </h3>
                <p className="text-sm text-[#6B6560] leading-relaxed">{session.aiSummaryTone}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onSearchRestaurants(session.finalSearchKeyword || session.aiFinalPick)
                }
                className="min-h-[48px] px-5 py-3 rounded-xl bg-[#E85D3F] hover:bg-[#D44A2C] text-white text-sm font-bold inline-flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                <span>喺地圖搵附近「{session.aiFinalPick}」</span>
              </button>
            </div>

            {/* 2. Member-by-member breakdown */}
            {session.aiMemberBreakdown && session.aiMemberBreakdown.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[#1C1917]">
                  【點解咁揀？（逐個成員拆解）】
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {session.aiMemberBreakdown.map((line, i) => (
                    <div
                      key={`${i}_${line.slice(0, 10)}`}
                      className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-sm text-[#1C1917] leading-relaxed"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Plan B */}
            {session.aiBackupName && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#0284C7]">【後備 B 計劃】</div>
                  <div className="font-bold text-base text-[#1C1917]">{session.aiBackupName}</div>
                  <p className="text-xs sm:text-sm text-[#6B6560]">{session.aiBackupReason}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onSearchRestaurants(session.aiBackupKeyword || session.aiBackupName)
                  }
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#0284C7] text-xs sm:text-sm font-semibold text-[#1C1917] inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-[#0284C7]" />
                  <span>改搜尋 B 計劃餐廳</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
