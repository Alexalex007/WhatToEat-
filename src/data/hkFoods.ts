import { DishFormatId, MealPeriod, MoodFilterDef } from '../types';

export interface MealPeriodDef {
  id: MealPeriod;
  label: string;
}

export const MEAL_PERIOD_OPTIONS: MealPeriodDef[] = [
  { id: 'breakfast', label: '早餐' },
  { id: 'lunch', label: '午餐' },
  { id: 'dinner', label: '晚餐' },
];

export function getDefaultMealPeriod(): MealPeriod {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 17) return 'lunch';
  return 'dinner';
}

export function getMealPeriodLabel(period?: MealPeriod): string {
  return MEAL_PERIOD_OPTIONS.find((p) => p.id === period)?.label || '晚餐';
}

export interface CuisineCategoryDef {
  id: string;
  label: string;
  shortLabel: string;
  examplesByPeriod: Record<MealPeriod, string[]>;
}

export const SIX_CUISINE_CATEGORIES: CuisineCategoryDef[] = [
  {
    id: 'local',
    label: '本地嘢',
    shortLabel: '本地嘢',
    examplesByPeriod: {
      breakfast: [
        'All Day Breakfast',
        '白粥油炸鬼',
        '港式飲茶點心',
        '沙嗲牛肉公仔麵',
        '五香肉丁通粉',
        '火腿通粉配炒蛋多士',
        '西多士配凍奶茶',
        '腸粉燒賣魚蛋',
        '豬扒包配熱咖啡',
        '菠蘿油炒蛋餐',
        '潮州魚蛋粉',
        '皮蛋瘦肉粥配腸粉',
      ],
      lunch: [
        '叉燒燒鵝飯',
        '乾炒牛河',
        '瑞士雞翼撈丁',
        '譚仔米線',
        '車仔麵',
        '鮮蝦雲吞麵',
        '焗豬扒飯',
        '滑蛋蝦仁飯',
        '生滾魚片粥',
        '冰室常餐',
        '豉油皇炒麵',
        '星洲炒米',
      ],
      dinner: [
        '沙嗲牛打邊爐',
        '雞煲配肥牛',
        '臘味煲仔飯',
        '大排檔椒鹽鮮魷',
        '深井燒鵝脾',
        '避風塘炒辣蟹',
        '豉汁蒸盤龍鱔',
        '羊腩煲',
        '車仔麵配牛腩',
        '鮮蝦雲吞撈麵',
        '啫啫雞煲',
        '胡椒豬肚湯鍋',
      ],
    },
  },
  {
    id: 'japanese',
    label: '日本菜',
    shortLabel: '日本菜',
    examplesByPeriod: {
      breakfast: [
        '日式三文魚朝定食',
        '松屋牛肉朝定食',
        '飯糰配味噌湯',
        '日式厚蛋三文治',
        '溫泉蛋牛肉飯',
        '讚岐湯烏冬',
        '玉子燒配白飯',
        '明太子茶漬飯',
        '日式照燒雞扒包',
        '抹茶紅豆班戟',
        '納豆紫菜白飯定食',
        '蟹柳青瓜壽司卷',
      ],
      lunch: [
        '三文魚壽司拼盤',
        '豬骨湯拉麵',
        '松屋漢堡扒',
        '吉野家牛肉飯',
        '吉列豬扒定食',
        '日式咖喱豬扒飯',
        '親子丼',
        '海鮮刺身丼',
        '天婦羅烏冬',
        '炙燒三文魚腩丼',
        '滑蛋牛丼',
        '牛油果軟殼蟹卷',
      ],
      dinner: [
        '極上壽司刺身拼盤',
        '和牛壽喜燒',
        '炭火日式燒肉',
        '濃厚豚骨拉麵',
        '海膽吞拿魚腩丼',
        '松屋漢堡扒',
        '日式串燒拼盤',
        '天婦羅盛合',
        '鰻魚三食飯',
        '博多牛腸鍋',
        '日式咖喱吉列豬扒飯',
        '吉列和牛三文治',
      ],
    },
  },
  {
    id: 'korean',
    label: '韓國菜',
    shortLabel: '韓國菜',
    examplesByPeriod: {
      breakfast: [
        '韓式牛油吐司三文治',
        '韓式紫菜包飯',
        '韓式鮮蝦飯糰',
        '泡菜芝士蛋吐司',
        '韓式蛋捲配飯',
        '韓式豆腐湯泡飯',
        '人蔘雞粥',
        '韓式炒蛋牛角包',
        '辣雞醬三文治',
        '海帶牛肉湯配飯',
      ],
      lunch: [
        '韓式炸雞配年糕',
        '泡菜牛肉石頭鍋飯',
        '韓式牛肉紫菜包飯',
        '泡菜豬肉豆腐鍋',
        '韓式辣炒豬肉飯',
        '醬油蝦飯',
        '韓式烤牛肋骨飯',
        '芝士辣雞麵',
        '蔘雞湯配飯',
        '韓式水冷麵',
        '海鮮煎餅',
        '韓式雜菜粉絲',
      ],
      dinner: [
        '韓式炭火五花肉燒烤',
        '韓式醬油蟹',
        '經典部隊鍋',
        '芝士排骨鍋',
        '蜂蜜蒜香韓式炸雞',
        '韓式和牛燒肉套餐',
        '韓式人蔘雞湯',
        '韓式辣燉牛肋骨',
        '海鮮泡菜煎餅',
        '石頭鍋拌飯',
        '韓式辣章魚炒五花肉',
        '韓式水冷麵配烤肉',
      ],
    },
  },
  {
    id: 'chinese',
    label: '中菜',
    shortLabel: '中菜',
    examplesByPeriod: {
      breakfast: [
        '蝦餃燒賣點心',
        '叉燒包配普洱',
        '生滾及第粥',
        '上海豆漿油條',
        '蟹黃小籠包',
        '脆皮生煎包',
        '鮮蝦雲吞麵',
        '糯米雞配馬拉糕',
        '蔥油拌麵',
        '菜肉大雲吞',
        '皮蛋瘦肉粥',
        '蘿蔔糕配腸粉',
      ],
      lunch: [
        '蝦餃燒賣一籠籠',
        '小籠包配擔擔麵',
        '上海排骨菜飯',
        '上海生煎包',
        '清蒸海上鮮',
        '脆皮燒鵝配瀨粉',
        '蜜汁叉燒飯',
        '酸菜魚配白飯',
        '麻婆豆腐飯',
        '咕嚕肉配絲苗',
        '紅燒牛肉麵',
        '雲吞撈麵配油菜',
      ],
      dinner: [
        '酸菜魚鍋',
        '片皮鴨兩食',
        '蟹粉小籠包',
        '蒜蓉粉絲蒸帶子',
        '沙田乳鴿配小炒',
        '麻辣雞煲',
        '花膠雞湯鍋',
        '上海紅燒肉',
        '賽螃蟹配鎮江骨',
        '椒鹽九肚魚',
        '干鍋肥腸蝦',
        '清蒸東星斑',
      ],
    },
  },
  {
    id: 'southeast_asian',
    label: '東南亞菜',
    shortLabel: '東南亞菜',
    examplesByPeriod: {
      breakfast: [
        '新加坡咖央多士配半熟蛋',
        '越式扎肉法包',
        '越式生牛肉湯河粉',
        '泰式豬肉串配糯米飯',
        '南洋喇沙米線',
        '星洲炒米粉',
        '馬來椰漿飯',
        '巴東牛肉配烤餅',
        '泰式豬肉湯粉',
        '印式煎餅配拉茶',
      ],
      lunch: [
        '海南雞飯',
        '越南生牛肉河粉',
        '冬蔭功大蝦湯河',
        '泰式炒金邊粉',
        '青咖喱雞配薄餅',
        '肉骨茶配油條',
        '星洲叻沙摻摻',
        '越式香茅豬扒撈檬',
        '印尼炒飯',
        '泰式豬頸肉飯',
        '沙嗲牛肉串燒',
        '印度牛油雞配烤餅',
      ],
      dinner: [
        '冬蔭功海鮮鍋',
        '泰式生蝦配青木瓜沙律',
        '泰式燒豬頸肉配串燒',
        '咖喱炒肉蟹配蒜蓉包',
        '越南生牛肉湯河粉',
        '星洲辣椒蟹',
        '馬來西亞肉骨茶',
        '海南雞配雞油飯',
        '泰式香茅燒春雞',
        '椰汁青咖喱牛腩',
        '越式香茅豬扒檬粉',
        '印式炭燒羊肉配烤餅',
      ],
    },
  },
  {
    id: 'western',
    label: '歐美菜',
    shortLabel: '歐美菜',
    examplesByPeriod: {
      breakfast: [
        'All Day Breakfast',
        '班尼迪蛋吐司',
        '煙三文魚貝果',
        '牛油果多士配水波蛋',
        '美式煙肉蛋漢堡',
        '麥當勞豬柳蛋漢堡',
        '美式鬆餅配楓糖',
        '法式牛角包配鮮奶咖啡',
        '希臘乳酪碗',
        '火腿芝士烘三文治',
      ],
      lunch: [
        '卡邦尼意粉',
        '瑪格麗特 Pizza',
        'Shake Shack 牛肉漢堡',
        'Five Guys 芝士漢堡',
        '麥當勞脆辣雞腿飽',
        '明太子忌廉蟹肉意粉',
        '香煎肉眼牛扒',
        '炸魚薯條',
        '凱撒雞肉沙律',
        '西班牙海鮮飯',
        '黑松露野菌意大利飯',
        '墨西哥雞肉捲餅',
      ],
      dinner: [
        '炭燒肉眼牛扒配薯條',
        '黑松露卡邦尼意粉',
        '拿坡里手工 Pizza',
        '西班牙海鮮飯',
        '德國鹹豬手配啤酒',
        '波士頓龍蝦意粉',
        'Shake Shack 牛肉漢堡',
        'Five Guys 煙肉芝士漢堡',
        '法式油封鴨腿',
        '威靈頓牛柳',
        '英式炸魚薯條',
        '香蒜白酒煮青口',
      ],
    },
  },
];

