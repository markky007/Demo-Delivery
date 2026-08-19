-- ============================================================================
-- Migration 00010: Takeaway QR Code & Universal Dining Options (ทานที่ร้าน / สั่งกลับบ้าน)
-- ============================================================================

-- 1. Create or ensure Takeaway table exists for each restaurant
DO $$
DECLARE
  r RECORD;
  v_table_id UUID;
  v_token TEXT;
  v_group_id UUID;
  v_opt_dinein_id UUID;
  v_opt_takeaway_id UUID;
  m RECORD;
BEGIN
  -- Loop through restaurants
  FOR r IN SELECT id FROM restaurants
  LOOP
    -- 1.1 Ensure 'สั่งกลับบ้าน' (Takeaway) table exists
    SELECT id INTO v_table_id
    FROM tables
    WHERE restaurant_id = r.id AND name = 'สั่งกลับบ้าน';

    IF v_table_id IS NULL THEN
      INSERT INTO tables (
        restaurant_id,
        name,
        sort_order,
        is_active
      ) VALUES (
        r.id,
        'สั่งกลับบ้าน',
        0,
        true
      ) RETURNING id INTO v_table_id;
    END IF;

    -- Ensure active permanent QR token exists for this Takeaway table
    IF NOT EXISTS (SELECT 1 FROM table_qr_tokens WHERE table_id = v_table_id AND is_active = true) THEN
      v_token := 'takeaway_' || substring(md5(random()::text) from 1 for 8);
      INSERT INTO table_qr_tokens (
        table_id,
        public_token,
        is_active,
        generated_at,
        expires_at
      ) VALUES (
        v_table_id,
        v_token,
        true,
        NOW(),
        NULL
      );
    END IF;

    -- 1.2 Create or ensure Universal Option Group 'รูปแบบการทาน' (Dining Option)
    SELECT id INTO v_group_id
    FROM option_groups
    WHERE restaurant_id = r.id AND (name = 'รูปแบบการทาน' OR name = 'ทานที่ร้าน / กลับบ้าน');

    IF v_group_id IS NULL THEN
      INSERT INTO option_groups (
        restaurant_id,
        name,
        is_required,
        selection_type,
        min_selections,
        max_selections,
        sort_order,
        is_active
      ) VALUES (
        r.id,
        'รูปแบบการทาน',
        true,
        'single',
        1,
        1,
        0,
        true
      ) RETURNING id INTO v_group_id;
    ELSE
      UPDATE option_groups
      SET is_required = true,
          selection_type = 'single',
          min_selections = 1,
          max_selections = 1,
          sort_order = 0,
          is_active = true
      WHERE id = v_group_id;
    END IF;

    -- 1.3 Ensure Option 'ทานที่ร้าน' (Dine-in)
    SELECT id INTO v_opt_dinein_id
    FROM options
    WHERE option_group_id = v_group_id AND name = 'ทานที่ร้าน';

    IF v_opt_dinein_id IS NULL THEN
      INSERT INTO options (
        option_group_id,
        name,
        price_adjustment,
        sort_order,
        is_active,
        is_available
      ) VALUES (
        v_group_id,
        'ทานที่ร้าน',
        0,
        1,
        true,
        true
      );
    END IF;

    -- 1.4 Ensure Option 'สั่งกลับบ้าน' (Takeaway)
    SELECT id INTO v_opt_takeaway_id
    FROM options
    WHERE option_group_id = v_group_id AND (name = 'สั่งกลับบ้าน' OR name = 'กลับบ้าน');

    IF v_opt_takeaway_id IS NULL THEN
      INSERT INTO options (
        option_group_id,
        name,
        price_adjustment,
        sort_order,
        is_active,
        is_available
      ) VALUES (
        v_group_id,
        'สั่งกลับบ้าน',
        0,
        2,
        true,
        true
      );
    END IF;

    -- 1.5 Link this Option Group to ALL existing menu items of this restaurant
    FOR m IN SELECT mi.id FROM menu_items mi
             JOIN menu_categories mc ON mc.id = mi.category_id
             WHERE mc.restaurant_id = r.id
    LOOP
      IF NOT EXISTS (SELECT 1 FROM menu_item_option_groups WHERE menu_item_id = m.id AND option_group_id = v_group_id) THEN
        INSERT INTO menu_item_option_groups (
          menu_item_id,
          option_group_id,
          sort_order
        ) VALUES (
          m.id,
          v_group_id,
          0
        );
      END IF;
    END LOOP;

  END LOOP;
END;
$$;
