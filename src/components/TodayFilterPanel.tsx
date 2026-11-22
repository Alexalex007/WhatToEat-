import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Coins,
  Footprints,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { HK_MOOD_FILTERS } from '../data/hkFoods';
import { PRICE_TIERS, PriceTier } from '../types';
import { ThreeTierFoodSelector } from './ThreeTierFoodSelector';

interface TodayFilterPanelProps {
  initialTodayFoods: string[];
  initialFavoriteFoods: string[];
  initialMoodFilters: string[];
  initialBudgetMax: PriceTier;
  initialMaxWalkKm: number;
  initialStatus: 'picking' | 'ready';
  onSubmitPreferences: (payload: {
    favoriteFoods?: string[];
    todayFoods: string[];
    moodFilters: string[];
    budgetMax: PriceTier;
    maxWalkKm: number;
    status: 'picking' | 'ready';
  }) => Promise<void>;
  onGoToArena: () => void;
}

const BUDGET_DESCRIPTIONS: Record<PriceTier, string> = {
  $: 'HK$60 以下（快餐 / 茶記）',
  $$: 'HK$61–$150（日常聚餐）',
  $$$: 'HK$151–$350（燒肉 / 邊爐）',
  $$$$: 'HK$350 以上（慶祝大餐）',
};