export interface DishFormatDef {
  id: DishFormatId;
  label: string;
  subtitle: string;
  dishes: {
    name: string;
    cuisines: string[];
    periods: MealPeriod[];
  }[];
}

export const DISH_FORMAT_CATEGORIES: DishFormatDef[] = [
  {
    id: 'rice',
    label: '飯類',
    subtitle: '丼飯・煲仔飯・燒味・炒飯',
    dishes: [
      { name: '叉燒燒鵝飯', cuisines: ['local', 'chinese'], periods: ['lunch', 'dinner'] },
      { name: '臘味煲仔飯', cuisines: ['local', 'chinese'], periods: ['dinner'] },
      { name: '松屋牛肉朝定食', cuisines: ['japanese'], periods: ['breakfast'] },
      { name: '吉野家牛肉飯', cuisines: ['japanese'], periods: ['lunch', 'dinner'] },
      { name: '海鮮刺身丼', cuisines: ['japanese'], periods: ['lunch', 'dinner'] },
      { name: '日式咖喱豬扒飯', cuisines: ['japanese'], periods: ['lunch', 'dinner'] },
      { name: '海南雞飯', cuisines: ['southeast_asian', 'local'], periods: ['lunch', 'dinner'] },
      { name: '泡菜牛肉石頭鍋飯', cuisines: ['korean'], periods: ['lunch', 'dinner'] },
      { name: '上海排骨菜飯', cuisines: ['chinese'], periods: ['lunch', 'dinner'] },
      { name: '焗豬扒飯', cuisines: ['local'], periods: ['lunch', 'dinner'] },
      { name: '黑松露野菌意大利飯', cuisines: ['western'], periods: ['lunch', 'dinner'] },
      { name: '西班牙海鮮飯', cuisines: ['western'], periods: ['lunch', 'dinner'] },
    ],
  },
  {
    id: 'noodles',
    label: '麵條 / 粉麵',
    subtitle: '意粉・米線・拉麵・河粉・烏冬',
    dishes: [
      { name: '卡邦尼意粉', cuisines: ['western'], periods: ['lunch', 'dinner'] },
      { name: '波士頓龍蝦意粉', cuisines: ['western'], periods: ['dinner'] },
      { name: '譚仔米線', cuisines: ['local'], periods: ['lunch', 'dinner'] },
      { name: '車仔麵', cuisines: ['local'], periods: ['breakfast', 'lunch', 'dinner'] },
      { name: '沙嗲牛肉公仔麵', cuisines: ['local'], periods: ['breakfast', 'lunch'] },
      { name: '豬骨湯拉麵', cuisines: ['japanese'], periods: ['lunch', 'dinner'] },
      { name: '讚岐湯烏冬', cuisines: ['japanese'], periods: ['breakfast', 'lunch', 'dinner'] },
      { name: '越南生牛肉河粉', cuisines: ['southeast_asian'], periods: ['breakfast', 'lunch', 'dinner'] },
      { name: '冬蔭功大蝦湯河', cuisines: ['southeast_asian'], periods: ['lunch', 'dinner'] },
      { name: '鮮蝦雲吞麵', cuisines: ['local', 'chinese'], periods: ['breakfast', 'lunch', 'dinner'] },
      { name: '乾炒牛河', cuisines: ['local', 'chinese'], periods: ['lunch', 'dinner'] },
      { name: '韓式水冷麵', cuisines: ['korean'], periods: ['lunch', 'dinner'] },
    ],
  },
  {
    id: 'soup_hotpot',
    label: '湯鍋 / 打邊爐 / 粥',
    subtitle: '打邊爐・雞煲・豆腐鍋・生滾粥',
    dishes: [
      { name: '沙嗲牛打邊爐', cuisines: ['local'], periods: ['dinner'] },
      { name: '雞煲配肥牛', cuisines: ['local', 'chinese'], periods: ['dinner'] },
      { name: '和牛壽喜燒', cuisines: ['japanese'], periods: ['dinner'] },
      { name: '經典部隊鍋', cuisines: ['korean'], periods: ['dinner'] },
      { name: '泡菜豬肉豆腐鍋', cuisines: ['korean'], periods: ['lunch', 'dinner'] },
      { name: '酸菜魚鍋', cuisines: ['chinese'], periods: ['lunch', 'dinner'] },
      { name: '冬蔭功海鮮鍋', cuisines: ['southeast_asian'], periods: ['dinner'] },
      { name: '馬來西亞肉骨茶', cuisines: ['southeast_asian'], periods: ['lunch', 'dinner'] },
      { name: '生滾及第粥', cuisines: ['local', 'chinese'], periods: ['breakfast', 'lunch'] },
      { name: '白粥油炸鬼', cuisines: ['local', 'chinese'], periods: ['breakfast'] },
      { name: '胡椒豬肚湯鍋', cuisines: ['local', 'chinese'], periods: ['dinner'] },
      { name: '韓式人蔘雞湯', cuisines: ['korean'], periods: ['lunch', 'dinner'] },
    ],
  },
  {
    id: 'grill_fry',
    label: '燒烤 / 香煎 / 炸物',
    subtitle: '燒肉・牛扒・漢堡扒・炸雞・串燒',
    dishes: [
      { name: '炭火日式燒肉', cuisines: ['japanese'], periods: ['dinner'] },
      { name: '韓式炭火五花肉燒烤', cuisines: ['korean'], periods: ['dinner'] },
      { name: '香煎肉眼牛扒', cuisines: ['western'], periods: ['lunch', 'dinner'] },
      { name: '松屋漢堡扒', cuisines: ['japanese'], periods: ['lunch', 'dinner'] },
      { name: '蜂蜜蒜香韓式炸雞', cuisines: ['korean'], periods: ['lunch', 'dinner'] },
      { name: '日式串燒拼盤', cuisines: ['japanese'], periods: ['dinner'] },
      { name: '沙嗲牛肉串燒', cuisines: ['southeast_asian'], periods: ['lunch', 'dinner'] },
      { name: '英式炸魚薯條', cuisines: ['western'], periods: ['lunch', 'dinner'] },
      { name: '大排檔椒鹽鮮魷', cuisines: ['local', 'chinese'], periods: ['dinner'] },
      { name: '泰式燒豬頸肉', cuisines: ['southeast_asian'], periods: ['lunch', 'dinner'] },
    ],
  },
  {
    id: 'bread_light',
    label: '漢堡 / 多士 / 輕食',
    subtitle: '漢堡・Pizza・全日早餐・三文治・沙律',
    dishes: [
      { name: 'Shake Shack 牛肉漢堡', cuisines: ['western'], periods: ['lunch', 'dinner'] },
      { name: 'Five Guys 芝士漢堡', cuisines: ['western'], periods: ['lunch', 'dinner'] },
      { name: '麥當勞豬柳蛋漢堡', cuisines: ['western'], periods: ['breakfast'] },
      { name: '麥當勞脆辣雞腿飽', cuisines: ['western'], periods: ['lunch', 'dinner'] },
      { name: 'All Day Breakfast', cuisines: ['local', 'western'], periods: ['breakfast', 'lunch'] },
      { name: '拿坡里手工 Pizza', cuisines: ['western'], periods: ['lunch', 'dinner'] },
      { name: '豬扒包配熱咖啡', cuisines: ['local'], periods: ['breakfast', 'lunch'] },
      { name: '新加坡咖央多士配半熟蛋', cuisines: ['southeast_asian'], periods: ['breakfast'] },
      { name: '越式扎肉法包', cuisines: ['southeast_asian'], periods: ['breakfast', 'lunch'] },
      { name: '凱撒雞肉沙律', cuisines: ['western'], periods: ['lunch', 'dinner'] },
    ],
  },
  {
    id: 'sharing',
    label: '點心 / 小菜 / 拼盤',
    subtitle: '飲茶點心・小籠包・小炒・刺身拼盤',
    dishes: [
      { name: '港式飲茶點心', cuisines: ['local', 'chinese'], periods: ['breakfast', 'lunch'] },
      { name: '蝦餃燒賣點心', cuisines: ['local', 'chinese'], periods: ['breakfast', 'lunch'] },
      { name: '蟹粉小籠包', cuisines: ['chinese'], periods: ['lunch', 'dinner'] },
      { name: '脆皮生煎包', cuisines: ['chinese'], periods: ['breakfast', 'lunch'] },
      { name: '片皮鴨兩食', cuisines: ['chinese'], periods: ['dinner'] },
      { name: '沙田乳鴿配小炒', cuisines: ['local', 'chinese'], periods: ['dinner'] },
      { name: '極上壽司刺身拼盤', cuisines: ['japanese'], periods: ['lunch', 'dinner'] },
      { name: '韓式海鮮煎餅', cuisines: ['korean'], periods: ['lunch', 'dinner'] },
      { name: '避風塘炒辣蟹', cuisines: ['local', 'chinese'], periods: ['dinner'] },
      { name: '咖喱炒肉蟹配蒜蓉包', cuisines: ['southeast_asian'], periods: ['dinner'] },
    ],
  },
];

