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
import { getDefaultMealPeriod, HK_MOOD_FILTERS } from '../data/hkFoods';
import { MealPeriod, PRICE_TIERS, PriceTier } from '../types';
import { CuisineFoodSelector } from './CuisineFoodSelector';
import { DishFormatSelector } from './DishFormatSelector';

interface TodayFilterPanelProps {
  initialMealPeriod?: MealPeriod;
  initialSelectedCuisines: string[];
  initialSelectedFormats?: string[];
  initialTodayFoods: string[];
  initialFavoriteFoods: string[];
  initialMoodFilters: string[];
  initialBudgetMax: PriceTier;
  initialMaxWalkKm: number;
  initialStatus: 'picking' | 'ready';
  recentMeals7Days: string[];
  onSubmitPreferences: (payload: {
    mealPeriod: MealPeriod;
    selectedCuisines: string[];
    selectedFormats: string[];
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
  $: 'HK$60 以下',
  $$: 'HK$61–$150',
  $$$: 'HK$151–$350',
  $$$$: 'HK$350 以上',
};

export function TodayFilterPanel({
  initialMealPeriod,
  initialSelectedCuisines,
  initialSelectedFormats = [],
  initialTodayFoods,
  initialFavoriteFoods,
  initialMoodFilters,
  initialBudgetMax,
  initialMaxWalkKm,
  initialStatus,
  recentMeals7Days,
  onSubmitPreferences,
  onGoToArena,
}: TodayFilterPanelProps) {
  const [mealPeriod, setMealPeriod] = useState<MealPeriod>(
    initialMealPeriod || getDefaultMealPeriod()
  );
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(initialSelectedCuisines);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(initialSelectedFormats);
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
    setMealPeriod(initialMealPeriod || getDefaultMealPeriod());
    setSelectedCuisines(initialSelectedCuisines);
    setSelectedFormats(initialSelectedFormats);
    setTodayFoods(initialTodayFoods.length > 0 ? initialTodayFoods : initialFavoriteFoods);
    setMoodFilters(initialMoodFilters);
    setBudgetMax(initialBudgetMax || '$$');
    setMaxWalkKm(initialMaxWalkKm || 2);
  }, [
    initialMealPeriod,
    initialSelectedCuisines,
    initialSelectedFormats,
    initialTodayFoods,
    initialFavoriteFoods,
    initialMoodFilters,
    initialBudgetMax,
    initialMaxWalkKm,
  ]);

