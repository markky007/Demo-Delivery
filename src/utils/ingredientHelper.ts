/**
 * Helper utility for menu item main ingredients management.
 * Extracts, normalizes, and categorizes main ingredients from menu item names.
 */

import type { MenuItem } from 'src/types/database';

export interface IngredientGroupInfo {
  name: string;
  icon: string;
  itemIds: string[];
  totalCount: number;
  availableCount: number;
  isAllSoldOut: boolean;
  isAllAvailable: boolean;
}

export const STANDARD_INGREDIENTS = [
  {
    name: 'เอ็นไก่ทอด',
    icon: 'mdi-food-drumstick',
    keywords: ['เอ็นไก่ทอด', 'เอ็นข้อไก่ทอด', 'เอ็นไก่', 'เอ็นข้อไก่'],
  },
  { name: 'ปีกไก่', icon: 'mdi-food-drumstick', keywords: ['ปีกไก่ทอด', 'ปีกไก่'] },
  { name: 'ไก่ทอด', icon: 'mdi-food-drumstick', keywords: ['ไก่ทอด', 'ไก่กรอบ'] },
  { name: 'หมูกรอบ', icon: 'mdi-pig', keywords: ['หมูกรอบ'] },
  { name: 'สามชั้น', icon: 'mdi-pig', keywords: ['สามชั้นทอด', 'สามชั้น'] },
  { name: 'หมูทอด', icon: 'mdi-pig', keywords: ['หมูทอด'] },
  { name: 'หมูสับ', icon: 'mdi-pig', keywords: ['หมูสับ'] },
  { name: 'หมูชิ้น', icon: 'mdi-pig', keywords: ['หมูชิ้น', 'หมุชิ้น'] },
  { name: 'กระดูกอ่อน', icon: 'mdi-pig', keywords: ['กระดูกอ่อน', 'ซี่โครงอ่อน'] },
  {
    name: 'กุ้งทอด',
    icon: 'fa-solid fa-shrimp',
    keywords: ['กุ้งชุบแป้งทอด', 'กุ้งทอด', 'ทอดมันกุ้ง'],
  },
  {
    name: 'ปลาหมึกทอด',
    icon: 'fa-solid fa-fish',
    keywords: [
      'ปลาหมึกชุบแป้งทอด',
      'หมึกชุบแป้งทอด',
      'ปลาหมึกทอด',
      'หมึกทอด',
      'หนวดหมึกทอด',
      'หมึกวงทอด',
    ],
  },
  {
    name: 'ทะเลทอด',
    icon: 'fa-solid fa-fish',
    keywords: ['ทะเลชุบแป้งทอด', 'รวมมิตรทะเลทอด', 'ทะเลทอด', 'ซีฟู้ดทอด'],
  },
  { name: 'กุ้ง', icon: 'fa-solid fa-shrimp', keywords: ['กุ้ง', 'shrimp', 'prawn'] },
  { name: 'ปลาหมึก', icon: 'fa-solid fa-fish', keywords: ['ปลาหมึก', 'หมึก', 'squid'] },
  { name: 'ทะเล', icon: 'fa-solid fa-fish', keywords: ['ทะเล', 'ซีฟู้ด', 'seafood'] },
  {
    name: 'เนื้อ',
    icon: 'mdi-cow',
    keywords: ['เนื้อวัว', 'เนื้อสับ', 'เนื้อเปื่อย', 'เนื้อ', 'beef'],
  },
  { name: 'ไก่', icon: 'mdi-food-drumstick', keywords: ['ไก่', 'chicken'] },
  { name: 'หมูยอ', icon: 'mdi-pig', keywords: ['หมูยอ'] },
  { name: 'หมู', icon: 'mdi-pig', keywords: ['หมู', 'pork'] },
  { name: 'เต้าหู้', icon: 'mdi-food', keywords: ['เต้าหู้ไข่', 'เต้าหู้', 'tofu'] },
  { name: 'ไข่เยี่ยวม้า', icon: 'mdi-egg-fried', keywords: ['ไข่เยี่ยวม้า', 'century egg'] },
  { name: 'ไข่เค็ม', icon: 'mdi-egg-fried', keywords: ['ไข่เค็ม', 'salted egg'] },
  { name: 'ไข่ดาว', icon: 'mdi-egg-fried', keywords: ['ไข่ดาว', 'fried egg'] },
  { name: 'ไข่เจียว', icon: 'mdi-egg-fried', keywords: ['ไข่เจียว', 'omelet', 'omelette'] },
  { name: 'ไข่ข้น', icon: 'mdi-egg-fried', keywords: ['ไข่ข้น', 'creamy omelet'] },
  { name: 'ไข่ต้ม', icon: 'mdi-egg-fried', keywords: ['ไข่ต้ม', 'boiled egg'] },
  { name: 'ไข่ออนเซ็น', icon: 'mdi-egg-fried', keywords: ['ไข่ออนเซ็น', 'onsen egg'] },
  { name: 'ชีส', icon: 'mdi-cheese', keywords: ['ชีส', 'cheese'] },
  { name: 'วุ้นเส้น', icon: 'mdi-noodles', keywords: ['วุ้นเส้น', 'glass noodle'] },
  { name: 'มาม่า', icon: 'mdi-noodles', keywords: ['มาม่า', 'mama noodle'] },
];

