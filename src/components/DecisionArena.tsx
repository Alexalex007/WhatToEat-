import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Timestamp } from 'firebase/firestore';
import {
  Bot,
  CheckCircle2,
  Clock,
  Compass,
  Filter,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  computeFilteredWheelPool,
  DISH_FORMAT_CATEGORIES,
  getMealPeriodLabel,
  HK_MOOD_FILTERS,
  SIX_CUISINE_CATEGORIES,
} from '../data/hkFoods';
import { AiRescueResult, BoardMember, RoomSession } from '../types';

interface DecisionArenaProps {
  roomName: string;
  members: BoardMember[];
  session: RoomSession | null;
  recentMeals7Days: string[];
  onUpdateSession: (
    patch: Partial<RoomSession> & { isSpinResult?: boolean }
  ) => Promise<void>;
  onRecordMealDecision: (foodName: string) => Promise<void>;
  onConfirmMealAndSearch: (foodName: string, searchKeyword: string) => Promise<void>;
}

const SLICE_PALETTE = [
  '#0071E3',
  '#FF3B30',
  '#34C759',
  '#FF9500',
  '#5856D6',
  '#AF52DE',
  '#00A3A3',
  '#FF2D55',
  '#0284C7',
  '#3A3A3C',
];

function formatSpinTimeHK(ts?: Timestamp): string {
  if (!ts || typeof ts.toDate !== 'function') return '剛才';
  try {
    return ts.toDate().toLocaleString('zh-HK', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '剛才';
  }
}

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

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = '#1D1D1F';
  ctx.fill();

  if (items.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#F5F5F7';
    ctx.fill();
    ctx.fillStyle = '#6E6E73';
    ctx.font = '600 14px "Plus Jakarta Sans", "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('暫無候選項目', cx, cy);
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

  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#1D1D1F';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#0071E3';
  ctx.fill();

  ctx.restore();
}

export function DecisionArena({
  roomName,
  members,
  session,
  recentMeals7Days,
  onUpdateSession,
  onRecordMealDecision,
  onConfirmMealAndSearch,
}: DecisionArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [allowRepeat7Days, setAllowRepeat7Days] = useState(false);
  const [localWinner, setLocalWinner] = useState<string>(session?.lastWinner || '');
  const [recordedNotice, setRecordedNotice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const rejectedFoods = session?.rejectedFoods || [];
  const spinCount = session?.spinCount || 0;
  const weightMode = session?.weightMode || 'weighted';

  useEffect(() => {
    setLocalWinner(session?.lastWinner || '');
  }, [session?.lastWinner]);

  const pool = useMemo(
    () =>
      computeFilteredWheelPool(
        members,
        rejectedFoods,
        recentMeals7Days,
        allowRepeat7Days
      ),
    [members, rejectedFoods, recentMeals7Days, allowRepeat7Days]
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
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    setRecordedNotice(null);
    setIsSpinning(true);

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

    let accWeightBefore = 0;
    for (let i = 0; i < chosenIdx; i++) {
      accWeightBefore += wheelSlices[i].weight;
    }
    const sliceStart = (accWeightBefore / totalWeight) * Math.PI * 2;
    const sliceSpan = (wheelSlices[chosenIdx].weight / totalWeight) * Math.PI * 2;
    const sliceTargetMid = sliceStart + sliceSpan * (0.25 + Math.random() * 0.5);

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
          isSpinResult: true,
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
      setSyncError(err instanceof Error ? err.message : '切換模式失敗');
    }
  };

  const handleConfirmOnly = async (foodName: string) => {
    setSyncError(null);
    try {
      await onRecordMealDecision(foodName);
      setRecordedNotice(`已記錄「${foodName}」，7 日內呢間房唔會再重複揀。`);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : '記錄失敗');
    }
  };

  const handleAiRescue = async () => {
    setAiError(null);
    setRecordedNotice(null);
    setAiLoading(true);

    const moodLabelMap = HK_MOOD_FILTERS.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.label;
      return acc;
    }, {});

    const cuisineLabelMap = SIX_CUISINE_CATEGORIES.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.label;
      return acc;
    }, {});

    const formatLabelMap = DISH_FORMAT_CATEGORIES.reduce<Record<string, string>>((acc, item) => {
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
            mealPeriod: getMealPeriodLabel(m.mealPeriod),
            selectedCuisines: (m.selectedCuisines || []).map((id) => cuisineLabelMap[id] || id),
            selectedFormats: (m.selectedFormats || []).map((id) => formatLabelMap[id] || id),
            favoriteFoods: m.favoriteFoods || [],
            todayFoods: m.todayFoods || [],
            moodFilters: (m.moodFilters || []).map((id) => moodLabelMap[id] || id),
            budgetMax: m.budgetMax || '$$',
            maxWalkKm: m.maxWalkKm || 2,
          })),
          rejectedFoods,
          recentMealsWithin7Days: recentMeals7Days,
          availableCandidates: pool.candidates.map((c) => c.name),
        }),
      });

      const rawText = await resp.text();
      let data: Record<string, unknown> = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          throw new Error(`伺服器回傳非 JSON 回應（HTTP ${resp.status}）`);
        }
      }

      if (!resp.ok) {
        throw new Error(
          (typeof data?.error === 'string' && data.error) ||
            `AI 分析失敗（HTTP ${resp.status}）`
        );
      }

      const result = data as unknown as AiRescueResult;
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
      setAiError(err instanceof Error ? err.message : 'AI 分析發生錯誤');
    } finally {
      setAiLoading(false);
    }
  };

  const spunAuthor = session?.lastSpunByName || session?.updatedByName || '';
  const spunTimeFormatted = formatSpinTimeHK(session?.lastSpunAt || session?.updatedAt);

  return (
    <div className="space-y-6">
      {/* Shared Group Choices Overview */}
      <section className="bg-white border border-black/[0.08] rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0071E3]" />
            <h2 className="font-semibold text-sm sm:text-base text-[#1D1D1F]">
              同房大家想食乜（即時同步至輪盤）
            </h2>
          </div>
          <span className="font-mono-tabular text-xs text-[#6E6E73]">{members.length} 人</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {members.map((m) => {
            const foods = m.todayFoods?.length ? m.todayFoods : m.favoriteFoods || [];
            return (
              <div
                key={m.uid}
                className="p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#1D1D1F] truncate">
                    {m.displayName}
                  </span>
                  <span className="text-[11px] font-medium text-[#6E6E73] shrink-0">
                    {getMealPeriodLabel(m.mealPeriod)}
                  </span>
                </div>
                <p className="text-xs text-[#6E6E73] line-clamp-2">
                  {foods.length > 0 ? foods.join('、') : '未揀菜式'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stage 1: Lucky Wheel */}
      <section className="bg-white border border-black/[0.08] rounded-[22px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-black/[0.08]">
          <h2 className="font-display text-2xl font-bold text-[#1D1D1F]">幸運大輪盤</h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative inline-flex p-1 rounded-xl bg-[#E8E8ED]/80 border border-black/[0.06] overflow-hidden">
              <button
                type="button"
                onClick={() => handleToggleWeightMode('weighted')}
                className={`apple-btn relative px-3 py-1.5 rounded-[9px] text-xs font-semibold cursor-pointer z-10 ${
                  weightMode === 'weighted' ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'
                }`}
              >
                {weightMode === 'weighted' && (
                  <motion.span
                    layoutId="wheel-weight-pill"
                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_2px_rgba(0,0,0,0.08)] -z-10"
                  />
                )}
                <span>人氣加權</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleWeightMode('equal')}
                className={`apple-btn relative px-3 py-1.5 rounded-[9px] text-xs font-semibold cursor-pointer z-10 ${
                  weightMode === 'equal' ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'
                }`}
              >
                {weightMode === 'equal' && (
                  <motion.span
                    layoutId="wheel-weight-pill"
                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_2px_rgba(0,0,0,0.08)] -z-10"
                  />
                )}
                <span>平均機率</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              aria-label={soundEnabled ? '關閉音效' : '開啟音效'}
              className="apple-btn min-h-[38px] px-3 py-1.5 rounded-xl border border-black/[0.1] bg-[#F5F5F7] text-xs font-semibold text-[#1D1D1F] inline-flex items-center gap-1.5 cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#0071E3]" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#6E6E73]" />
              )}
              <span>{soundEnabled ? '音效開' : '靜音'}</span>
            </button>
          </div>
        </div>

        {/* Conflict & 7-Day Filter Notice */}
        {(pool.filteredOut.length > 0 || recentMeals7Days.length > 0) && (
          <div className="mt-4 p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#F59E0B]/35 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#92400E]">
                <Filter className="w-4 h-4 shrink-0" />
                <span>已避開（{pool.filteredOut.length}）</span>
              </div>
              <div className="flex items-center gap-3">
                {recentMeals7Days.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAllowRepeat7Days((prev) => !prev)}
                    className="text-xs font-semibold text-[#1D1D1F] hover:underline cursor-pointer"
                  >
                    {allowRepeat7Days ? '恢復避開 7 日內重複' : '容許重複 7 日內食過嘅菜'}
                  </button>
                )}
                {rejectedFoods.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetRejected}
                    className="text-xs font-semibold text-[#0071E3] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>重設否決</span>
                  </button>
                )}
              </div>
            </div>
            {pool.filteredOut.length > 0 && (
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
            )}
          </div>
        )}

        {syncError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm">
            {syncError}
          </div>
        )}

        {recordedNotice && (
          <div className="mt-4 p-3 rounded-xl bg-[#DCFCE7] border border-[#16A34A]/30 text-[#15803D] text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{recordedNotice}</span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
              <div
                className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-[#0071E3] drop-shadow"
                aria-hidden="true"
              />
              <canvas
                ref={canvasRef}
                className="w-full h-full rounded-full shadow-md"
                aria-label="幸運大輪盤"
              />
            </div>

            <button
              type="button"
              onClick={handleSpin}
              disabled={isSpinning || wheelSlices.length === 0}
              className="apple-btn mt-6 w-full max-w-[260px] min-h-[50px] px-6 py-3 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-base font-semibold inline-flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(0,113,227,0.3)] cursor-pointer disabled:opacity-50"
            >
              <Compass className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? '轉動中...' : '轉動輪盤'}</span>
            </button>
          </div>

          <div className="lg:col-span-6 space-y-5">
            {localWinner ? (
              <div className="p-5 rounded-[22px] bg-[#F5F5F7] border border-[#0071E3]/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#0071E3] text-white text-xs font-semibold">
                    第 {Math.max(1, spinCount)} 轉結果
                  </span>
                  {spunAuthor && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6E6E73]">
                      <Clock className="w-3.5 h-3.5 text-[#0071E3]" />
                      <span>
                        由 <strong className="text-[#1D1D1F]">{spunAuthor}</strong> 於{' '}
                        <span className="font-mono-tabular">{spunTimeFormatted}</span> 轉出
                      </span>
                    </span>
                  )}
                </div>

                <div className="font-display text-3xl font-bold text-[#1D1D1F]">
                  {localWinner}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => void onConfirmMealAndSearch(localWinner, localWinner)}
                    className="apple-btn flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>就食呢樣！搜尋餐廳</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectAndSpinAgain}
                    disabled={isSpinning}
                    className="apple-btn min-h-[46px] px-4 py-2.5 rounded-xl bg-white border border-black/[0.1] hover:bg-[#EBEBF0] text-sm font-semibold text-[#1D1D1F] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>再轉一次</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleConfirmOnly(localWinner)}
                  className="apple-btn w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-black/[0.1] hover:border-[#16A34A] text-xs font-semibold text-[#1D1D1F] cursor-pointer"
                >
                  確定食呢樣（記錄 7 日內唔重複）
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] text-sm font-semibold text-[#1D1D1F]">
                輪盤候選項目：{wheelSlices.length} 款（所有成員嘅選擇都會即時匯入）
              </div>
            )}

            {wheelSlices.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
                {wheelSlices.map((slice, idx) => (
                  <div
                    key={slice.name}
                    className="p-3 rounded-xl bg-[#F5F5F7] border border-black/[0.06] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: SLICE_PALETTE[idx % SLICE_PALETTE.length] }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#1D1D1F] truncate">
                          {slice.name}
                        </div>
                        <div className="text-[11px] text-[#6E6E73] truncate">
                          {slice.supporters.join('、')}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white border border-black/[0.08] font-mono-tabular text-xs font-semibold text-[#1D1D1F] shrink-0">
                      {slice.votes} 票
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stage 2: AI Analysis */}
      <section className="rounded-[22px] overflow-hidden border border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="p-5 sm:p-6 bg-[#1D1D1F] text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-[#0A84FF] shrink-0" />
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold">AI 分析推薦</h2>
              <p className="text-xs text-white/75">
                綜合各人用餐時段、菜系、食物類型、禁忌同近 7 日記錄拍板決定
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAiRescue}
            disabled={aiLoading || members.length === 0}
            className="apple-btn min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
          >
            {aiLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>分析中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>AI 幫手決定</span>
              </>
            )}
          </button>
        </div>

        {aiError && (
          <div className="m-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {aiError}
          </div>
        )}

        {session?.aiFinalPick && (
          <div className="p-5 sm:p-6 space-y-5 bg-white">
            <div className="p-5 rounded-2xl bg-[#F5F5F7] border border-black/[0.08] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-[#0071E3]">AI 推介</div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#1D1D1F]">
                  {session.aiFinalPick}
                </h3>
                <p className="text-sm text-[#6E6E73]">{session.aiSummaryTone}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    void onConfirmMealAndSearch(
                      session.aiFinalPick,
                      session.finalSearchKeyword || session.aiFinalPick
                    )
                  }
                  className="apple-btn min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>就食呢樣！搜尋餐廳</span>
                </button>
              </div>
            </div>

            {session.aiMemberBreakdown && session.aiMemberBreakdown.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {session.aiMemberBreakdown.map((line, i) => (
                  <div
                    key={`${i}_${line.slice(0, 10)}`}
                    className="p-3.5 rounded-xl bg-[#F5F5F7] border border-black/[0.06] text-sm text-[#1D1D1F]"
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}

            {session.aiBackupName && (
              <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#0071E3]">後備選擇</div>
                  <div className="font-semibold text-base text-[#1D1D1F]">{session.aiBackupName}</div>
                  <p className="text-xs text-[#6E6E73]">{session.aiBackupReason}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void onConfirmMealAndSearch(
                      session.aiBackupName,
                      session.aiBackupKeyword || session.aiBackupName
                    )
                  }
                  className="apple-btn min-h-[42px] px-4 py-2 rounded-xl bg-white border border-black/[0.1] hover:border-[#0071E3] text-xs font-semibold text-[#1D1D1F] inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-[#0071E3]" />
                  <span>改食後備選擇</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
