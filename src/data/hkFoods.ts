import { DemoFriendProfile, MoodFilterDef } from '../types';

export const LAYER1_HOT_FOODS: string[] = [
  '松屋漢堡扒',
  '牛肉飯',
  '麥當勞',
  'Shake Shack',
  'Five Guys',
  'Pizza',
  '壽司',
  '拉麵',
  '譚仔米線',
  '茶餐廳',
  '點心',
  '打邊爐',
  '韓國燒肉',
  '炸雞',
  '泰國菜',
  '越南河粉',
  '意粉',
  '台式牛肉麵',
];

export const LAYER2_CUISINE_GROUPS: {
  id: string;
  label: string;
  foods: string[];
}[] = [
  {
    id: 'japanese',
    label: '日本菜',
    foods: [
      '壽司',
      '拉麵',
      '松屋漢堡扒',
      '牛肉飯',
      '天婦羅',
      '日式燒肉',
      '烏冬',
      '日式咖喱飯',
      '居酒屋',
    ],
  },
  {
    id: 'western',
    label: '西式 / 快餐',
    foods: [
      '麥當勞',
      'Shake Shack',
      'Five Guys',
      'Pizza',
      '意粉',
      '牛扒',
      'Fish & Chips',
      'All Day Breakfast',
    ],
  },
  {
    id: 'hk_chinese',
    label: '港式 / 中菜',
    foods: [
      '茶餐廳',
      '點心',
      '打邊爐',
      '燒味飯',
      '車仔麵',
      '雲吞麵',
      '小炒',
      '川菜 / 酸菜魚',
    ],
  },
  {
    id: 'asian',
    label: '亞洲風味',
    foods: [
      '泰國菜',
      '越南河粉',
      '韓國燒肉',
      '韓式炸雞',
      '譚仔米線',
      '星馬菜（海南雞飯 / 肉骨茶）',
      '印度咖喱',
    ],
  },
];

export const HK_MOOD_FILTERS: MoodFilterDef[] = [
  {
    id: 'light',
    label: '食清淡啲',
    hint: '排除重口味及濃油赤醬',
  },
  {
    id: 'less_fried',
    label: '少啲煎炸嘢',
    hint: '避開炸雞、薯條、天婦羅等油炸食物',
  },
  {
    id: 'heavy',
    label: '想食重口味 / 油膩啲',
    hint: '適合打邊爐、燒肉、漢堡等濃味食物',
  },
  {
    id: 'no_spicy',
    label: '今日唔食辣',
    hint: '自動排除川菜、麻辣米線、重辣泰菜',
  },
  {
    id: 'hot_soup',
    label: '想食熱辣辣 / 湯水嘢',
    hint: '優先拉麵、湯米線、雲吞麵、打邊爐',
  },
  {
    id: 'cold_refreshing',
    label: '想食凍嘢 / 涼浸浸',
    hint: '優先壽司、冷麵、沙律、越南撈檬',
  },
  {
    id: 'quick_meal',
    label: '想快食 / 唔想等位',
    hint: '優先快餐、茶餐廳、牛肉飯',
  },
  {
    id: 'comfy_chat',
    label: '坐得舒服 / 啱傾計',
    hint: '排除快餐店，優先 Cafe、居酒屋、西餐廳',
  },
  {
    id: 'healthy_veggie',
    label: '想食多啲菜 / 健康啲',
    hint: '優先沙律、越菜、多蔬菜選擇',
  },
  {
    id: 'filling_value',
    label: '想食飽肚 / 大份抵食',
    hint: '優先漢堡、牛肉飯、茶餐廳碟頭飯',
  },
];

// Food trait classification for smart filtering
const FOOD_TRAITS: Record<
  string,
  {
    fried?: boolean;
    heavy?: boolean;
    spicy?: boolean;
    fastFood?: boolean;
    soupHot?: boolean;
    cold?: boolean;
    healthy?: boolean;
    filling?: boolean;
    comfy?: boolean;
  }
