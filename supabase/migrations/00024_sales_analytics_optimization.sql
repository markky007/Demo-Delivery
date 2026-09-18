-- ============================================================================
-- Migration 00024: Sales Analytics & History Performance Optimization
-- ============================================================================
-- Optimized for zero deadlock risk & connection pooler (Supavisor) compatibility:
-- Uses pure in-memory CTEs (Common Table Expressions) instead of CREATE TEMP TABLE.
-- ============================================================================

-- ─── 1. Server-Side Sales Analytics Aggregation Function ──────────────────

CREATE OR REPLACE FUNCTION get_sales_analytics(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_day_filter TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_day_filter TEXT;
  v_total_calendar_days INTEGER;
  v_total_sales NUMERIC := 0;
  v_total_bills INTEGER := 0;
  v_total_dishes INTEGER := 0;
  v_active_days INTEGER := 0;
  v_avg_daily_sales INTEGER := 0;
  v_avg_bill_value INTEGER := 0;
  v_avg_dishes_per_bill NUMERIC := 0;
  v_kpis JSONB;
  v_day_of_week_data JSONB;
  v_weekday_avg NUMERIC := 0;
  v_weekend_avg NUMERIC := 0;
  v_diff_pct INTEGER := 0;
  v_higher_type TEXT := 'equal';
  v_best_day JSONB := 'null'::jsonb;
  v_hourly_data JSONB;
  v_peak_hour JSONB := 'null'::jsonb;
  v_meal_periods JSONB;
  v_top_selling JSONB;
  v_drinks JSONB;
  v_slow_moving JSONB;
  v_zero_sales JSONB;
  v_categories JSONB;
  v_top_addons JSONB;
  v_dining_summary JSONB;
  v_insights JSONB := '[]'::jsonb;
  v_top_item_name TEXT;
  v_top_item_sales NUMERIC;
  v_top_item_qty INTEGER;
  v_top_item_share NUMERIC;
  v_peak_hour_label TEXT;
  v_peak_hour_orders NUMERIC;
  v_peak_hour_sales NUMERIC;
  v_best_day_name TEXT;
  v_best_day_sales NUMERIC;
  v_lowest_day_name TEXT;
  v_lowest_day_sales NUMERIC;
  v_dead_stock_count INTEGER := 0;
  v_top_addon_name TEXT;
  v_top_addon_count INTEGER;
  v_top_addon_rev NUMERIC;
BEGIN
  -- Default dates if not provided
  v_start := COALESCE(p_start_date, '2020-01-01 00:00:00+07'::TIMESTAMPTZ);
  v_end := COALESCE(p_end_date, NOW());
  v_day_filter := LOWER(COALESCE(p_day_filter, 'all'));

  -- Total distinct calendar days in the date range
  SELECT GREATEST(1, (DATE(v_end AT TIME ZONE 'Asia/Bangkok') - DATE(v_start AT TIME ZONE 'Asia/Bangkok') + 1))
  INTO v_total_calendar_days;

  -- ── 1. Calculate KPIs & Dining Type from Bills ──
  WITH fb AS (
    SELECT
      b.id,
      b.total_amount,
      (b.paid_at AT TIME ZONE 'Asia/Bangkok') AS local_paid_at,
      t.name AS table_name
    FROM bills b
    LEFT JOIN table_sessions ts ON ts.id = b.table_session_id
    LEFT JOIN tables t ON t.id = ts.table_id
    WHERE b.status = 'PAID'
      AND b.paid_at >= v_start
      AND b.paid_at <= v_end
      AND (
        v_day_filter = 'all'
        OR (v_day_filter = 'mon' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 1)
        OR (v_day_filter = 'tue' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 2)
        OR (v_day_filter = 'wed' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 3)
        OR (v_day_filter = 'thu' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 4)
        OR (v_day_filter = 'fri' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 5)
        OR (v_day_filter = 'sat' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 6)
        OR (v_day_filter = 'sun' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 0)
        OR (v_day_filter = 'weekdays' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) BETWEEN 1 AND 4)
        OR (v_day_filter = 'weekends' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) IN (5, 6))
      )
  )
  SELECT
    COALESCE(SUM(total_amount), 0),
    COUNT(*),
    COUNT(DISTINCT DATE(local_paid_at)),
    jsonb_build_object(
      'dineInBills', COUNT(CASE WHEN NOT (table_name ILIKE '%กลับบ้าน%' OR table_name ILIKE '%takeaway%') THEN 1 END),
      'dineInSales', COALESCE(SUM(CASE WHEN NOT (table_name ILIKE '%กลับบ้าน%' OR table_name ILIKE '%takeaway%') THEN total_amount ELSE 0 END), 0),
      'takeawayBills', COUNT(CASE WHEN table_name ILIKE '%กลับบ้าน%' OR table_name ILIKE '%takeaway%' THEN 1 END),
      'takeawaySales', COALESCE(SUM(CASE WHEN table_name ILIKE '%กลับบ้าน%' OR table_name ILIKE '%takeaway%' THEN total_amount ELSE 0 END), 0),
      'dineInPercentage', CASE WHEN COALESCE(SUM(total_amount), 0) > 0 THEN ROUND((COALESCE(SUM(CASE WHEN NOT (table_name ILIKE '%กลับบ้าน%' OR table_name ILIKE '%takeaway%') THEN total_amount ELSE 0 END), 0)::NUMERIC / COALESCE(SUM(total_amount), 1)) * 100, 1) ELSE 0 END,
      'takeawayPercentage', CASE WHEN COALESCE(SUM(total_amount), 0) > 0 THEN ROUND((COALESCE(SUM(CASE WHEN table_name ILIKE '%กลับบ้าน%' OR table_name ILIKE '%takeaway%' THEN total_amount ELSE 0 END), 0)::NUMERIC / COALESCE(SUM(total_amount), 1)) * 100, 1) ELSE 0 END
    )
  INTO v_total_sales, v_total_bills, v_active_days, v_dining_summary
  FROM fb;

  -- ── 2. Total Dishes from Order Items ──
  SELECT COALESCE(SUM(oi.quantity), 0)
  INTO v_total_dishes
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.created_at >= v_start
    AND o.created_at <= v_end
    AND (
      v_day_filter = 'all'
      OR (v_day_filter = 'mon' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 1)
      OR (v_day_filter = 'tue' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 2)
      OR (v_day_filter = 'wed' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 3)
      OR (v_day_filter = 'thu' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 4)
      OR (v_day_filter = 'fri' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 5)
      OR (v_day_filter = 'sat' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 6)
      OR (v_day_filter = 'sun' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 0)
      OR (v_day_filter = 'weekdays' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) BETWEEN 1 AND 4)
      OR (v_day_filter = 'weekends' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) IN (5, 6))
    );

  IF v_active_days > 0 THEN
    v_avg_daily_sales := ROUND(v_total_sales / v_active_days);
  END IF;

  IF v_total_bills > 0 THEN
    v_avg_bill_value := ROUND(v_total_sales / v_total_bills);
    v_avg_dishes_per_bill := ROUND((v_total_dishes::NUMERIC / v_total_bills), 1);
  END IF;

  -- ── 3. Day of Week Breakdown (จันทร์-เสาร์ และ อาทิตย์) ──
  WITH dow_consts AS (
    SELECT * FROM (VALUES
      (1, 'วันจันทร์', 'จันทร์', 1),
      (2, 'วันอังคาร', 'อังคาร', 2),
      (3, 'วันพุธ', 'พุธ', 3),
      (4, 'วันพฤหัสบดี', 'พฤหัส', 4),
      (5, 'วันศุกร์', 'ศุกร์', 5),
      (6, 'วันเสาร์', 'เสาร์', 6),
      (0, 'วันอาทิตย์', 'อาทิตย์', 7)
    ) AS t(day_idx, day_name, short_name, sort_order)
  ),
  dow_bills AS (
    SELECT
      EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok'))::INTEGER AS dow,
      COALESCE(SUM(total_amount), 0) AS sales,
      COUNT(*) AS bills,
      COUNT(DISTINCT DATE(paid_at AT TIME ZONE 'Asia/Bangkok')) AS days_count
    FROM bills
    WHERE status = 'PAID'
      AND paid_at >= v_start
      AND paid_at <= v_end
      AND (
        v_day_filter = 'all'
        OR (v_day_filter = 'mon' AND EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok')) = 1)
        OR (v_day_filter = 'tue' AND EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok')) = 2)
        OR (v_day_filter = 'wed' AND EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok')) = 3)
        OR (v_day_filter = 'thu' AND EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok')) = 4)
        OR (v_day_filter = 'fri' AND EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok')) = 5)
        OR (v_day_filter = 'sat' AND EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok')) = 6)
        OR (v_day_filter = 'sun' AND EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok')) = 0)
        OR (v_day_filter = 'weekdays' AND EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok')) BETWEEN 1 AND 4)
        OR (v_day_filter = 'weekends' AND EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok')) IN (5, 6))
      )
    GROUP BY 1
  ),
  dow_orders AS (
    SELECT
      EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok'))::INTEGER AS dow,
      COUNT(*) AS orders
    FROM orders
    WHERE created_at >= v_start
      AND created_at <= v_end
      AND (
        v_day_filter = 'all'
        OR (v_day_filter = 'mon' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 1)
        OR (v_day_filter = 'tue' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 2)
        OR (v_day_filter = 'wed' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 3)
        OR (v_day_filter = 'thu' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 4)
        OR (v_day_filter = 'fri' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 5)
        OR (v_day_filter = 'sat' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 6)
        OR (v_day_filter = 'sun' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 0)
        OR (v_day_filter = 'weekdays' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) BETWEEN 1 AND 4)
        OR (v_day_filter = 'weekends' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) IN (5, 6))
      )
    GROUP BY 1
  ),
  dow_combined AS (
    SELECT
      c.day_idx,
      c.day_name,
      c.short_name,
      c.sort_order,
      COALESCE(b.sales, 0) AS total_sales,
      COALESCE(b.bills, 0) AS bill_count,
      COALESCE(b.days_count, 0) AS days_count,
      COALESCE(o.orders, 0) AS total_orders,
      CASE WHEN COALESCE(b.days_count, 0) > 0 THEN ROUND(COALESCE(b.sales, 0) / b.days_count) ELSE 0 END AS avg_sales,
      CASE WHEN COALESCE(b.days_count, 0) > 0 THEN ROUND(COALESCE(o.orders, 0) / b.days_count) ELSE 0 END AS avg_orders,
      CASE WHEN v_total_sales > 0 THEN ROUND((COALESCE(b.sales, 0)::NUMERIC / v_total_sales) * 100, 1) ELSE 0 END AS sales_pct
    FROM dow_consts c
    LEFT JOIN dow_bills b ON b.dow = c.day_idx
    LEFT JOIN dow_orders o ON o.dow = c.day_idx
    ORDER BY c.sort_order
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'dayIndex', day_idx,
      'dayName', day_name,
      'shortName', short_name,
      'totalSales', total_sales,
      'avgSales', avg_sales,
      'totalOrders', total_orders,
      'avgOrders', avg_orders,
      'billCount', bill_count,
      'salesPercentage', sales_pct,
      'daysCount', days_count
    )
  )
  INTO v_day_of_week_data
  FROM dow_combined;

  -- Best selling day
  SELECT jsonb_build_object('dayName', day_name, 'avgSales', avg_sales), day_name, avg_sales
  INTO v_best_day, v_best_day_name, v_best_day_sales
  FROM (
    SELECT
      c.day_name,
      CASE WHEN COALESCE(b.days_count, 0) > 0 THEN ROUND(COALESCE(b.sales, 0) / b.days_count) ELSE 0 END AS avg_sales
    FROM (VALUES (1, 'วันจันทร์'), (2, 'วันอังคาร'), (3, 'วันพุธ'), (4, 'วันพฤหัสบดี'), (5, 'วันศุกร์'), (6, 'วันเสาร์')) AS c(day_idx, day_name)
    JOIN (
      SELECT
        EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok'))::INTEGER AS dow,
        SUM(total_amount) AS sales,
        COUNT(DISTINCT DATE(paid_at AT TIME ZONE 'Asia/Bangkok')) AS days_count
      FROM bills
      WHERE status = 'PAID' AND paid_at >= v_start AND paid_at <= v_end
      GROUP BY 1
    ) b ON b.dow = c.day_idx
    WHERE b.days_count > 0 AND b.sales > 0
    ORDER BY avg_sales DESC
    LIMIT 1
  ) top_d;

  -- Lowest day for insights
  SELECT day_name, avg_sales
  INTO v_lowest_day_name, v_lowest_day_sales
  FROM (
    SELECT
      c.day_name,
      CASE WHEN COALESCE(b.days_count, 0) > 0 THEN ROUND(COALESCE(b.sales, 0) / b.days_count) ELSE 0 END AS avg_sales
    FROM (VALUES (1, 'วันจันทร์'), (2, 'วันอังคาร'), (3, 'วันพุธ'), (4, 'วันพฤหัสบดี'), (5, 'วันศุกร์'), (6, 'วันเสาร์')) AS c(day_idx, day_name)
    JOIN (
      SELECT
        EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok'))::INTEGER AS dow,
        SUM(total_amount) AS sales,
        COUNT(DISTINCT DATE(paid_at AT TIME ZONE 'Asia/Bangkok')) AS days_count
      FROM bills
      WHERE status = 'PAID' AND paid_at >= v_start AND paid_at <= v_end
      GROUP BY 1
    ) b ON b.dow = c.day_idx
    WHERE b.days_count > 0
    ORDER BY avg_sales ASC
    LIMIT 1
  ) low_d;

  -- Weekday vs Weekend
  SELECT
    COALESCE(AVG(avg_sales), 0)
  INTO v_weekday_avg
  FROM (
    SELECT CASE WHEN COUNT(DISTINCT DATE(paid_at AT TIME ZONE 'Asia/Bangkok')) > 0 THEN SUM(total_amount) / COUNT(DISTINCT DATE(paid_at AT TIME ZONE 'Asia/Bangkok')) ELSE 0 END AS avg_sales
    FROM bills
    WHERE status = 'PAID' AND paid_at >= v_start AND paid_at <= v_end
      AND EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok')) BETWEEN 1 AND 4
    GROUP BY EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok'))
  ) wd;

  SELECT
    COALESCE(AVG(avg_sales), 0)
  INTO v_weekend_avg
  FROM (
    SELECT CASE WHEN COUNT(DISTINCT DATE(paid_at AT TIME ZONE 'Asia/Bangkok')) > 0 THEN SUM(total_amount) / COUNT(DISTINCT DATE(paid_at AT TIME ZONE 'Asia/Bangkok')) ELSE 0 END AS avg_sales
    FROM bills
    WHERE status = 'PAID' AND paid_at >= v_start AND paid_at <= v_end
      AND EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok')) IN (5, 6)
    GROUP BY EXTRACT(DOW FROM (paid_at AT TIME ZONE 'Asia/Bangkok'))
  ) we;

  IF v_weekend_avg > v_weekday_avg AND v_weekday_avg > 0 THEN
    v_diff_pct := ROUND(((v_weekend_avg - v_weekday_avg) / v_weekday_avg) * 100);
    v_higher_type := 'weekend';
  ELSIF v_weekday_avg > v_weekend_avg AND v_weekend_avg > 0 THEN
    v_diff_pct := ROUND(((v_weekday_avg - v_weekend_avg) / v_weekend_avg) * 100);
    v_higher_type := 'weekday';
  END IF;

  -- ── 4. Hourly & Peak Times (11:00 - 23:00) ──
  WITH hours_range AS (
    SELECT generate_series(11, 23) AS h
  ),
  matched_orders AS (
    SELECT
      id,
      total_amount,
      EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Asia/Bangkok'))::INTEGER AS order_hour
    FROM orders
    WHERE created_at >= v_start
      AND created_at <= v_end
      AND (
        v_day_filter = 'all'
        OR (v_day_filter = 'mon' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 1)
        OR (v_day_filter = 'tue' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 2)
        OR (v_day_filter = 'wed' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 3)
        OR (v_day_filter = 'thu' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 4)
        OR (v_day_filter = 'fri' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 5)
        OR (v_day_filter = 'sat' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 6)
        OR (v_day_filter = 'sun' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 0)
        OR (v_day_filter = 'weekdays' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) BETWEEN 1 AND 4)
        OR (v_day_filter = 'weekends' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) IN (5, 6))
      )
  ),
  hourly_agg AS (
    SELECT
      hr.h AS hour_num,
      TO_CHAR(hr.h, 'FM00') || ':00' AS hour_label,
      COALESCE(COUNT(mo.id), 0) AS order_count,
      COALESCE(SUM(mo.total_amount), 0) AS total_sales
    FROM hours_range hr
    LEFT JOIN matched_orders mo ON mo.order_hour = hr.h
    GROUP BY hr.h
    ORDER BY hr.h
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'hour', hour_num,
      'label', hour_label,
      'orderCount', order_count,
      'totalSales', total_sales,
      'avgSalesPerHour', ROUND(total_sales::NUMERIC / v_total_calendar_days),
      'avgOrdersPerHour', ROUND(order_count::NUMERIC / v_total_calendar_days)
    )
  )
  INTO v_hourly_data
  FROM hourly_agg;

  -- Peak Hour
  SELECT
    jsonb_build_object(
      'label', hour_label || ' - ' || TO_CHAR((hour_num + 1) % 24, 'FM00') || ':00 น.',
      'avgOrders', ROUND(order_count::NUMERIC / v_total_calendar_days),
      'avgSales', ROUND(total_sales::NUMERIC / v_total_calendar_days)
    ),
    hour_label || ' - ' || TO_CHAR((hour_num + 1) % 24, 'FM00') || ':00 น.',
    ROUND(order_count::NUMERIC / v_total_calendar_days),
    ROUND(total_sales::NUMERIC / v_total_calendar_days)
  INTO v_peak_hour, v_peak_hour_label, v_peak_hour_orders, v_peak_hour_sales
  FROM (
    SELECT
      EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Asia/Bangkok'))::INTEGER AS hour_num,
      TO_CHAR(EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Asia/Bangkok'))::INTEGER, 'FM00') || ':00' AS hour_label,
      COUNT(id) AS order_count,
      SUM(total_amount) AS total_sales
    FROM orders
    WHERE created_at >= v_start AND created_at <= v_end
      AND (
        v_day_filter = 'all'
        OR (v_day_filter = 'mon' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 1)
        OR (v_day_filter = 'tue' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 2)
        OR (v_day_filter = 'wed' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 3)
        OR (v_day_filter = 'thu' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 4)
        OR (v_day_filter = 'fri' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 5)
        OR (v_day_filter = 'sat' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 6)
        OR (v_day_filter = 'sun' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 0)
        OR (v_day_filter = 'weekdays' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) BETWEEN 1 AND 4)
        OR (v_day_filter = 'weekends' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) IN (5, 6))
      )
    GROUP BY 1, 2
    ORDER BY total_sales DESC
    LIMIT 1
  ) pk;

  -- ── 5. Meal Periods Breakdown ──
  WITH meal_defs AS (
    SELECT * FROM (VALUES
      ('lunch', 'มื้อเที่ยง', '11:00 - 14:00 น.', 'lunch_dining', ARRAY[11, 12, 13], 1),
      ('afternoon', 'มื้อบ่าย / ของว่าง', '14:00 - 17:00 น.', 'local_cafe', ARRAY[14, 15, 16], 2),
      ('dinner', 'มื้อเย็น / ค่ำ', '17:00 - 21:00 น.', 'dinner_dining', ARRAY[17, 18, 19, 20], 3),
      ('late', 'มื้อดึก', '21:00 - 24:00 น.', 'nights_stay', ARRAY[21, 22, 23], 4)
    ) AS m(period_key, title, time_range, icon, hours_arr, sort_order)
  ),
  matched_orders AS (
    SELECT
      id,
      total_amount,
      EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Asia/Bangkok'))::INTEGER AS order_hour
    FROM orders
    WHERE created_at >= v_start AND created_at <= v_end
      AND (
        v_day_filter = 'all'
        OR (v_day_filter = 'mon' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 1)
        OR (v_day_filter = 'tue' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 2)
        OR (v_day_filter = 'wed' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 3)
        OR (v_day_filter = 'thu' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 4)
        OR (v_day_filter = 'fri' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 5)
        OR (v_day_filter = 'sat' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 6)
        OR (v_day_filter = 'sun' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) = 0)
        OR (v_day_filter = 'weekdays' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) BETWEEN 1 AND 4)
        OR (v_day_filter = 'weekends' AND EXTRACT(DOW FROM (created_at AT TIME ZONE 'Asia/Bangkok')) IN (5, 6))
      )
  ),
  meal_calcs AS (
    SELECT
      m.period_key,
      m.title,
      m.time_range,
      m.icon,
      m.sort_order,
      COALESCE(SUM(mo.total_amount), 0) AS total_sales,
      COALESCE(COUNT(mo.id), 0) AS order_count
    FROM meal_defs m
    LEFT JOIN matched_orders mo ON mo.order_hour = ANY(m.hours_arr)
    GROUP BY m.period_key, m.title, m.time_range, m.icon, m.sort_order
    ORDER BY m.sort_order
  ),
  meal_sum AS (
    SELECT GREATEST(1, SUM(total_sales)) AS all_meal_sales FROM meal_calcs
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'periodKey', c.period_key,
      'title', c.title,
      'timeRange', c.time_range,
      'icon', c.icon,
      'totalSales', c.total_sales,
      'salesPercentage', ROUND((c.total_sales::NUMERIC / s.all_meal_sales) * 100, 1),
      'orderCount', c.order_count
    )
  )
  INTO v_meal_periods
  FROM meal_calcs c, meal_sum s;

  -- ── 6. Menu Items Performance ──
  WITH matched_items AS (
    SELECT
      oi.id,
      oi.menu_item_id,
      oi.snapshot_name,
      oi.snapshot_base_price,
      oi.quantity,
      oi.subtotal,
      DATE(oi.created_at AT TIME ZONE 'Asia/Bangkok') AS order_date,
      COALESCE(m.name, oi.snapshot_name) AS resolved_name,
      COALESCE(mc.name, 'เมนูทั่วไป') AS resolved_category,
      COALESCE(mc.id::TEXT, 'general') AS resolved_category_id,
      m.base_price AS menu_base_price,
      CASE
        WHEN mc.name = 'เครื่องดื่ม'
          OR oi.snapshot_name ILIKE '%น้ำขวด%'
          OR oi.snapshot_name ILIKE '%น้ำเปล่า%'
          OR oi.snapshot_name ILIKE '%น้ำกระป๋อง%'
          OR oi.snapshot_name ILIKE '%น้ำอัดลม%'
          OR oi.snapshot_name ILIKE '%กระป๋อง%'
          OR oi.snapshot_name ILIKE '%เครื่องดื่ม%'
        THEN TRUE
        ELSE FALSE
      END AS is_drink
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN menu_items m ON m.id = oi.menu_item_id
    LEFT JOIN menu_categories mc ON mc.id = m.category_id
    WHERE o.created_at >= v_start AND o.created_at <= v_end
      AND (
        v_day_filter = 'all'
        OR (v_day_filter = 'mon' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 1)
        OR (v_day_filter = 'tue' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 2)
        OR (v_day_filter = 'wed' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 3)
        OR (v_day_filter = 'thu' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 4)
        OR (v_day_filter = 'fri' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 5)
        OR (v_day_filter = 'sat' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 6)
        OR (v_day_filter = 'sun' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 0)
        OR (v_day_filter = 'weekdays' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) BETWEEN 1 AND 4)
        OR (v_day_filter = 'weekends' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) IN (5, 6))
      )
  ),
  item_aggregated AS (
    SELECT
      COALESCE(oi.menu_item_id::TEXT, oi.snapshot_name) AS item_key,
      MAX(oi.resolved_name) AS name,
      MAX(CASE WHEN oi.is_drink THEN 'เครื่องดื่ม' ELSE oi.resolved_category END) AS category_name,
      MAX(COALESCE(oi.menu_base_price, oi.snapshot_base_price, 0)) AS base_price,
      SUM(oi.quantity) AS quantity_sold,
      SUM(oi.subtotal) AS total_revenue,
      COUNT(DISTINCT oi.order_date) AS days_with_sales,
      BOOL_OR(oi.is_drink) AS is_drink
    FROM matched_items oi
    GROUP BY COALESCE(oi.menu_item_id::TEXT, oi.snapshot_name)
  ),
  active_menu_all AS (
    SELECT
      m.id::TEXT AS item_key,
      m.name,
      CASE
        WHEN mc.name = 'เครื่องดื่ม'
          OR m.name ILIKE '%น้ำขวด%'
          OR m.name ILIKE '%น้ำเปล่า%'
          OR m.name ILIKE '%น้ำกระป๋อง%'
          OR m.name ILIKE '%น้ำอัดลม%'
          OR m.name ILIKE '%กระป๋อง%'
          OR m.name ILIKE '%เครื่องดื่ม%'
        THEN 'เครื่องดื่ม'
        ELSE COALESCE(mc.name, 'เมนูทั่วไป')
      END AS category_name,
      m.base_price,
      0 AS quantity_sold,
      0 AS total_revenue,
      0 AS days_with_sales,
      CASE
        WHEN mc.name = 'เครื่องดื่ม'
          OR m.name ILIKE '%น้ำขวด%'
          OR m.name ILIKE '%น้ำเปล่า%'
          OR m.name ILIKE '%น้ำกระป๋อง%'
          OR m.name ILIKE '%น้ำอัดลม%'
          OR m.name ILIKE '%กระป๋อง%'
          OR m.name ILIKE '%เครื่องดื่ม%'
        THEN TRUE
        ELSE FALSE
      END AS is_drink
    FROM menu_items m
    LEFT JOIN menu_categories mc ON mc.id = m.category_id
    WHERE m.is_active = TRUE
      AND m.id::TEXT NOT IN (SELECT item_key FROM item_aggregated)
  ),
  combined_items AS (
    SELECT * FROM item_aggregated
    UNION ALL
    SELECT * FROM active_menu_all
  ),
  items_with_metrics AS (
    SELECT
      item_key AS id,
      name,
      category_name,
      base_price,
      quantity_sold,
      total_revenue,
      days_with_sales,
      is_drink,
      CASE WHEN v_total_sales > 0 THEN ROUND((total_revenue::NUMERIC / v_total_sales) * 100, 1) ELSE 0 END AS revenue_share,
      CASE
        WHEN quantity_sold = 0 THEN 'zero'
        WHEN quantity_sold < 3 THEN 'slow'
        WHEN (v_total_sales > 0 AND (total_revenue::NUMERIC / v_total_sales) * 100 >= 8) OR quantity_sold >= 20 THEN 'star'
        ELSE 'normal'
      END AS status
    FROM combined_items
  )
  -- Top Selling
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'categoryName', category_name,
      'basePrice', base_price,
      'quantitySold', quantity_sold,
      'totalRevenue', total_revenue,
      'revenueShare', revenue_share,
      'status', status,
      'daysWithSales', days_with_sales
    )
  ), '[]'::jsonb)
  INTO v_top_selling
  FROM (
    SELECT * FROM items_with_metrics
    WHERE quantity_sold > 0 AND is_drink = FALSE
    ORDER BY quantity_sold DESC, total_revenue DESC
    LIMIT 10
  ) top_food;

  -- Drinks
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'categoryName', category_name,
      'basePrice', base_price,
      'quantitySold', quantity_sold,
      'totalRevenue', total_revenue,
      'revenueShare', revenue_share,
      'status', status,
      'daysWithSales', days_with_sales
    )
  ), '[]'::jsonb)
  INTO v_drinks
  FROM (
    SELECT * FROM items_with_metrics
    WHERE quantity_sold > 0 AND is_drink = TRUE
    ORDER BY quantity_sold DESC, total_revenue DESC
  ) drinks_q;

  -- Slow moving
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'categoryName', category_name,
      'basePrice', base_price,
      'quantitySold', quantity_sold,
      'totalRevenue', total_revenue,
      'revenueShare', revenue_share,
      'status', status,
      'daysWithSales', days_with_sales
    )
  ), '[]'::jsonb)
  INTO v_slow_moving
  FROM (
    SELECT * FROM items_with_metrics
    WHERE quantity_sold BETWEEN 1 AND 3 AND is_drink = FALSE
    ORDER BY quantity_sold ASC
  ) slow_q;

  -- Zero sales
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'categoryName', category_name,
      'basePrice', base_price,
      'quantitySold', quantity_sold,
      'totalRevenue', total_revenue,
      'revenueShare', revenue_share,
      'status', status,
      'daysWithSales', days_with_sales
    )
  ), '[]'::jsonb)
  INTO v_zero_sales
  FROM (
    SELECT * FROM items_with_metrics
    WHERE quantity_sold = 0
    ORDER BY name ASC
  ) zero_q;

  -- Star Menu for insight
  SELECT name, total_revenue, quantity_sold, revenue_share
  INTO v_top_item_name, v_top_item_sales, v_top_item_qty, v_top_item_share
  FROM items_with_metrics
  WHERE quantity_sold > 0 AND is_drink = FALSE
  ORDER BY quantity_sold DESC, total_revenue DESC
  LIMIT 1;

  -- ── 7. Category Distribution ──
  WITH matched_items AS (
    SELECT
      oi.subtotal,
      oi.quantity,
      COALESCE(mc.name, 'เมนูทั่วไป') AS resolved_category,
      COALESCE(mc.id::TEXT, 'general') AS resolved_category_id,
      CASE
        WHEN mc.name = 'เครื่องดื่ม'
          OR oi.snapshot_name ILIKE '%น้ำขวด%'
          OR oi.snapshot_name ILIKE '%น้ำเปล่า%'
          OR oi.snapshot_name ILIKE '%น้ำกระป๋อง%'
          OR oi.snapshot_name ILIKE '%น้ำอัดลม%'
          OR oi.snapshot_name ILIKE '%กระป๋อง%'
          OR oi.snapshot_name ILIKE '%เครื่องดื่ม%'
        THEN TRUE
        ELSE FALSE
      END AS is_drink
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN menu_items m ON m.id = oi.menu_item_id
    LEFT JOIN menu_categories mc ON mc.id = m.category_id
    WHERE o.created_at >= v_start AND o.created_at <= v_end
      AND (
        v_day_filter = 'all'
        OR (v_day_filter = 'mon' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 1)
        OR (v_day_filter = 'tue' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 2)
        OR (v_day_filter = 'wed' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 3)
        OR (v_day_filter = 'thu' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 4)
        OR (v_day_filter = 'fri' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 5)
        OR (v_day_filter = 'sat' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 6)
        OR (v_day_filter = 'sun' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 0)
        OR (v_day_filter = 'weekdays' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) BETWEEN 1 AND 4)
        OR (v_day_filter = 'weekends' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) IN (5, 6))
      )
  ),
  cat_grouped AS (
    SELECT
      CASE WHEN is_drink THEN 'drink_category' ELSE resolved_category_id END AS cat_id,
      CASE WHEN is_drink THEN 'เครื่องดื่ม' ELSE resolved_category END AS cat_name,
      SUM(subtotal) AS cat_sales,
      SUM(quantity) AS cat_quantity
    FROM matched_items
    GROUP BY 1, 2
  ),
  cat_total AS (
    SELECT GREATEST(1, SUM(cat_sales)) AS all_cat_sales FROM cat_grouped
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', g.cat_id,
      'name', g.cat_name,
      'totalSales', g.cat_sales,
      'totalQuantity', g.cat_quantity,
      'percentage', ROUND((g.cat_sales::NUMERIC / t.all_cat_sales) * 100, 1)
    )
  ), '[]'::jsonb)
  INTO v_categories
  FROM cat_grouped g, cat_total t
  ORDER BY g.cat_sales DESC;

  -- ── 8. Top Add-ons ──
  WITH addon_grouped AS (
    SELECT
      oio.snapshot_option_name AS addon_name,
      oio.snapshot_group_name AS group_name,
      SUM(oi.quantity) AS addon_count,
      SUM(COALESCE(oio.snapshot_price_adjustment, 0) * oi.quantity) AS total_revenue
    FROM order_item_options oio
    JOIN order_items oi ON oi.id = oio.order_item_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= v_start AND o.created_at <= v_end
      AND (
        v_day_filter = 'all'
        OR (v_day_filter = 'mon' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 1)
        OR (v_day_filter = 'tue' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 2)
        OR (v_day_filter = 'wed' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 3)
        OR (v_day_filter = 'thu' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 4)
        OR (v_day_filter = 'fri' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 5)
        OR (v_day_filter = 'sat' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 6)
        OR (v_day_filter = 'sun' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) = 0)
        OR (v_day_filter = 'weekdays' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) BETWEEN 1 AND 4)
        OR (v_day_filter = 'weekends' AND EXTRACT(DOW FROM (o.created_at AT TIME ZONE 'Asia/Bangkok')) IN (5, 6))
      )
      AND (
        oio.snapshot_group_name = 'เพิ่มเติม'
        OR oio.snapshot_group_name ILIKE 'เนื้อสัตว์%เพิ่มเติม%'
        OR oio.snapshot_group_name ILIKE 'เนื้อสัตว์(เพิ่มเติม)%'
        OR oio.snapshot_group_name ILIKE 'เนื้อสัตว์ (เพิ่มเติม)%'
      )
      AND oio.snapshot_option_name NOT IN ('ธรรมดา', 'ปกติ', 'ทานที่ร้าน', 'Dine-in')
    GROUP BY oio.snapshot_option_name, oio.snapshot_group_name
    ORDER BY addon_count DESC, total_revenue DESC
    LIMIT 8
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', addon_name,
      'groupName', group_name,
      'count', addon_count,
      'totalRevenue', total_revenue
    )
  ), '[]'::jsonb)
  INTO v_top_addons
  FROM addon_grouped;

  SELECT addon_name, addon_count, total_revenue
  INTO v_top_addon_name, v_top_addon_count, v_top_addon_rev
  FROM addon_grouped
  LIMIT 1;

  -- Dead stock count
  v_dead_stock_count := jsonb_array_length(v_zero_sales) + jsonb_array_length(v_slow_moving);

  -- ── 9. Build Automated Insights ──
  v_insights := '[]'::jsonb;

  IF v_top_item_name IS NOT NULL THEN
    v_insights := v_insights || jsonb_build_object(
      'type', 'success',
      'category', 'star',
      'icon', 'military_tech',
      'title', 'เมนูสร้างรายได้อันดับ 1: ' || v_top_item_name,
      'description', 'สร้างยอดขาย ' || TO_CHAR(v_top_item_sales, 'FM999,999,999') || ' บาท (' || v_top_item_qty || ' จาน) คิดเป็น ' || v_top_item_share || '% ของยอดขายอาหารทั้งหมด',
      'actionRecommendation', 'เป็นเมนูแม่เหล็กของร้าน ควรจัดเตรียมสต็อกวัตถุดิบหลักให้เพียงพอ และอาจจัดโปรโมชั่นคู่เครื่องดื่มเพื่อเพิ่มยอดต่อบิล'
    );
  END IF;

  IF v_peak_hour_label IS NOT NULL THEN
    v_insights := v_insights || jsonb_build_object(
      'type', 'primary',
      'category', 'peak_hour',
      'icon', 'alarm_on',
      'title', 'ช่วงเวลาเร่งด่วน: ' || v_peak_hour_label,
      'description', 'มีออเดอร์เฉลี่ย ' || v_peak_hour_orders || ' รายการ และยอดขายเฉลี่ย ' || TO_CHAR(v_peak_hour_sales, 'FM999,999,999') || ' บาท ในชั่วโมงนี้',
      'actionRecommendation', 'จัดกำลังพลในครัวและพนักงานเสิร์ฟให้พร้อมสูงสุดช่วงเวลานี้ เพื่อลดเวลารออาหารและเพิ่มความพึงพอใจของลูกค้า'
    );
  END IF;

  IF v_best_day_name IS NOT NULL AND v_lowest_day_name IS NOT NULL THEN
    v_insights := v_insights || jsonb_build_object(
      'type', 'info',
      'category', 'slow_day',
      'icon', 'calendar_month',
      'title', 'แนวโน้มรายวัน: ' || v_best_day_name || ' ขายดีที่สุด',
      'description', v_best_day_name || ' มียอดขายเฉลี่ยสูงสุด ' || TO_CHAR(v_best_day_sales, 'FM999,999,999') || ' บาท/วัน ในขณะที่ ' || v_lowest_day_name || ' มียอดขายเฉลี่ยต่ำสุด (' || TO_CHAR(v_lowest_day_sales, 'FM999,999,999') || ' บาท/วัน)',
      'actionRecommendation', 'พิจารณาทำโปรโมชั่นพิเศษหรือคูปองส่วนลดเฉพาะ' || v_lowest_day_name || ' เพื่อกระตุ้นยอดขายในวันที่มีลูกค้าน้อย'
    );
  END IF;

  IF v_dead_stock_count > 0 THEN
    v_insights := v_insights || jsonb_build_object(
      'type', 'warning',
      'category', 'dead_stock',
      'icon', 'warning_amber',
      'title', 'ตรวจพบเมนูขายช้าหรือไม่มีคนสั่ง ' || v_dead_stock_count || ' เมนู',
      'description', 'มี ' || jsonb_array_length(v_zero_sales) || ' เมนูที่ไม่มีคนสั่งเลยในช่วงเวลานี้ และ ' || jsonb_array_length(v_slow_moving) || ' เมนูที่ขายได้น้อยมาก',
      'actionRecommendation', 'ควรพิจารณาปรับรูปภาพ/ตำแหน่งเมนูบนแอป จัดเซ็ตคอมโบ้ หรือตัดเมนูที่ต้นทุนวัตถุดิบสูงออกเพื่อลดของเหลือทิ้ง (Food Waste)'
    );
  END IF;

  IF v_top_addon_name IS NOT NULL THEN
    v_insights := v_insights || jsonb_build_object(
      'type', 'primary',
      'category', 'basket_size',
      'icon', 'add_shopping_cart',
      'title', 'ท็อปปิ้งเสริมยอดนิยม: ' || v_top_addon_name,
      'description', 'ลูกค้าสั่งเสริมถึง ' || v_top_addon_count || ' ครั้ง สร้างรายได้เพิ่มเติม ' || TO_CHAR(v_top_addon_rev, 'FM999,999,999') || ' บาท',
      'actionRecommendation', 'แนะนำให้ตั้งเป็นตัวเลือกเสริมที่แนะนำ (Recommended Add-on) หน้าสั่งอาหาร เพื่อเพิ่มค่าเฉลี่ยยอดสั่งต่อบิล (AOV)'
    );
  END IF;

  -- ── 10. Assemble Final KPIs Object ──
  v_kpis := jsonb_build_object(
    'totalSales', v_total_sales,
    'totalBills', v_total_bills,
    'totalDishes', v_total_dishes,
    'activeSalesDays', v_active_days,
    'avgDailySales', v_avg_daily_sales,
    'avgBillValue', v_avg_bill_value,
    'avgDishesPerBill', v_avg_dishes_per_bill,
    'bestDayOfWeek', v_best_day,
    'peakHour', v_peak_hour
  );

  RETURN jsonb_build_object(
    'kpis', v_kpis,
    'dayOfWeekData', COALESCE(v_day_of_week_data, '[]'::jsonb),
    'weekdayVsWeekend', jsonb_build_object(
      'weekdayAvgSales', ROUND(v_weekday_avg),
      'weekendAvgSales', ROUND(v_weekend_avg),
      'diffPercentage', v_diff_pct,
      'higherType', v_higher_type
    ),
    'hourlyData', COALESCE(v_hourly_data, '[]'::jsonb),
    'mealPeriods', COALESCE(v_meal_periods, '[]'::jsonb),
    'topSellingItems', v_top_selling,
    'drinkItems', v_drinks,
    'slowMovingItems', v_slow_moving,
    'zeroSalesItems', v_zero_sales,
    'categoryDistribution', v_categories,
    'topAddons', v_top_addons,
    'diningType', jsonb_build_array(v_dining_summary),
    'diningTypeSummary', v_dining_summary,
    'insights', v_insights
  );