  const toggleMood = (id: string) => {
    setSavedNotice(null);
    setMoodFilters((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleTodayFood = (food: string) => {
    setSavedNotice(null);
    setErrorMsg(null);
    setTodayFoods((prev) => {
      if (prev.includes(food)) {
        return prev.filter((f) => f !== food);
      }
      if (prev.length >= 30) {
        setErrorMsg('最多可選擇 30 款菜式');
        return prev;
      }
      return [...prev, food];
    });
  };

  const handleAddCustomToBaseline = (customFood: string) => {
    setAddedCustomFoods((prev) => (prev.includes(customFood) ? prev : [...prev, customFood]));
  };

  const handleSave = async (status: 'picking' | 'ready', goArenaAfter = false) => {
    setErrorMsg(null);
    setSavedNotice(null);

    if (
      status === 'ready' &&
      todayFoods.length === 0 &&
      selectedCuisines.length === 0 &&
      selectedFormats.length === 0
    ) {
      setErrorMsg('請最少揀 1 個菜系、食物類型或 1 款想食嘅菜式。');
      return;
    }

    setSaving(true);
    try {
      const mergedFavorites =
        addedCustomFoods.length > 0
          ? Array.from(new Set([...initialFavoriteFoods, ...addedCustomFoods]))
          : undefined;

      await onSubmitPreferences({
        mealPeriod,
        selectedCuisines,
        selectedFormats,
        favoriteFoods: mergedFavorites,
        todayFoods,
        moodFilters,
        budgetMax,
        maxWalkKm,
        status,
      });

      setAddedCustomFoods([]);
      setSavedNotice(status === 'ready' ? '已提交今日選擇並儲存至共用輪盤' : '已暫存');

      if (goArenaAfter) {
        onGoToArena();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Meal Period + 6 Cuisines + Per-Cuisine Dishes */}
      <section className="bg-white border border-black/[0.08] rounded-[22px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-black/[0.08]">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1D1D1F]">
              揀今日想食
            </h2>
            <p className="text-xs text-[#6E6E73] mt-0.5">
              揀好後按「儲存並去輪盤」，同房成員會即時見到你嘅選擇
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              initialStatus === 'ready'
                ? 'bg-[#DCFCE7] text-[#15803D]'
                : 'bg-[#FEF3C7] text-[#B45309]'
            }`}
          >
            {initialStatus === 'ready' ? '已提交至輪盤' : '揀緊食咩...'}
          </span>
        </div>

        <CuisineFoodSelector
          mealPeriod={mealPeriod}
          onChangeMealPeriod={(next) => {
            setSavedNotice(null);
            setMealPeriod(next);
          }}
          selectedCuisines={selectedCuisines}
          onChangeCuisines={(next) => {
            setSavedNotice(null);
            setSelectedCuisines(next);
          }}
          selectedFoods={todayFoods}
          onChangeFoods={(next) => {
            setSavedNotice(null);
            setTodayFoods(next);
          }}
          recentMeals7Days={recentMeals7Days}
          onAddCustomFood={handleAddCustomToBaseline}
          layoutIdPrefix="today"
        />
      </section>

      {/* Section 2: Standalone Dish Format Selector */}
      <DishFormatSelector
        mealPeriod={mealPeriod}
        selectedCuisines={selectedCuisines}
        selectedFormats={selectedFormats}
        onChangeFormats={(next) => {
          setSavedNotice(null);
          setSelectedFormats(next);
        }}
        selectedFoods={todayFoods}
        onToggleFood={handleToggleTodayFood}
        recentMeals7Days={recentMeals7Days}
      />

      {/* Section 3: Mood & Dietary Filters */}
      <section className="bg-white border border-black/[0.08] rounded-[22px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-[#0071E3]" />
          <h2 className="font-display text-lg sm:text-xl font-bold text-[#1D1D1F]">
            今日要求 / 禁忌（可多選）
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {HK_MOOD_FILTERS.map((mood) => {
            const active = moodFilters.includes(mood.id);
            return (
              <button
                key={mood.id}
                type="button"
                onClick={() => toggleMood(mood.id)}
                className={`apple-btn min-h-[44px] px-3 py-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                  active
                    ? 'bg-[#0071E3]/[0.08] border-[#0071E3] text-[#1D1D1F]'
                    : 'bg-[#F5F5F7] border-black/[0.07] text-[#1D1D1F] hover:bg-[#EBEBF0]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    active
                      ? 'bg-[#0071E3] border-[#0071E3] text-white'
                      : 'bg-white border-black/20'
                  }`}
                >
                  {active && <Check className="w-3 h-3" />}
                </div>
                <span className="text-xs font-semibold truncate">{mood.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 4: Budget & Distance */}
      <section className="bg-white border border-black/[0.08] rounded-[22px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#FF9500]" />
            <h3 className="font-semibold text-base text-[#1D1D1F]">每人預算上限</h3>
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
                  className={`apple-btn min-h-[44px] rounded-xl border font-mono-tabular text-sm font-bold cursor-pointer ${
                    active
                      ? 'bg-[#1D1D1F] border-[#1D1D1F] text-white'
                      : 'bg-[#F5F5F7] border-black/[0.08] text-[#1D1D1F] hover:bg-[#EBEBF0]'
                  }`}
                >
                  {tier}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[#6E6E73]">{BUDGET_DESCRIPTIONS[budgetMax]}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Footprints className="w-5 h-5 text-[#0071E3]" />
              <h3 className="font-semibold text-base text-[#1D1D1F]">搜尋範圍半徑</h3>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#F5F5F7] border border-black/[0.08] font-mono-tabular text-sm font-bold text-[#0071E3]">
              {maxWalkKm} km
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
            className="w-full accent-[#0071E3] cursor-pointer h-2"
          />
          <div className="flex justify-between text-xs text-[#6E6E73] font-mono-tabular">
            <span>1.0 km</span>
            <span>2.0 km</span>
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

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => handleSave('picking', false)}
          disabled={saving}
          className="apple-btn min-h-[46px] px-5 py-2.5 rounded-xl border border-black/[0.1] bg-white hover:bg-[#F5F5F7] text-sm font-semibold text-[#1D1D1F] cursor-pointer disabled:opacity-60"
        >
          暫存進度
        </button>
        <button
          type="button"
          onClick={() => handleSave('ready', true)}
          disabled={saving}
          className="apple-btn min-h-[46px] px-6 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>儲存至輪盤並前往決定</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