> = {
  松屋漢堡扒: { heavy: true, fastFood: true, filling: true },
  牛肉飯: { fastFood: true, filling: true },
  麥當勞: { fried: true, heavy: true, fastFood: true, filling: true },
  'Shake Shack': { fried: true, heavy: true, fastFood: true, filling: true },
  'Five Guys': { fried: true, heavy: true, fastFood: true, filling: true },
  Pizza: { heavy: true, filling: true, comfy: true },
  壽司: { cold: true, healthy: true, comfy: true },
  拉麵: { heavy: true, soupHot: true, filling: true },
  譚仔米線: { spicy: true, soupHot: true, fastFood: true, filling: true },
  茶餐廳: { fastFood: true, filling: true },
  點心: { healthy: true, comfy: true },
  打邊爐: { heavy: true, soupHot: true, comfy: true, filling: true },
  韓國燒肉: { heavy: true, comfy: true, filling: true },
  炸雞: { fried: true, heavy: true },
  韓式炸雞: { fried: true, heavy: true, spicy: true },
  泰國菜: { spicy: true, healthy: true, comfy: true },
  越南河粉: { soupHot: true, cold: true, healthy: true },
  意粉: { comfy: true, filling: true },
  台式牛肉麵: { soupHot: true, filling: true },
  天婦羅: { fried: true, heavy: true },
  日式燒肉: { heavy: true, comfy: true, filling: true },
  烏冬: { soupHot: true },
  日式咖喱飯: { heavy: true, filling: true },
  居酒屋: { comfy: true },
  牛扒: { heavy: true, comfy: true, filling: true },
  'Fish & Chips': { fried: true, heavy: true },
  'All Day Breakfast': { comfy: true, healthy: true },
  燒味飯: { fastFood: true, filling: true },
  車仔麵: { soupHot: true, fastFood: true, filling: true },
  雲吞麵: { soupHot: true, fastFood: true },
  小炒: { healthy: true, comfy: true, filling: true },
  '川菜 / 酸菜魚': { spicy: true, heavy: true, soupHot: true, comfy: true },
  '星馬菜（海南雞飯 / 肉骨茶）': { soupHot: true, healthy: true, filling: true },
  印度咖喱: { spicy: true, heavy: true, comfy: true },
};

export interface WheelCandidate {
  name: string;
  votes: number;
  supporters: string[];
  bonusScore: number;
}

export interface FilteredPoolResult {
  candidates: WheelCandidate[];
  filteredOut: { name: string; reason: string }[];
}

