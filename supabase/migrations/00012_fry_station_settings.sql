-- ============================================================================
-- Migration 00012: Fry Station Quality of Life Settings
-- ============================================================================

-- 1. Add fry_config column to menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS fry_config JSONB DEFAULT NULL;

-- 2. Add fry_config column to options
ALTER TABLE options
  ADD COLUMN IF NOT EXISTS fry_config JSONB DEFAULT NULL;

-- 3. Populate fry_config for existing menu items based on menu naming patterns

-- 3.1. ไก่ทอด (Chicken Fry)
UPDATE menu_items
SET fry_config = jsonb_build_object(
  'is_fried', true,
  'fry_name', 'ไก่ทอด',
  'fry_qty', 1,
  'special_fry_name', 'ไก่ทอดพิเศษ',
  'special_fry_qty', 1
)
WHERE name LIKE '%ไก่ทอด%'
  AND name NOT LIKE '%เอ็นไก่ทอด%'
  AND name NOT LIKE '%ปีกไก่ทอด%';

-- 3.2. เอ็นไก่ทอด (Chicken Tendon Fry)
UPDATE menu_items
SET fry_config = jsonb_build_object(
  'is_fried', true,
  'fry_name', 'เอ็นไก่ทอด',
  'fry_qty', 1,
  'special_fry_name', 'เอ็นไก่ทอดพิเศษ',
  'special_fry_qty', 1
)
WHERE name LIKE '%เอ็นไก่ทอด%';

-- 3.3. ปีกไก่ทอด (Chicken Wings Fry)
UPDATE menu_items
SET fry_config = jsonb_build_object(
  'is_fried', true,
  'fry_name', 'ปีกไก่ทอด (3 ปีก)',
  'fry_qty', 1,
  'special_fry_name', 'ปีกไก่ทอดพิเศษ (4 ปีก)',
  'special_fry_qty', 1
)
WHERE name LIKE '%ปีกไก่%';

-- 3.4. สามชั้นทอด (Pork Belly Fry)
UPDATE menu_items
SET fry_config = jsonb_build_object(
  'is_fried', true,
  'fry_name', 'สามชั้นทอด',
  'fry_qty', 1,
  'special_fry_name', 'สามชั้นทอดพิเศษ',
  'special_fry_qty', 1
)
WHERE name LIKE '%สามชั้น%';

-- 4. Populate fry_config for existing options (เนื้อสัตว์เพิ่มเติมที่เป็นของทอด)
UPDATE options
SET fry_config = jsonb_build_object(
  'is_fried', true,
  'fry_name', name,
  'fry_qty', 1
)
WHERE name LIKE '%ไก่ทอด%'
   OR name LIKE '%สามชั้นทอด%'
   OR name LIKE '%ปีกไก่%';