END;
$$;

-- ─── 2. Server-Side Paginated Bills Function ────────────────────────────────

CREATE OR REPLACE FUNCTION get_paginated_bills(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_day_filter TEXT DEFAULT 'all',
  p_search TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_sort_by TEXT DEFAULT 'paid_at',
  p_descending BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_day_filter TEXT;
  v_search TEXT;
  v_offset INTEGER;
  v_limit INTEGER;
  v_total_count INTEGER := 0;
  v_total_sales_sum NUMERIC := 0;
  v_rows JSONB := '[]'::jsonb;
BEGIN
  v_start := COALESCE(p_start_date, '2020-01-01 00:00:00+07'::TIMESTAMPTZ);
  v_end := COALESCE(p_end_date, NOW());
  v_day_filter := LOWER(COALESCE(p_day_filter, 'all'));
  v_search := NULLIF(TRIM(p_search), '');
  v_limit := GREATEST(1, LEAST(COALESCE(p_page_size, 20), 1000));
  v_offset := GREATEST(0, (GREATEST(1, COALESCE(p_page, 1)) - 1) * v_limit);

  WITH matched_bills AS (
    SELECT
      b.id,
      b.table_session_id,
      b.total_amount,
      b.status,
      b.created_at,
      b.paid_at,
      CASE
        WHEN ts.customer_name IS NOT NULL AND (t.name ILIKE '%กลับบ้าน%' OR t.name ILIKE '%takeaway%')
          THEN 'สั่งกลับบ้าน (' || ts.customer_name || ')'
        WHEN ts.customer_name IS NOT NULL
          THEN COALESCE(t.name, 'โต๊ะ') || ' (' || ts.customer_name || ')'
        ELSE COALESCE(t.name, 'โต๊ะ')
      END AS display_table_name
    FROM bills b
    LEFT JOIN table_sessions ts ON ts.id = b.table_session_id
    LEFT JOIN tables t ON t.id = ts.table_id
    WHERE b.status = 'PAID'
      AND b.paid_at >= v_start
      AND b.paid_at <= v_end
      AND (
        v_day_filter = 'all'
        OR (v_day_filter = 'mon' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 1)
        OR (v_day_filter = 'tue' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 2)
        OR (v_day_filter = 'wed' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 3)
        OR (v_day_filter = 'thu' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 4)
        OR (v_day_filter = 'fri' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 5)
        OR (v_day_filter = 'sat' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 6)
        OR (v_day_filter = 'sun' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) = 0)
        OR (v_day_filter = 'weekdays' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) BETWEEN 1 AND 4)
        OR (v_day_filter = 'weekends' AND EXTRACT(DOW FROM (b.paid_at AT TIME ZONE 'Asia/Bangkok')) IN (5, 6))
      )
      AND (
        v_search IS NULL
        OR b.id::TEXT ILIKE '%' || v_search || '%'
        OR t.name ILIKE '%' || v_search || '%'
        OR ts.customer_name ILIKE '%' || v_search || '%'
      )
  ),
  summary AS (
    SELECT COUNT(*) AS total_count, COALESCE(SUM(total_amount), 0) AS total_sales_sum
    FROM matched_bills
  ),
  paged AS (
    SELECT *
    FROM matched_bills
    ORDER BY
      CASE WHEN p_sort_by = 'total_amount' AND p_descending THEN total_amount END DESC,
      CASE WHEN p_sort_by = 'total_amount' AND NOT p_descending THEN total_amount END ASC,
      CASE WHEN p_sort_by = 'table_name' AND p_descending THEN display_table_name END DESC,
      CASE WHEN p_sort_by = 'table_name' AND NOT p_descending THEN display_table_name END ASC,
      CASE WHEN (p_sort_by IS NULL OR p_sort_by = 'paid_at') AND p_descending THEN paid_at END DESC,
      CASE WHEN (p_sort_by IS NULL OR p_sort_by = 'paid_at') AND NOT p_descending THEN paid_at END ASC,
      paid_at DESC
    LIMIT v_limit OFFSET v_offset
  )
  SELECT
    (SELECT total_count FROM summary),
    (SELECT total_sales_sum FROM summary),
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'table_session_id', table_session_id,
          'total_amount', total_amount,
          'status', status,
          'created_at', created_at,
          'paid_at', paid_at,
          'table_name', display_table_name
        )
      )
      FROM paged
    ), '[]'::jsonb)
  INTO v_total_count, v_total_sales_sum, v_rows;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'totalCount', v_total_count,
    'totalSalesSum', v_total_sales_sum
  );
END;
$$;

-- ─── 3. Indexes for Faster Date Filtering ────────────────────────────────────
-- (Note: In a busy database, creating indexes concurrently or one by one avoids locks)

CREATE INDEX IF NOT EXISTS idx_bills_paid_at_status
  ON bills (status, paid_at DESC)
  WHERE status = 'PAID';

CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id
  ON order_items (menu_item_id);

CREATE INDEX IF NOT EXISTS idx_order_items_created_at
  ON order_items (created_at);
