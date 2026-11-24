import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Plus, X } from 'lucide-react';
import {
  getExamplesForSingleCuisine,
  MEAL_PERIOD_OPTIONS,
  normalizeFoodKey,
  SIX_CUISINE_CATEGORIES,
} from '../data/hkFoods';
import { MealPeriod } from '../types';

interface CuisineFoodSelectorProps {
  mealPeriod?: MealPeriod;
  onChangeMealPeriod?: (nextPeriod: MealPeriod) => void;
  selectedCuisines: string[];
  onChangeCuisines: (nextCuisines: string[]) => void;
  selectedFoods: string[];
  onChangeFoods: (nextFoods: string[]) => void;
  recentMeals7Days?: string[];
  onAddCustomFood?: (customFood: string) => void;
  maxFoodsCount?: number;
  layoutIdPrefix?: string;
}

export function CuisineFoodSelector({
  mealPeriod = 'dinner',
  onChangeMealPeriod,
  selectedCuisines,
  onChangeCuisines,
  selectedFoods,
  onChangeFoods,
  recentMeals7Days = [],
  onAddCustomFood,
  maxFoodsCount = 30,
  layoutIdPrefix = 'selector',
}: CuisineFoodSelectorProps) {
  const [customInput, setCustomInput] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const selectedCuisineSet = useMemo(() => new Set(selectedCuisines), [selectedCuisines]);
  const selectedFoodSet = useMemo(() => new Set(selectedFoods), [selectedFoods]);
  const recent7DaysSet = useMemo(
    () => new Set(recentMeals7Days.map(normalizeFoodKey)),
    [recentMeals7Days]
  );

  // Build completely separate per-cuisine sections in the exact order of SIX_CUISINE_CATEGORIES
  // so selecting multiple cuisines NEVER mixes one cuisine's dishes into another.
  const selectedCuisineGroups = useMemo(() => {
    return SIX_CUISINE_CATEGORIES.filter((c) => selectedCuisineSet.has(c.id)).map((c) => ({
      id: c.id,
      label: c.label,
      dishes: getExamplesForSingleCuisine(c.id, mealPeriod),
    }));
  }, [selectedCuisineSet, mealPeriod]);

  const toggleCuisine = (cuisineId: string) => {
    setNotice(null);
    if (selectedCuisineSet.has(cuisineId)) {
      onChangeCuisines(selectedCuisines.filter((id) => id !== cuisineId));
    } else {
      onChangeCuisines([...selectedCuisines, cuisineId]);
    }
  };

  const toggleFood = (food: string) => {
    setNotice(null);
    if (selectedFoodSet.has(food)) {
      onChangeFoods(selectedFoods.filter((f) => f !== food));
    } else {
      if (selectedFoods.length >= maxFoodsCount) {
        setNotice(`最多可選擇 ${maxFoodsCount} 款菜式`);
        return;
      }
      onChangeFoods([...selectedFoods, food]);
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const trimmed = customInput.trim().slice(0, 40);
    if (!trimmed) return;

    if (selectedFoodSet.has(trimmed)) {
      setNotice(`「${trimmed}」已經喺清單入面`);
      setCustomInput('');
      return;
    }

    if (selectedFoods.length >= maxFoodsCount) {
      setNotice(`最多可選擇 ${maxFoodsCount} 款菜式`);
      return;
    }

    onChangeFoods([...selectedFoods, trimmed]);
    if (onAddCustomFood) {
      onAddCustomFood(trimmed);
    }
    setCustomInput('');
  };

  return (
    <div className="space-y-6">
      {/* Meal Period Switcher (Breakfast / Lunch / Dinner) */}
      {onChangeMealPeriod && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-[#1D1D1F]">1. 用餐時段</span>
            <span className="text-xs text-[#6E6E73]">菜式例子會按早／午／晚餐自動切換</span>
          </div>

          <div className="relative grid grid-cols-3 p-1 rounded-xl bg-[#E8E8ED]/80 border border-black/[0.06] overflow-hidden">
            {MEAL_PERIOD_OPTIONS.map((opt) => {
              const active = mealPeriod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeMealPeriod(opt.id)}
                  className={`apple-btn relative min-h-[42px] px-3 py-2 rounded-[9px] text-sm font-semibold flex items-center justify-center cursor-pointer z-10 ${
                    active ? 'text-[#1D1D1F]' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId={`${layoutIdPrefix}-meal-period`}
                      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                      className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_3px_rgba(0,0,0,0.1)] -z-10"
                    />
                  )}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: 6 Cuisines */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-[#1D1D1F]">
            {onChangeMealPeriod ? '2. 揀菜系（可多選）' : '1. 揀菜系（可多選）'}
          </span>
          <span className="font-mono-tabular text-xs font-medium text-[#6E6E73]">
            已揀 {selectedCuisines.length} / 6
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {SIX_CUISINE_CATEGORIES.map((cuisine) => {
            const active = selectedCuisineSet.has(cuisine.id);
            return (
              <button
                key={cuisine.id}
                type="button"
                onClick={() => toggleCuisine(cuisine.id)}
                className={`apple-btn min-h-[46px] px-4 py-2.5 rounded-xl border text-sm font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-[#0071E3] border-[#0071E3] text-white shadow-[0_1px_4px_rgba(0,113,227,0.28)]'
                    : 'bg-[#F5F5F7] border-black/[0.08] text-[#1D1D1F] hover:bg-[#EBEBF0]'
                }`}
              >
                {active && <Check className="w-4 h-4 shrink-0" />}
                <span className="truncate">{cuisine.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Per-Cuisine Concrete Dish Lists (Zero Cross-Contamination) */}
      <div className="space-y-4 pt-4 border-t border-black/[0.08]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-[#1D1D1F]">
            {onChangeMealPeriod ? '3. 逐個菜系揀菜式' : '2. 逐個菜系揀菜式'}
          </span>
          <span className="font-mono-tabular text-xs font-medium text-[#6E6E73]">
            已選 {selectedFoods.length} 款
          </span>
        </div>

        {selectedCuisineGroups.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] text-xs sm:text-sm text-[#6E6E73]">
            請先喺上面揀最少 1 個菜系，系統會分開列出對應時段嘅精選菜式。
          </div>
        ) : (
          <div className="space-y-4">
            {selectedCuisineGroups.map((group) => (
              <div
                key={group.id}
                className="p-4 rounded-2xl bg-[#F5F5F7]/80 border border-black/[0.06] space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#1D1D1F]">
                    {group.label} · {MEAL_PERIOD_OPTIONS.find((p) => p.id === mealPeriod)?.label}精選
                  </span>
                  <span className="text-[11px] font-medium text-[#6E6E73]">
                    {group.dishes.length} 款
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {group.dishes.map((dish) => {
                    const active = selectedFoodSet.has(dish);
                    const eatenRecently = recent7DaysSet.has(normalizeFoodKey(dish));
                    return (
                      <button
                        key={`${group.id}_${dish}`}
                        type="button"
                        onClick={() => toggleFood(dish)}
                        className={`apple-btn min-h-[40px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                          active
                            ? 'bg-[#1D1D1F] border-[#1D1D1F] text-white shadow-xs'
                            : eatenRecently
                              ? 'bg-white/70 border-black/[0.08] text-[#6E6E73] hover:border-[#0071E3]/50'
                              : 'bg-white border-black/[0.08] text-[#1D1D1F] hover:border-[#0071E3]/60'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>{dish}</span>
                        {eatenRecently && (
                          <span
                            className={`text-[10px] font-semibold ${
                              active ? 'text-white/80' : 'text-[#B45309]'
                            }`}
                          >
                            · 7日內食過
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 4: Custom Food Input */}
      <div className="space-y-2.5 pt-4 border-t border-black/[0.08]">
        <label htmlFor={`${layoutIdPrefix}-custom-food-input`} className="block text-sm font-semibold text-[#1D1D1F]">
          {onChangeMealPeriod ? '4. 自己輸入想食嘅嘢食' : '3. 自己輸入想食嘅嘢食'}
        </label>
        <form onSubmit={handleAddCustom} className="flex gap-2">
          <input
            id={`${layoutIdPrefix}-custom-food-input`}
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            maxLength={40}
            placeholder="例如：阿一豬扒酸辣米線、九龍城泰菜..."
            className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-black/[0.1] bg-[#F5F5F7] focus:bg-white focus:outline-none focus:border-[#0071E3] text-sm transition-colors"
          />
          <button
            type="submit"
            className="apple-btn min-h-[44px] px-4 py-2 rounded-xl bg-[#1D1D1F] hover:bg-[#333336] text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>加入</span>
          </button>
        </form>

        {notice && <p className="text-xs font-medium text-[#DC2626]">{notice}</p>}
      </div>

      {/* Selected Foods Bar */}
      {selectedFoods.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.08] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6E6E73]">
              我嘅候選清單（{selectedFoods.length} 款，提交後會儲存至共用輪盤）
            </span>
            <button
              type="button"
              onClick={() => onChangeFoods([])}
              className="text-xs font-semibold text-[#0071E3] hover:underline cursor-pointer"
            >
              清空
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedFoods.map((food) => {
              const eatenRecently = recent7DaysSet.has(normalizeFoodKey(food));
              return (
                <button
                  key={food}
                  type="button"
                  onClick={() => toggleFood(food)}
                  className="apple-btn inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1 rounded-xl bg-white border border-black/[0.1] text-xs font-semibold text-[#1D1D1F] hover:bg-red-50 hover:border-red-200 cursor-pointer"
                >
                  <span>{food}</span>
                  {eatenRecently && (
                    <span className="text-[10px] text-[#B45309] font-semibold">· 7日內食過</span>
                  )}
                  <X className="w-3.5 h-3.5 text-[#6E6E73]" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