export function getExamplesForSingleCuisine(
  cuisineId: string,
  mealPeriod: MealPeriod
): string[] {
  const cat = SIX_CUISINE_CATEGORIES.find((c) => c.id === cuisineId);
  if (!cat) return [];
  return cat.examplesByPeriod[mealPeriod] || cat.examplesByPeriod.dinner;
}

export function getExamplesForDishFormat(
  formatId: DishFormatId,
  mealPeriod?: MealPeriod,
  selectedCuisines?: string[]
): string[] {
  const fmt = DISH_FORMAT_CATEGORIES.find((f) => f.id === formatId);
  if (!fmt) return [];

  // Prioritize dishes matching selected mealPeriod and cuisines, but always include other popular matches in that format
  const scored = fmt.dishes.map((d) => {
    let score = 0;
    if (mealPeriod && d.periods.includes(mealPeriod)) score += 2;
    if (selectedCuisines && selectedCuisines.length > 0) {
      if (d.cuisines.some((c) => selectedCuisines.includes(c))) score += 3;
    }
    return { name: d.name, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.name);
}

export const HK_MOOD_FILTERS: MoodFilterDef[] = [
  { id: 'light', label: '食清淡啲' },
  { id: 'less_fried', label: '少啲煎炸嘢' },
  { id: 'heavy', label: '想食重口味 / 油膩啲' },
  { id: 'no_spicy', label: '今日唔食辣' },
  { id: 'hot_soup', label: '想食熱辣辣 / 湯水嘢' },
  { id: 'cold_refreshing', label: '想食凍嘢 / 涼浸浸' },
  { id: 'quick_meal', label: '想快食 / 唔想等位' },
  { id: 'comfy_chat', label: '坐得舒服 / 啱傾計' },
  { id: 'healthy_veggie', label: '想食多啲菜 / 健康啲' },
  { id: 'filling_value', label: '想食飽肚 / 大份抵食' },
];

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
  // Fast food / quick
  麥當勞豬柳蛋漢堡: { fried: true, heavy: true, fastFood: true, filling: true },
  麥當勞脆辣雞腿飽: { fried: true, heavy: true, spicy: true, fastFood: true, filling: true },
  'Shake Shack 牛肉漢堡': { fried: true, heavy: true, fastFood: true, filling: true },
  'Five Guys 芝士漢堡': { fried: true, heavy: true, fastFood: true, filling: true },
  'Five Guys 煙肉芝士漢堡': { fried: true, heavy: true, fastFood: true, filling: true },
  吉野家牛肉飯: { fastFood: true, filling: true },
  松屋牛肉朝定食: { fastFood: true, filling: true },
  松屋漢堡扒: { heavy: true, fastFood: true, filling: true },
  冰室常餐: { fastFood: true, filling: true },
  叉燒燒鵝飯: { fastFood: true, filling: true },
  蜜汁叉燒飯: { fastFood: true, filling: true },
  譚仔米線: { soupHot: true, fastFood: true, filling: true },
  車仔麵: { soupHot: true, fastFood: true, filling: true },
  鮮蝦雲吞麵: { soupHot: true, fastFood: true },

  // Fried / heavy
  炸魚薯條: { fried: true, heavy: true },
  英式炸魚薯條: { fried: true, heavy: true },
  天婦羅盛合: { fried: true, heavy: true },
  天婦羅烏冬: { fried: true, soupHot: true },
  吉列豬扒定食: { fried: true, heavy: true, filling: true },
  日式咖喱豬扒飯: { fried: true, heavy: true, filling: true },
  日式咖喱吉列豬扒飯: { fried: true, heavy: true, filling: true },
  韓式炸雞配年糕: { fried: true, heavy: true, spicy: true },
  蜂蜜蒜香韓式炸雞: { fried: true, heavy: true },
  脆皮生煎包: { fried: true, heavy: true },
  上海生煎包: { fried: true, heavy: true },
  上海排骨菜飯: { fried: true, filling: true },
  大排檔椒鹽鮮魷: { fried: true, heavy: true },
  椒鹽九肚魚: { fried: true, heavy: true },

  // Spicy
  酸菜魚鍋: { spicy: true, heavy: true, soupHot: true, comfy: true },
  酸菜魚配白飯: { spicy: true, heavy: true, soupHot: true },
  麻辣雞煲: { spicy: true, heavy: true, soupHot: true, comfy: true },
  經典部隊鍋: { spicy: true, heavy: true, soupHot: true, filling: true },
  泡菜豬肉豆腐鍋: { spicy: true, soupHot: true },
  泡菜牛肉石頭鍋飯: { spicy: true, filling: true },
  韓式辣炒豬肉飯: { spicy: true, filling: true },
  芝士辣雞麵: { spicy: true, heavy: true },
  冬蔭功大蝦湯河: { spicy: true, soupHot: true },
  冬蔭功海鮮鍋: { spicy: true, soupHot: true, comfy: true },
  星洲叻沙摻摻: { spicy: true, heavy: true, soupHot: true },
  麻婆豆腐飯: { spicy: true, filling: true },
  避風塘炒辣蟹: { spicy: true, heavy: true, comfy: true },

  // Soup / hotpot / light
  沙嗲牛打邊爐: { heavy: true, soupHot: true, comfy: true, filling: true },
  雞煲配肥牛: { heavy: true, soupHot: true, comfy: true, filling: true },
  和牛壽喜燒: { heavy: true, soupHot: true, comfy: true },
  豬骨湯拉麵: { heavy: true, soupHot: true, filling: true },
  濃厚豚骨拉麵: { heavy: true, soupHot: true, filling: true },
  越南生牛肉河粉: { soupHot: true, healthy: true },
  越南生牛肉湯河粉: { soupHot: true, healthy: true },
  讚岐湯烏冬: { soupHot: true, healthy: true },
  白粥油炸鬼: { soupHot: true, healthy: true },
  生滾及第粥: { soupHot: true, healthy: true },
  生滾魚片粥: { soupHot: true, healthy: true },
  皮蛋瘦肉粥: { soupHot: true, healthy: true },
  韓式人蔘雞湯: { soupHot: true, healthy: true },
  蔘雞湯配飯: { soupHot: true, healthy: true },
  花膠雞湯鍋: { soupHot: true, healthy: true, comfy: true },
  胡椒豬肚湯鍋: { soupHot: true, comfy: true },

  // Cold / healthy / comfy
  三文魚壽司拼盤: { cold: true, healthy: true, comfy: true },
  極上壽司刺身拼盤: { cold: true, healthy: true, comfy: true },
  海鮮刺身丼: { cold: true, healthy: true },
  海膽吞拿魚腩丼: { cold: true },
  韓式水冷麵: { cold: true },
  韓式醬油蟹: { cold: true, comfy: true },
  凱撒雞肉沙律: { cold: true, healthy: true },
  港式飲茶點心: { healthy: true, comfy: true },
  蝦餃燒賣點心: { healthy: true, comfy: true },
  清蒸海上鮮: { healthy: true, comfy: true },
  清蒸東星斑: { healthy: true, comfy: true },
  'All Day Breakfast': { comfy: true },
  卡邦尼意粉: { heavy: true, comfy: true, filling: true },
  拿坡里手工Pizza: { heavy: true, comfy: true },
  '拿坡里手工 Pizza': { heavy: true, comfy: true },
  '瑪格麗特 Pizza': { comfy: true },
  炭燒肉眼牛扒配薯條: { heavy: true, comfy: true, filling: true },
  香煎肉眼牛扒: { heavy: true, comfy: true, filling: true },
  炭火日式燒肉: { heavy: true, comfy: true, filling: true },
  韓式炭火五花肉燒烤: { heavy: true, comfy: true, filling: true },
  片皮鴨兩食: { comfy: true, filling: true },
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

export function normalizeFoodKey(name: string): string {
  return name.trim().toLowerCase();
}

export function computeFilteredWheelPool(
  members: {
    displayName: string;
    favoriteFoods: string[];
    todayFoods: string[];
    moodFilters: string[];
  }[],
  rejectedFoods: string[],
  recentMealsWithin7Days: string[] = [],
  allowRepeat7Days = false
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

  const rejectedSet = new Set(rejectedFoods.map(normalizeFoodKey));
  const recent7DaysSet = new Set(recentMealsWithin7Days.map(normalizeFoodKey));
  const candidates: WheelCandidate[] = [];
  const filteredOut: { name: string; reason: string }[] = [];

  for (const [name, info] of Object.entries(tally)) {
    const norm = normalizeFoodKey(name);

    if (!allowRepeat7Days && recent7DaysSet.has(norm)) {
      filteredOut.push({ name, reason: '7 日內食過，自動避開重複' });
      continue;
    }

    if (rejectedSet.has(norm)) {
      filteredOut.push({ name, reason: '剛才已否決' });
      continue;
    }

    const traits = FOOD_TRAITS[name] || {};
    const lower = name.toLowerCase();

    if (
      allMoods.has('less_fried') &&
      (traits.fried ||
        name.includes('炸') ||
        name.includes('薯條') ||
        name.includes('天婦羅') ||
        name.includes('吉列') ||
        lower.includes('fried'))
    ) {
      filteredOut.push({ name, reason: '少啲煎炸嘢' });
      continue;
    }

    if (
      allMoods.has('no_spicy') &&
      (traits.spicy || name.includes('辣') || name.includes('麻辣') || name.includes('酸菜魚'))
    ) {
      filteredOut.push({ name, reason: '今日唔食辣' });
      continue;
    }

    if (allMoods.has('light') && traits.heavy) {
      filteredOut.push({ name, reason: '食清淡啲' });
      continue;
    }

    if (allMoods.has('comfy_chat') && traits.fastFood) {
      filteredOut.push({ name, reason: '坐得舒服 / 啱傾計' });
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

export type HKRegionId = 'hk_island' | 'kowloon' | 'new_territories';

export interface HKDistrictDef {
  id: string;
  name: string;
  hint: string;
  region: HKRegionId;
  lat: number;
  lng: number;
}

export const HK_REGIONS: { id: HKRegionId; label: string }[] = [
  { id: 'hk_island', label: '香港島（4區）' },
  { id: 'kowloon', label: '九龍（5區）' },
  { id: 'new_territories', label: '新界及離島（9區）' },
];

export const HK_DISTRICTS: HKDistrictDef[] = [
  // 香港島 (4)
  { id: 'central_western', name: '中西區', hint: '中環・上環・西環', region: 'hk_island', lat: 22.2819, lng: 114.1582 },
  { id: 'wan_chai', name: '灣仔區', hint: '灣仔・銅鑼灣・天后', region: 'hk_island', lat: 22.2797, lng: 114.1786 },
  { id: 'eastern', name: '東區', hint: '北角・太古・柴灣', region: 'hk_island', lat: 22.2841, lng: 114.2241 },
  { id: 'southern', name: '南區', hint: '香港仔・黃竹坑・赤柱', region: 'hk_island', lat: 22.2476, lng: 114.1588 },

  // 九龍 (5)
  { id: 'yau_tsim_mong', name: '油尖旺區', hint: '尖沙咀・旺角・太子', region: 'kowloon', lat: 22.3095, lng: 114.1708 },
  { id: 'sham_shui_po', name: '深水埗區', hint: '深水埗・長沙灣・荔枝角', region: 'kowloon', lat: 22.3308, lng: 114.1622 },
  { id: 'kowloon_city', name: '九龍城區', hint: '九龍城・紅磡・土瓜灣', region: 'kowloon', lat: 22.3282, lng: 114.1915 },
  { id: 'wong_tai_sin', name: '黃大仙區', hint: '黃大仙・鑽石山・新蒲崗', region: 'kowloon', lat: 22.3418, lng: 114.1939 },
  { id: 'kwun_tong', name: '觀塘區', hint: '觀塘・九龍灣・藍田', region: 'kowloon', lat: 22.3121, lng: 114.2255 },

  // 新界及離島 (9)
  { id: 'tsuen_wan', name: '荃灣區', hint: '荃灣・荃灣西', region: 'new_territories', lat: 22.3713, lng: 114.1141 },
  { id: 'tuen_mun', name: '屯門區', hint: '屯門市中心・黃金海岸', region: 'new_territories', lat: 22.3908, lng: 113.9726 },
  { id: 'yuen_long', name: '元朗區', hint: '元朗・天水圍', region: 'new_territories', lat: 22.4445, lng: 114.0222 },
  { id: 'north', name: '北區', hint: '上水・粉嶺', region: 'new_territories', lat: 22.4947, lng: 114.1381 },
  { id: 'tai_po', name: '大埔區', hint: '大埔墟・太和', region: 'new_territories', lat: 22.4508, lng: 114.1642 },
  { id: 'sai_kung', name: '西貢區', hint: '將軍澳・坑口・西貢', region: 'new_territories', lat: 22.3455, lng: 114.2646 },
  { id: 'sha_tin', name: '沙田區', hint: '沙田・大圍・馬鞍山', region: 'new_territories', lat: 22.3817, lng: 114.1877 },
  { id: 'kwai_tsing', name: '葵青區', hint: '葵芳・青衣', region: 'new_territories', lat: 22.3549, lng: 114.1261 },
  { id: 'islands', name: '離島區', hint: '東涌・愉景灣・長洲', region: 'new_territories', lat: 22.2892, lng: 113.9412 },
];
