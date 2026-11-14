# ผลสำรวจระบบเพื่อวางแผนทดสอบ

ตรวจจาก source และ migration ใน repository วันที่ 14 พฤศจิกายน 2026 เท่านั้น **ยังไม่ได้เชื่อม production หรือ local DB** ดังนั้นสิทธิ์/โครงสร้างของฐานข้อมูลที่ deploy จริงยังยืนยันไม่ได้ และยังไม่มีผลทดสอบ integration/E2E

## 1. สถาปัตยกรรมและจุดเชื่อมต่อ

Quasar SPA ใช้ Vue 3 + Pinia: `src/pages/customer` มี Welcome, Menu, ProductDetail, Cart, Orders, OrderDetail; `src/pages/owner` มี Login, Dashboard, Queue, OrderManagement, Tables, MenuManagement, Options, Bills, BillDetail, Sales, LocationSettings. Layout อยู่ใน `src/layouts`; route ทั้งหมดอยู่ใน `src/router/routes.ts`. เส้นทางลูกค้าอยู่ใต้ `/t/:publicToken`; owner ใต้ `/owner` โดย `src/router/index.ts` ตรวจ `authStore.isAuthenticated` ก่อนเข้า route ที่มี `requiresAuth`. Route guard เป็นเพียง UI gate; สิทธิ์ DB อยู่ที่ RLS/RPC.

องค์ประกอบหลักอยู่ใน `src/components/{menu,orders,queue,bills,dashboard,analytics,customer,notification}`. Stores: `authStore`, `sessionStore`, `cartStore`, `menuStore`, `queueStore`, `notificationStore`. Composables: `useRiceStation`, `useFryStation`, `useNotify`, `useElapsedTimer`. `src/boot/supabase.ts` สร้าง injection และเรียก `authStore.initialize()` ก่อน mount; `src/services/supabase.ts` สร้าง client จาก `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` และเปิด persist/refresh session.

การเรียก DB ส่วนใหญ่อยู่ใน `src/services/{table,session,order,bill,restaurant,salesAnalytics,storage}Service.ts` แต่มีการเรียก `supabase.from(...)` ตรงใน `src/pages/owner/{MenuManagement,Options,Tables,BillDetail}Page.vue` และ `src/stores/menuStore.ts`; auth store เรียก Auth และ `is_owner` RPC. RPC สำคัญ: resolve/join/get session, create/update/fetch/delete order, queue/status/kitchen, transfer/close session, bill/price/analytics. `src/services/storageService.ts` อัปโหลดรูปไป `menu-images` และคืน public URL; หากอัปโหลดพลาดจะใช้ data URL. พบ Realtime publication ของ `orders`, `menu_items`, `table_sessions`, `order_items` ใน migrations และ channel subscriptions ใน `QueuePage`, `BillsPage`, `OrderManagementPage`, `DashboardPage`. ค้น `supabase.functions.invoke` ใน `src` ไม่พบ จึงไม่พบ Edge Function ที่ frontend เรียก; ยังยืนยันการตั้งค่าภายนอก repo ไม่ได้.

Test ที่มี: `vitest.config.ts` รัน `tests/unit/**/*.test.ts` พร้อม `allure-vitest`; มี unit test 2 ไฟล์/4 เคส (formatPrice 1, E2E guard 3), ยังไม่มี coverage instrumentation/threshold. `playwright.config.ts` มี reporter/global setup แต่ `tests/e2e/specs` ยังไม่มี test. `supabase/tests/security_regression.sql` เป็น SQL test ที่มีอยู่ ไม่ได้ผูกกับ Vitest. `allurerc.mjs` ใช้ Awesome และ history path; `package.json` มี `test:allure` และ `allure:generate`. Azure pipeline ปัจจุบันรันเฉพาะ unit test. `supabase/config.toml` ถูกสร้างแล้ว แต่ Docker daemon ใช้งานไม่ได้ในรอบก่อน.

## 2. ข้อมูล, ความสัมพันธ์และสิทธิ์

โครงสร้างหลักอ้างจาก `supabase/migrations/00001_complete_schema.sql` และ migration ถัดมา:

| ตาราง                     | ความสัมพันธ์/ฟิลด์และกฎสำคัญ                                                                                    | สิทธิ์ตาม migration ล่าสุดที่พบ                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `restaurants`             | ชื่อ, พิกัด, geofence                                                                                         | owner ครบ; anon SELECT                                                            |
| `tables`                  | FK restaurant; ชื่อ, active                                                                                 | owner ครบ; anon SELECT เฉพาะ active                                               |
| `table_qr_tokens`         | FK table; token unique เฉพาะ active, expires_at                                                           | owner ครบ; anon SELECT ถูกถอนใน 00028, ใช้ `resolve_table_token`                    |
| `table_sessions`          | FK table; status/closed_at, customer_name, merged_into_session_id; active ต่อโต๊ะมี unique index และ trigger | owner ครบ; anon direct access ถูกถอนใน 00029, ใช้ customer RPC                      |
| `guest_sessions`          | FK table_session; session_token unique ต่อ session                                                         | owner ครบ; anon direct access ถูกถอนใน 00029                                       |
| `menu_categories`         | FK restaurant; active/sort                                                                                | owner ครบ; anon SELECT เฉพาะ active                                               |
| `menu_items`              | FK category; base_price >= 0, availability, fry_config                                                    | owner ครบ; anon SELECT เฉพาะ active                                               |
| `option_groups`           | FK restaurant; required, single/multi, min/max                                                            | owner ครบ; anon SELECT เฉพาะ active                                               |
| `options`                 | FK group; price_adjustment, availability, fry_config                                                      | owner ครบ; anon SELECT เฉพาะ active                                               |
| `menu_item_option_groups` | FK menu_item/group, unique คู่                                                                              | owner ครบ; anon SELECT                                                            |
| `orders`                  | FK session, guest nullable หลัง 00009; queue ต่อวัน, status, revision, total_amount                          | owner ครบ; anon direct SELECT ถูกถอนใน 00029, ใช้ customer RPC                      |
| `order_items`             | FK order/menu item (menu nullable หลัง 00009); quantity > 0, instruction <= 200, snapshots, completion     | owner ครบ; anon direct SELECT ถูกถอนใน 00029                                       |
| `order_item_options`      | FK order_item/option/group; snapshot ราคา                                                                 | owner ครบ; anon direct SELECT ถูกถอนใน 00029                                       |
| `bills`                   | FK session unique; total/status/paid_at                                                                   | owner ครบ; anon direct SELECT ถูกถอนใน 00029                                       |
| `order_histories`         | FK order; revision, JSONB snapshot                                                                        | owner ครบหลัง 00031; anon direct read ถูกถอนใน 00027, guest ใช้ token RPC            |
| `daily_queue_counters`    | PK date; last_number                                                                                      | owner ครบหลัง 00031; counter RPC เป็น authenticated                                 |
| `owner_users`             | PK/FK `auth.users`; owner allowlist                                                                       | `service_role` เท่านั้นสำหรับ direct table access; `is_owner()` ให้ authenticated เรียก |

`00031_owner_allowlist_and_rls.sql` เปลี่ยน policy owner ของตารางหลักเป็น `authenticated AND is_owner()`; ผู้ใช้ authenticated ที่ไม่อยู่ใน allowlist ไม่ได้สิทธิ์ owner. `00027` ถอน RPC ของครัว/เจ้าของจาก anon; `00028` กำหนด QR + guest token สำหรับ `create_order_verified`; `00029` ถอน anon direct access ของ session/order/bill แล้วเปิด customer RPC ที่ตรวจ token. สิทธิ์จริงของทุก RPC ต้องทดสอบบน local DB หลัง migrations เพราะ policy และ `SECURITY DEFINER/INVOKER` ถูกแก้หลายครั้ง. ระบบไม่มี RLS แบบ user A เป็นเจ้าของแถวของตนสำหรับตารางธุรกิจ จึงห้ามถือว่า test user แยกจะเห็นเฉพาะ test data โดยอัตโนมัติ.

