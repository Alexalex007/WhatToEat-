import React, { useState } from 'react';
import { Check, Flame, Sparkles, X } from 'lucide-react';
import { LAYER1_HOT_FOODS, LAYER2_CUISINE_GROUPS } from '../data/hkFoods';

interface ThreeTierFoodSelectorProps {
  selectedFoods: string[];
  onChange: (nextFoods: string[]) => void;
  onAddCustomFood?: (customFood: string) => void;
  title?: string;
  subtitle?: string;
  maxCount?: number;
}

export function ThreeTierFoodSelector({
  selectedFoods,
  onChange,
  onAddCustomFood,
  title = '三層式快捷點選美食',
  subtitle = '撳一下即加即減，亦可以自己打冷門菜式',
  maxCount = 30,
}: ThreeTierFoodSelectorProps) {
  const [activeCuisineId, setActiveCuisineId] = useState<string>(LAYER2_CUISINE_GROUPS[0].id);
  const [customInput, setCustomInput] = useState('');
  const [inputNotice, setInputNotice] = useState<string | null>(null);

  const selectedSet = new Set(selectedFoods);

  const toggleFood = (food: string) => {
    setInputNotice(null);
    if (selectedSet.has(food)) {
      onChange(selectedFoods.filter((f) => f !== food));
    } else {
      if (selectedFoods.length >= maxCount) {
        setInputNotice(`最多可選擇 ${maxCount} 款美食。`);
        return;
      }
      onChange([...selectedFoods, food]);
    }
  };

  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInputNotice(null);
    const trimmed = customInput.trim().slice(0, 40);
    if (!trimmed) return;

    if (selectedSet.has(trimmed)) {
      setInputNotice(`「${trimmed}」已經喺清單入面啦。`);
      setCustomInput('');
      return;
    }

    if (selectedFoods.length >= maxCount) {
      setInputNotice(`最多可選擇 ${maxCount} 款美食。`);
      return;
    }

    const next = [...selectedFoods, trimmed];
    onChange(next);
    if (onAddCustomFood) {
      onAddCustomFood(trimmed);
    }
    setCustomInput('');
    setInputNotice(`已將「${trimmed}」加入個人清單及今次飯局！`);
  };

  const activeCuisine =
    LAYER2_CUISINE_GROUPS.find((g) => g.id === activeCuisineId) || LAYER2_CUISINE_GROUPS[0];

  // Show custom foods not in Layer 1 or Layer 2 prominently
  const builtInFoods = new Set<string>([
    ...LAYER1_HOT_FOODS,
    ...LAYER2_CUISINE_GROUPS.flatMap((g) => g.foods),
  ]);
  const customSelected = selectedFoods.filter((f) => !builtInFoods.has(f));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#1C1917]">{title}</h3>
          <p className="text-xs sm:text-sm text-[#6B6560]">{subtitle}</p>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA] font-mono-tabular text-xs font-semibold text-[#1C1917]">
          已揀 {selectedFoods.length} 款
        </span>
      </div>

      {/* Currently Selected Summary */}
      {selectedFoods.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#6B6560]">目前揀咗嘅項目（點擊可移除）</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-medium text-[#E85D3F] hover:underline cursor-pointer"
            >
              清空全部
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedFoods.map((food) => (
              <button
                key={food}
                type="button"
                onClick={() => toggleFood(food)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#E85D3F]/40 text-xs font-semibold text-[#1C1917] hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer"
              >
                <span>{food}</span>
                <X className="w-3.5 h-3.5 text-[#E85D3F]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Layer 1: Popular HK 18 Foods */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1917]">
          <Flame className="w-4 h-4 text-[#E85D3F]" />
          <span>第一層：熱門精選速選區（18 款香港人氣美食）</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {LAYER1_HOT_FOODS.map((food) => {
            const active = selectedSet.has(food);
            return (
              <button
                key={food}
                type="button"
                onClick={() => toggleFood(food)}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-[#E85D3F] border-[#E85D3F] text-white shadow-xs'
                    : 'bg-white border-[#E7E2DA] text-[#1C1917] hover:border-[#E85D3F]/60 hover:bg-[#FAF8F5]'
                }`}
              >
                {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                <span>{food}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layer 2: Cuisine Category Tabs */}
      <div className="space-y-3 pt-2 border-t border-[#E7E2DA]">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1917]">
          <Sparkles className="w-4 h-4 text-[#F59E0B]" />
          <span>第二層：按菜系分類瀏覽</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {LAYER2_CUISINE_GROUPS.map((group) => {
            const isTab = group.id === activeCuisine.id;
            const countInGroup = group.foods.filter((f) => selectedSet.has(f)).length;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveCuisineId(group.id)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  isTab
                    ? 'bg-[#1C1917] border-[#1C1917] text-white'
                    : 'bg-[#FAF8F5] border-[#E7E2DA] text-[#6B6560] hover:text-[#1C1917]'
                }`}
              >
                <span>{group.label}</span>
                {countInGroup > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono-tabular ${
                      isTab ? 'bg-white/20 text-white' : 'bg-white text-[#E85D3F]'
                    }`}
                  >
                    {countInGroup}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA]">
          {activeCuisine.foods.map((food) => {
            const active = selectedSet.has(food);
            return (
              <button
                key={`${activeCuisine.id}_${food}`}
                type="button"
                onClick={() => toggleFood(food)}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-[#E85D3F] border-[#E85D3F] text-white shadow-xs'
                    : 'bg-white border-[#E7E2DA] text-[#1C1917] hover:border-[#E85D3F]/60'
                }`}
              >
                {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                <span>{food}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layer 3: Custom Food Input */}
      <div className="space-y-2.5 pt-2 border-t border-[#E7E2DA]">
        <label htmlFor="custom-food-input" className="block text-xs font-bold text-[#1C1917]">
          第三層：自訂冷門 / 偏門美食
        </label>
        <form onSubmit={handleAddCustom} className="flex flex-col sm:flex-row gap-2">
          <input
            id="custom-food-input"
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            maxLength={40}
            placeholder="搵唔到你想食嘅？自己打落去，例如：西班牙海鮮飯、尼泊爾餃子..."
            className="flex-1 min-h-[46px] px-3.5 py-2.5 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#E85D3F] text-sm"
          />
          <button
            type="submit"
            className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-sm font-semibold inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <span>＋加入</span>
          </button>
        </form>

        {inputNotice && <p className="text-xs font-medium text-[#16A34A]">{inputNotice}</p>}

        {customSelected.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-[#6B6560]">自訂美食：</span>
            {customSelected.map((cf) => (
              <button
                key={cf}
                type="button"
                onClick={() => toggleFood(cf)}
                className="px-2.5 py-1 rounded-lg bg-[#FEF3C7] border border-[#F59E0B]/40 text-xs font-semibold text-[#92400E] inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{cf}</span>
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