export function TodayFilterPanel({
  initialTodayFoods,
  initialFavoriteFoods,
  initialMoodFilters,
  initialBudgetMax,
  initialMaxWalkKm,
  initialStatus,
  onSubmitPreferences,
  onGoToArena,
}: TodayFilterPanelProps) {
  const [todayFoods, setTodayFoods] = useState<string[]>(
    initialTodayFoods.length > 0 ? initialTodayFoods : initialFavoriteFoods
  );
  const [addedCustomFoods, setAddedCustomFoods] = useState<string[]>([]);
  const [moodFilters, setMoodFilters] = useState<string[]>(initialMoodFilters);
  const [budgetMax, setBudgetMax] = useState<PriceTier>(initialBudgetMax || '$$');
  const [maxWalkKm, setMaxWalkKm] = useState<number>(initialMaxWalkKm || 2);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setTodayFoods(initialTodayFoods.length > 0 ? initialTodayFoods : initialFavoriteFoods);
    setMoodFilters(initialMoodFilters);
    setBudgetMax(initialBudgetMax || '$$');
    setMaxWalkKm(initialMaxWalkKm || 2);
  }, [initialTodayFoods, initialFavoriteFoods, initialMoodFilters, initialBudgetMax, initialMaxWalkKm]);

  const toggleMood = (id: string) => {
    setSavedNotice(null);
    setMoodFilters((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddCustomToBaseline = (customFood: string) => {
    setAddedCustomFoods((prev) => (prev.includes(customFood) ? prev : [...prev, customFood]));
  };

  const handleSave = async (status: 'picking' | 'ready', goArenaAfter = false) => {
    setErrorMsg(null);
    setSavedNotice(null);

    if (status === 'ready' && todayFoods.length === 0) {
      setErrorMsg('請最少揀 1 款「今日想食」嘅美食，再提交俾大家轉輪盤！');
      return;
    }

    setSaving(true);
    try {
      const mergedFavorites =
        addedCustomFoods.length > 0
          ? Array.from(new Set([...initialFavoriteFoods, ...addedCustomFoods]))
          : undefined;

      await onSubmitPreferences({
        favoriteFoods: mergedFavorites,
        todayFoods,
        moodFilters,
        budgetMax,
        maxWalkKm,
        status,
      });

      setAddedCustomFoods([]);
      setSavedNotice(
        status === 'ready'
          ? '已提交你嘅今日美食同狀態篩選！所有成員會即時見到。'
          : '已暫存你嘅選擇（狀態：揀緊食咩...）'
      );

      if (goArenaAfter) {
        onGoToArena();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '儲存失敗，請再試一次。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Today's Foods (auto-preselected from personal favorites) */}
      <section className="bg-white border border-[#E7E2DA] rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E7E2DA]">
          <div>
            <span className="text-xs font-bold text-[#E85D3F]">步驟 1 · 揀今日想食</span>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1C1917]">
              今日有咩啱食？
            </h2>
          </div>
          <span
            className={`px-3 py-1 rounded-lg text-xs font-bold ${
              initialStatus === 'ready'
                ? 'bg-[#DCFCE7] text-[#15803D]'
                : 'bg-[#FEF3C7] text-[#B45309]'
            }`}
          >
            目前狀態：{initialStatus === 'ready' ? '已提交' : '揀緊食咩...'}
          </span>
        </div>

        <ThreeTierFoodSelector
          selectedFoods={todayFoods}
          onChange={(next) => {
            setSavedNotice(null);
            setTodayFoods(next);
          }}
          onAddCustomFood={handleAddCustomToBaseline}
          title="三層式快速點選（已自動帶入你嘅平時最愛）"
          subtitle="可自由增減今餐想食嘅項目；自訂加入嘅冷門美食亦會自動幫你儲低落個人最愛清單。"
        />
      </section>

      {/* Section 2: 10 HK Mood Filters */}
      <section className="bg-white border border-[#E7E2DA] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-start gap-2.5">
          <SlidersHorizontal className="w-5 h-5 text-[#E85D3F] shrink-0 mt-1" />
          <div>
            <span className="text-xs font-bold text-[#E85D3F]">步驟 2 · 今日飲食狀態篩選與禁忌</span>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1C1917]">
              今日特別要求（支援多選）
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6560] mt-0.5">
              幸運輪盤會自動剔除同大家禁忌衝突嘅食物，AI 救場亦會逐個拆解你嘅要求。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {HK_MOOD_FILTERS.map((mood) => {
            const active = moodFilters.includes(mood.id);
            return (
              <button
                key={mood.id}
                type="button"
                onClick={() => toggleMood(mood.id)}
                className={`min-h-[56px] p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  active
                    ? 'bg-[#FFF5F2] border-[#E85D3F] shadow-xs'
                    : 'bg-[#FAF8F5] border-[#E7E2DA] hover:bg-white'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    active
                      ? 'bg-[#E85D3F] border-[#E85D3F] text-white'
                      : 'bg-white border-[#D6CFC5]'
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#1C1917]">{mood.label}</div>
                  <div className="text-xs text-[#6B6560] mt-0.5">{mood.hint}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 3: Budget & Walking Distance Sliders */}
      <section className="bg-white border border-[#E7E2DA] rounded-3xl p-5 sm:p-7 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#F59E0B]" />
            <h3 className="font-bold text-base text-[#1C1917]">每人預算上限</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PRICE_TIERS.map((tier) => {
              const active = budgetMax === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    setSavedNotice(null);
                    setBudgetMax(tier);
                  }}
                  className={`min-h-[46px] rounded-xl border font-mono-tabular text-sm font-bold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#1C1917] border-[#1C1917] text-white'
                      : 'bg-[#FAF8F5] border-[#E7E2DA] text-[#1C1917] hover:border-[#1C1917]/40'
                  }`}
                >
                  {tier}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[#6B6560]">{BUDGET_DESCRIPTIONS[budgetMax]}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Footprints className="w-5 h-5 text-[#E85D3F]" />
              <h3 className="font-bold text-base text-[#1C1917]">最多願意行幾遠？</h3>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA] font-mono-tabular text-sm font-bold text-[#E85D3F]">
              {maxWalkKm} 公里內
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.5}
            value={maxWalkKm}
            onChange={(e) => {
              setSavedNotice(null);
              setMaxWalkKm(parseFloat(e.target.value));
            }}
            className="w-full accent-[#E85D3F] cursor-pointer h-2"
          />
          <div className="flex justify-between text-xs text-[#6B6560] font-mono-tabular">
            <span>1.0 km（約 12 分鐘）</span>
            <span>2.0 km（約 25 分鐘）</span>
            <span>3.0 km</span>
          </div>
        </div>
      </section>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
          {errorMsg}
        </div>
      )}

      {savedNotice && (
        <div className="p-3.5 rounded-2xl bg-[#DCFCE7] border border-[#16A34A]/30 text-[#15803D] text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Submit Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => handleSave('picking', false)}
          disabled={saving}
          className="min-h-[48px] px-5 py-3 rounded-xl border border-[#E7E2DA] bg-white hover:bg-[#FAF8F5] text-sm font-semibold text-[#1C1917] cursor-pointer disabled:opacity-60"
        >
          先暫存（揀緊食咩...）
        </button>
        <button
          type="button"
          onClick={() => handleSave('ready', true)}
          disabled={saving}
          className="min-h-[48px] px-6 py-3 rounded-xl bg-[#E85D3F] hover:bg-[#D44A2C] text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>提交今日選擇並去轉輪盤</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