Auth: `src/stores/authStore.ts` ใช้ `signInWithPassword`, `getSession`, `onAuthStateChange`, `signOut`; หลัง login ต้องผ่าน `is_owner()` จึงเข้า `/owner` ได้. ลูกค้าใช้ QR `publicToken` และ guest session token ไม่ได้ login แบบ owner. Storage bucket `menu-images` ถูกสร้างใน `00002`/ปรับใน `00018`; migration `00031` จำกัด INSERT/UPDATE/DELETE ให้ owner, public read ยังคงอยู่ตาม policy ที่ไม่ได้ถูกถอน. ไม่พบ SQL trigger สำหรับอีเมล/HTTP ใน migrations; พบ trigger `single_active_dine_in_session` ใน `00030`. อาจมี side effect ผ่าน Realtime, RPC, queue counter และ Storage; Edge Function/อีเมลที่ตั้งภายนอก repo ยืนยันไม่ได้.

## 3. Flow และกฎธุรกิจ

- ลูกค้า: QR → welcome/join session → menu/options → cart → `create_order_verified` → orders/detail; แก้ order เมื่อ `QUEUED` ด้วย guest token. แสดงคิวผ่าน customer RPC. `src/stores/cartStore.ts` คิด `(base_price + ผลรวม options) * quantity` และเก็บตะกร้าตาม session ใน localStorage.
- Owner: login + allowlist → dashboard/queue/orders → สถานะอาหาร/แก้ออเดอร์/ลบ → bills/payment/ปิดหรือย้ายโต๊ะ; menu/options/tables/location และ sales. `src/services/orderService.ts` คำนวณตำแหน่งคิวฝั่ง UI; `src/services/billService.ts` รวมยอดจาก orders และราคา item/options. กฎ FIFO/สถานะ, การตรวจราคา/availability, guest token, การสร้างเลขคิวรายวันอยู่ใน RPC/SQL ไม่ควรพิสูจน์ด้วย mock เพียงอย่างเดียว.
- ฟอร์ม/การแสดงผล: menu/category และ options จัดการโดย page/component; geofence อยู่ใน `src/utils/geoUtils.ts`; logic station อยู่ใน `src/composables/useRiceStation.ts`, `useFryStation.ts`; analytics อยู่ใน `salesAnalyticsService.ts` และ dashboard/analytics components.

## 4. ความเสี่ยงและขอบเขตทดสอบ

| ลำดับ    | ฟีเจอร์                               | เหตุผล/หลักฐาน                                                      | ทดสอบปลอดภัยด้วย mock              | ต้องใช้ local DB                |
| ------- | ----------------------------------- | ----------------------------------------------------------------- | -------------------------------- | ----------------------------- |
| 1 สูงมาก | RLS/Auth/guest token/owner RPC      | ข้อมูลข้ามผู้ใช้และสิทธิ์; security rollout ใน git log ล่าสุด                | guard และ error UI               | ใช่ สำหรับสิทธิ์จริง                |
| 2 สูงมาก | สั่ง/แก้/ลบ order, queue               | RPC หลายตาราง, snapshots, FIFO, status; มี migration security ล่าสุด | cart, payload, error handling    | ใช่ สำหรับ atomicity/constraint |
| 3 สูง    | bill/payment/session close/transfer | ยอดเงินและ cascade/merge; มี direct write หลายจุด                    | ผลรวมและ UI state                | ใช่                            |
| 4 สูง    | menu/options/storage                | ราคา/availability, upload fallback, public image                  | validation/compression mock      | ใช่ สำหรับ RLS/Storage          |
| 5 กลาง  | tables/QR/geofence                  | token และพิกัดมีผลเข้าถึงระบบ                                          | distance/route/mock              | ใช่ สำหรับ token/session        |
| 6 กลาง  | dashboard/sales/queue display       | aggregation, timezone, loading/error                              | formatter/transform/chart states | ใช่ สำหรับ SQL analytics        |

ข้อจำกัด: ไม่มีผล coverage; ไม่พบ DB test แยกหรือ test user ที่จำกัดสิทธิ์เฉพาะแถวของตน; ยังไม่ยืนยัน migration history เทียบ remote. Git log ล่าสุดมี security/search_path, refactor menu/fry, completion tracking จึงให้ความเสี่ยงส่วนนี้สูงขึ้น. ห้ามเริ่ม test ที่เขียน DB จน local DB พร้อมและตรวจ cleanup/สิทธิ์จริง.