/**
 * Pre-sorted list of keyword mappings by keyword length descending
 * to ensure specific compound terms (e.g. 'เอ็นไก่ทอด') match before generic substrings (e.g. 'ไก่ทอด', 'ไก่').
 */
const SORTED_KEYWORD_MAPPINGS = STANDARD_INGREDIENTS.flatMap((item) =>
  item.keywords.map((kw) => ({ keyword: kw, ingredient: item.name })),
).sort((a, b) => b.keyword.length - a.keyword.length);

/**
 * Infer or normalize the main ingredient of a menu item or option.
 * Prioritizes custom explicit ingredient, otherwise detects from name.
 */
export function inferMainIngredient(dishName: string, customIngredient?: string | null): string {
  if (customIngredient && customIngredient.trim()) {
    return customIngredient.trim();
  }

  const cleanName = (dishName || '').trim().toLowerCase();

  // Match known ingredients in priority order (longer keyword matches first)
  for (const mapping of SORTED_KEYWORD_MAPPINGS) {
    if (cleanName.includes(mapping.keyword.toLowerCase())) {
      return mapping.ingredient;
    }
  }

  return 'เมนูอื่นๆ / พื้นฐาน';
}

/**
 * Get icon for a given ingredient name.
 */
export function getIngredientIcon(ingredientName: string): string {
  const found = STANDARD_INGREDIENTS.find((i) => i.name === ingredientName);
  if (found) return found.icon;
  if (ingredientName.includes('ไก่')) return 'mdi-food-drumstick';
  if (ingredientName.includes('หมู') || ingredientName.includes('สามชั้น')) return 'mdi-pig';
  if (ingredientName.includes('กุ้ง')) return 'fa-solid fa-shrimp';
  if (ingredientName.includes('เนื้อ') || ingredientName.includes('วัว')) return 'mdi-cow';
  if (ingredientName.includes('เป็ด')) return 'mdi-duck';
  if (
    ingredientName.includes('ปลาหมึก') ||
    ingredientName.includes('หมึก') ||
    ingredientName.includes('ปลา') ||
    ingredientName.includes('ทะเล')
  )
    return 'fa-solid fa-fish';
  if (ingredientName.includes('ไข่')) return 'mdi-egg-fried';
  if (ingredientName.includes('ชีส')) return 'mdi-cheese';
  if (ingredientName.includes('เส้น') || ingredientName.includes('มาม่า')) return 'mdi-noodles';
  return 'inventory_2';
}

/**
 * Check whether an ingredient is currently available in the menu items list.
 * Returns false if there are menu items mapped to this ingredient and all of them are sold out.
 * Returns true if at least one item with this ingredient is available, or if no menu items use this ingredient.
 */
export function isIngredientAvailableInItems(
  ingredientName: string,
  items?: MenuItem[] | null,
): boolean {
  if (!ingredientName || ingredientName === 'เมนูอื่นๆ / พื้นฐาน') return true;
  if (!items || items.length === 0) return true;

  const matchingItems = items.filter(
    (item) => inferMainIngredient(item.name, item.main_ingredient) === ingredientName,
  );

  // If there are menu dishes with this ingredient, check if at least one is available
  if (matchingItems.length > 0) {
    return matchingItems.some((item) => item.is_available);
  }

  return true;
}

/**
 * Check whether an option is available, taking into account both its own `is_available` flag
 * and the availability of its inferred main ingredient from active menu items.
 */
export function isOptionAvailable(
  opt: { name: string; is_available?: boolean },
  items?: MenuItem[] | null,
): boolean {
  if (opt.is_available === false) return false;
  if (!items || items.length === 0) return opt.is_available ?? true;

  const ingredient = inferMainIngredient(opt.name);
  if (ingredient === 'เมนูอื่นๆ / พื้นฐาน') {
    return opt.is_available ?? true;
  }

  return isIngredientAvailableInItems(ingredient, items);
}