export function computeFilteredWheelPool(
  members: {
    displayName: string;
    favoriteFoods: string[];
    todayFoods: string[];
    moodFilters: string[];
  }[],
  rejectedFoods: string[]
): FilteredPoolResult {
  const tally: Record<string, { votes: number; supporters: string[] }> = {};
  const allMoods = new Set<string>();

  for (const m of members) {
    for (const mood of m.moodFilters || []) {
      allMoods.add(mood);
    }
    const picks = m.todayFoods?.length ? m.todayFoods : m.favoriteFoods || [];
    const seenForMember = new Set<string>();
    for (const food of picks) {
      const clean = food.trim();
      if (!clean || seenForMember.has(clean)) continue;
      seenForMember.add(clean);
      if (!tally[clean]) {
        tally[clean] = { votes: 0, supporters: [] };
      }
      tally[clean].votes += 1;
      tally[clean].supporters.push(m.displayName);
    }
  }

  const rejectedSet = new Set(rejectedFoods);
  const candidates: WheelCandidate[] = [];
  const filteredOut: { name: string; reason: string }[] = [];

  for (const [name, info] of Object.entries(tally)) {
    if (rejectedSet.has(name)) {
      filteredOut.push({ name, reason: '剛才輪盤已否決' });
      continue;
    }

    const traits = FOOD_TRAITS[name] || {};
    const lower = name.toLowerCase();

    // Conflict checks against group mood filters
    if (
      allMoods.has('less_fried') &&
      (traits.fried || name.includes('炸') || name.includes('薯條') || lower.includes('fried'))
    ) {
      filteredOut.push({ name, reason: '有成員揀咗「少啲煎炸嘢」' });
      continue;
    }

    if (
      allMoods.has('no_spicy') &&
      (traits.spicy || name.includes('辣') || name.includes('川') || name.includes('酸菜魚'))
    ) {
      filteredOut.push({ name, reason: '有成員揀咗「今日唔食辣」' });
      continue;
    }

    if (allMoods.has('light') && traits.heavy) {
      filteredOut.push({ name, reason: '有成員揀咗「食清淡啲」' });
      continue;
    }

    if (allMoods.has('comfy_chat') && traits.fastFood) {
      filteredOut.push({ name, reason: '有成員揀咗「坐得舒服 / 啱傾計」' });
      continue;
    }

    let bonusScore = 0;
    if (allMoods.has('heavy') && traits.heavy) bonusScore += 1;
    if (allMoods.has('hot_soup') && traits.soupHot) bonusScore += 1;
    if (allMoods.has('cold_refreshing') && traits.cold) bonusScore += 1;
    if (allMoods.has('quick_meal') && traits.fastFood) bonusScore += 1;
    if (allMoods.has('healthy_veggie') && traits.healthy) bonusScore += 1;
    if (allMoods.has('filling_value') && traits.filling) bonusScore += 1;

    candidates.push({
      name,
      votes: info.votes,
      supporters: info.supporters,
      bonusScore,
    });
  }

  candidates.sort((a, b) => b.votes + b.bonusScore - (a.votes + a.bonusScore));
  return { candidates, filteredOut };
}

export const DEMO_FRIENDS: DemoFriendProfile[] = [
  {
    uid: 'demo_alex',
    displayName: '阿希 (Alex)',
    photoURL: '',
    favoriteFoods: ['壽司', '拉麵', '越南河粉', 'All Day Breakfast'],
    todayFoods: ['壽司', '越南河粉', '拉麵'],
    moodFilters: ['light', 'less_fried'],
    budgetMax: '$$',
    maxWalkKm: 2,
    status: 'ready',
  },
  {
    uid: 'demo_chloe',
    displayName: 'Chloe',
    photoURL: '',
    favoriteFoods: ['打邊爐', '韓國燒肉', '炸雞', 'Shake Shack'],
    todayFoods: ['打邊爐', '韓國燒肉', '炸雞'],
    moodFilters: ['heavy', 'comfy_chat'],
    budgetMax: '$$$',
    maxWalkKm: 2,
    status: 'ready',
  },
  {
    uid: 'demo_benson',
    displayName: 'Benson',
    photoURL: '',
    favoriteFoods: ['譚仔米線', '牛肉飯', '松屋漢堡扒', '車仔麵'],
    todayFoods: ['譚仔米線', '牛肉飯', '松屋漢堡扒'],
    moodFilters: ['filling_value', 'hot_soup'],
    budgetMax: '$$',
    maxWalkKm: 1.5,
    status: 'ready',
  },
  {
    uid: 'demo_mandy',
    displayName: 'Mandy',
    photoURL: '',
    favoriteFoods: ['意粉', '點心', '泰國菜', '壽司'],
    todayFoods: ['意粉', '壽司', '點心'],
    moodFilters: ['no_spicy', 'comfy_chat'],
    budgetMax: '$$',
    maxWalkKm: 2,
    status: 'ready',
  },
];

export const HK_DISTRICTS: { id: string; name: string; lat: number; lng: number }[] = [
  { id: 'cwb', name: '銅鑼灣', lat: 22.2802, lng: 114.1846 },
  { id: 'tst', name: '尖沙咀', lat: 22.2988, lng: 114.1722 },
  { id: 'mk', name: '旺角', lat: 22.3193, lng: 114.1694 },
  { id: 'central', name: '中環', lat: 22.2819, lng: 114.1582 },
  { id: 'kt', name: '觀塘', lat: 22.3121, lng: 114.2255 },
];
