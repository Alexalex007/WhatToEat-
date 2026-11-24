import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Layers } from 'lucide-react';
import {
  DISH_FORMAT_CATEGORIES,
  getExamplesForDishFormat,
  normalizeFoodKey,
} from '../data/hkFoods';
import { DishFormatId, MealPeriod } from '../types';

interface DishFormatSelectorProps {
  mealPeriod: MealPeriod;
  selectedCuisines: string[];
  selectedFormats: string[];
  onChangeFormats: (nextFormats: string[]) => void;
  selectedFoods: string[];
  onToggleFood: (food: string) => void;
  recentMeals7Days: string[];
}

export function DishFormatSelector({
  mealPeriod,
  selectedCuisines,
  selectedFormats,
  onChangeFormats,
  selectedFoods,
  onToggleFood,
  recentMeals7Days,
}: DishFormatSelectorProps) {
  const [activeBrowseFormat, setActiveBrowseFormat] = useState<DishFormatId>(
    (selectedFormats[0] as DishFormatId) || DISH_FORMAT_CATEGORIES[0].id
  );

  const selectedFormatSet = useMemo(() => new Set(selectedFormats), [selectedFormats]);
  const selectedFoodSet = useMemo(() => new Set(selectedFoods), [selectedFoods]);
  const recent7DaysSet = useMemo(
    () => new Set(recentMeals7Days.map(normalizeFoodKey)),
    [recentMeals7Days]
  );

  const handleToggleFormat = (formatId: DishFormatId) => {
    setActiveBrowseFormat(formatId);
    if (selectedFormatSet.has(formatId)) {
      onChangeFormats(selectedFormats.filter((id) => id !== formatId));
    } else {
      onChangeFormats([...selectedFormats, formatId]);
    }
  };

  const activeFormatMeta =
    DISH_FORMAT_CATEGORIES.find((f) => f.id === activeBrowseFormat) || DISH_FORMAT_CATEGORIES[0];

  const matchingDishes = useMemo(
    () => getExamplesForDishFormat(activeBrowseFormat, mealPeriod, selectedCuisines),
    [activeBrowseFormat, mealPeriod, selectedCuisines]
  );

  return (
    <section className="bg-white border border-black/[0.08] rounded-[22px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#0071E3]" />
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#1D1D1F]">
              食物類型速選（飯 / 麵條 / 湯鍋 / 燒烤 / 輕食）
            </h2>
            <p className="text-xs text-[#6E6E73]">
              獨立於菜系選擇，直接按今晚想食「飯」、「麵」定「打邊爐」搵菜式
            </p>
          </div>
        </div>
        <span className="font-mono-tabular text-xs font-medium text-[#6E6E73]">
          已揀 {selectedFormats.length} 類
        </span>
      </div>

      {/* Format Type Multi-Select Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {DISH_FORMAT_CATEGORIES.map((fmt) => {
          const isPicked = selectedFormatSet.has(fmt.id);
          const isViewing = activeBrowseFormat === fmt.id;
          return (
            <button
              key={fmt.id}
              type="button"
              onClick={() => handleToggleFormat(fmt.id)}
              className={`apple-btn relative min-h-[60px] px-3.5 py-2.5 rounded-xl border text-left flex flex-col justify-center cursor-pointer ${
                isPicked
                  ? 'bg-[#0071E3] border-[#0071E3] text-white shadow-[0_1px_4px_rgba(0,113,227,0.28)]'
                  : isViewing
                    ? 'bg-[#F5F5F7] border-[#0071E3]/50 text-[#1D1D1F]'
                    : 'bg-[#F5F5F7] border-black/[0.07] text-[#1D1D1F] hover:bg-[#EBEBF0]'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-sm font-semibold truncate">{fmt.label}</span>
                {isPicked && <Check className="w-4 h-4 shrink-0" />}
              </div>
              <span
                className={`text-[11px] truncate mt-0.5 ${
                  isPicked ? 'text-white/85' : 'text-[#6E6E73]'
                }`}
              >
                {fmt.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Smooth Sliding Browse Tabs for Matching Dishes */}
      <div className="pt-2 space-y-3">
        <div className="relative flex items-center gap-1 p-1 rounded-xl bg-[#E8E8ED]/70 border border-black/[0.06] overflow-x-auto">
          {DISH_FORMAT_CATEGORIES.map((fmt) => {
            const viewing = activeBrowseFormat === fmt.id;
            return (
              <button
                key={`tab_${fmt.id}`}
                type="button"
                onClick={() => setActiveBrowseFormat(fmt.id)}
                className={`apple-btn relative min-h-[36px] px-3 py-1.5 rounded-[9px] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer z-10 ${
                  viewing ? 'text-[#1D1D1F]' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {viewing && (
                  <motion.span
                    layoutId="dish-format-browse-pill"
                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_2px_rgba(0,0,0,0.08)] -z-10"
                  />
                )}
                <span>{fmt.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 rounded-2xl bg-[#F5F5F7]/80 border border-black/[0.06] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#1D1D1F]">
              「{activeFormatMeta.label}」熱門選項（一按加入輪盤候選）
            </span>
            <span className="text-[11px] text-[#6E6E73]">{matchingDishes.length} 款</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {matchingDishes.map((dish) => {
              const active = selectedFoodSet.has(dish);
              const eatenRecently = recent7DaysSet.has(normalizeFoodKey(dish));
              return (
                <button
                  key={`${activeBrowseFormat}_${dish}`}
                  type="button"
                  onClick={() => onToggleFood(dish)}
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
      </div>
    </section>
  );
}
