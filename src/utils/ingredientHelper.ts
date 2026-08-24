/**
 * Helper utility for menu item main ingredients management.
 * Extracts, normalizes, and categorizes main ingredients from menu item names.
 */

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
  { name: 'ไก่ทอด', icon: 'mdi-food-drumstick', keywords: ['ไก่ทอด'] },
  { name: 'เอ็นไก่ทอด', icon: 'mdi-food-drumstick', keywords: ['เอ็นไก่ทอด', 'เอ็นข้อไก่ทอด'] },
  { name: 'ปีกไก่', icon: 'mdi-food-drumstick', keywords: ['ปีกไก่', 'ปีกไก่ทอด'] },
  { name: 'หมูกรอบ', icon: 'mdi-pig', keywords: ['หมูกรอบ'] },
  { name: 'สามชั้น', icon: 'mdi-pig', keywords: ['สามชั้น', 'สามชั้นทอด'] },
  { name: 'หมูสับ', icon: 'mdi-pig', keywords: ['หมูสับ'] },
  { name: 'หมูชิ้น', icon: 'mdi-pig', keywords: ['หมูชิ้น', 'หมุชิ้น'] },
  {
    name: 'กุ้งทอด',
    icon: 'fa-solid fa-shrimp',
    keywords: ['กุ้งทอด', 'กุ้งชุบแป้งทอด', 'ทอดมันกุ้ง'],
  },
  {
    name: 'ปลาหมึกทอด',
    icon: 'fa-solid fa-fish',
    keywords: [
      'ปลาหมึกทอด',
      'หมึกทอด',
      'หมึกชุบแป้งทอด',
      'ปลาหมึกชุบแป้งทอด',
      'หนวดหมึกทอด',
      'หมึกวงทอด',
    ],
  },
  {
    name: 'ทะเลทอด',
    icon: 'fa-solid fa-fish',
    keywords: ['ทะเลทอด', 'ซีฟู้ดทอด', 'ทะเลชุบแป้งทอด', 'รวมมิตรทะเลทอด'],
  },
  { name: 'กุ้ง', icon: 'fa-solid fa-shrimp', keywords: ['กุ้ง'] },
  { name: 'ปลาหมึก', icon: 'fa-solid fa-fish', keywords: ['ปลาหมึก', 'หมึก'] },
  { name: 'ทะเล', icon: 'fa-solid fa-fish', keywords: ['ทะเล', 'ซีฟู้ด'] },
  { name: 'ไก่', icon: 'mdi-food-drumstick', keywords: ['ไก่'] },
  { name: 'หมูทอด', icon: 'mdi-pig', keywords: ['หมูทอด'] },
  { name: 'กระดูกอ่อน', icon: 'mdi-pig', keywords: ['กระดูกอ่อน'] },
  { name: 'ไข่ดาว', icon: 'mdi-egg-fried', keywords: ['ไข่ดาว'] },
  { name: 'ไข่เจียว', icon: 'mdi-egg-fried', keywords: ['ไข่เจียว'] },
  { name: 'ไข่ข้น', icon: 'mdi-egg-fried', keywords: ['ไข่ข้น'] },
  { name: 'ไข่เยี่ยวม้า', icon: 'mdi-egg-fried', keywords: ['ไข่เยี่ยวม้า'] },
  { name: 'หมูยอ', icon: 'mdi-pig', keywords: ['หมูยอ'] },
  { name: 'วุ้นเส้น', icon: 'mdi-noodles', keywords: ['วุ้นเส้น'] },
  { name: 'มาม่า', icon: 'mdi-noodles', keywords: ['มาม่า'] },
];

/**
 * Infer or normalize the main ingredient of a menu item.
 * Prioritizes custom explicit ingredient, otherwise detects from dish name.
 */
export function inferMainIngredient(dishName: string, customIngredient?: string | null): string {
  if (customIngredient && customIngredient.trim()) {
    return customIngredient.trim();
  }

  const cleanName = dishName.trim();

  // Try matching known ingredients in priority order (longer names first)
  for (const item of STANDARD_INGREDIENTS) {
    for (const kw of item.keywords) {
      if (cleanName.includes(kw)) {
        return item.name;
      }
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
  if (ingredientName.includes('เส้น') || ingredientName.includes('มาม่า')) return 'mdi-noodles';
  return 'inventory_2';
}
