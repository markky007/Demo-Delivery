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
  { name: 'ไก่ทอด', icon: 'lunch_dining', keywords: ['ไก่ทอด'] },
  { name: 'เอ็นไก่ทอด', icon: 'lunch_dining', keywords: ['เอ็นไก่ทอด'] },
  { name: 'ปีกไก่', icon: 'lunch_dining', keywords: ['ปีกไก่', 'ปีกไก่ทอด'] },
  { name: 'หมูกรอบ', icon: 'bakery_dining', keywords: ['หมูกรอบ'] },
  { name: 'สามชั้น', icon: 'bakery_dining', keywords: ['สามชั้น', 'สามชั้นทอด'] },
  { name: 'หมูสับ', icon: 'restaurant', keywords: ['หมูสับ'] },
  { name: 'หมูชิ้น', icon: 'restaurant', keywords: ['หมูชิ้น', 'หมุชิ้น'] },
  { name: 'กุ้ง', icon: 'set_meal', keywords: ['กุ้ง'] },
  { name: 'ปลาหมึก', icon: 'set_meal', keywords: ['ปลาหมึก', 'หมึก'] },
  { name: 'ทะเล', icon: 'set_meal', keywords: ['ทะเล'] },
  { name: 'ไก่', icon: 'restaurant', keywords: ['ไก่'] },
  { name: 'กระดูกอ่อน', icon: 'restaurant', keywords: ['กระดูกอ่อน'] },
  { name: 'ไข่ดาว', icon: 'egg', keywords: ['ไข่ดาว'] },
  { name: 'ไข่เจียว', icon: 'egg', keywords: ['ไข่เจียว'] },
  { name: 'ไข่ข้น', icon: 'egg', keywords: ['ไข่ข้น'] },
  { name: 'ไข่เยี่ยวม้า', icon: 'egg', keywords: ['ไข่เยี่ยวม้า'] },
  { name: 'หมูยอ', icon: 'restaurant', keywords: ['หมูยอ'] },
  { name: 'วุ้นเส้น', icon: 'ramen_dining', keywords: ['วุ้นเส้น'] },
  { name: 'มาม่า', icon: 'ramen_dining', keywords: ['มาม่า'] },
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
  if (ingredientName.includes('ไก่')) return 'lunch_dining';
  if (ingredientName.includes('หมู')) return 'restaurant';
  if (ingredientName.includes('กุ้ง') || ingredientName.includes('ปลา') || ingredientName.includes('ทะเล'))
    return 'set_meal';
  if (ingredientName.includes('ไข่')) return 'egg';
  return 'inventory_2';
}
