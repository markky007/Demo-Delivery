# แผนทดสอบ DEMO Bang saen

อ้างอิง [ผลสำรวจ](test-audit.md). ชั้น `unit/component` ใช้ Vitest + mock Supabase; `integration` ใช้ Supabase local ที่ apply migrations ครบ; `e2e` ใช้ Playwright + local เท่านั้น. `test:allure` ปัจจุบันรัน unit เท่านั้น. ห้ามรัน test เขียนข้อมูลกับ production.

สถานะรอบ 1 (14 พฤศจิกายน 2026): **ผ่าน 3 รอบติด** `TC-AUTH-001` ถึง `004`, `TC-CART-001` ถึง `002`, `TC-ORDER-006` (เฉพาะ service error), `TC-BILL-002` (เฉพาะผลรวมหลาย order), `TC-STATION-001` (เฉพาะ queue position), `TC-GUARD-001` ถึง `003`, `TC-FORMAT-001`. รอบละ 13/13 ผ่าน; Allure metadata และ step ครบ 39 ผลจาก 3 รอบ. เคสอื่นยังไม่เขียน; ขอบเขตย่อยในแถวที่ระบุว่า "เฉพาะ" ยังไม่ครบ.

## Test cases

| ID            | ฟีเจอร์             | สถานการณ์           | ขั้นตอนโดยย่อ         | ผลที่คาดหวัง  | ชั้น   | Severity | DB จริง |
| ------------- | ----------------- | ------------------ | ------------------ | ---------- | ---- | -------- | ------ |
| TC-GUARD-001  | Environment guard | local URL          | ตรวจ env local     | อนุญาตให้เริ่ม | unit | blocker  | ไม่     |
| TC-GUARD-002  | Environment guard | URL ตรง production | ตรวจ URL เทียบ prod | บล็อกทันที    | unit | blocker  | ไม่     |
| TC-GUARD-003  | Environment guard | ไม่มี prod reference | ตรวจ env ไม่ครบ     | บล็อกทันที    | unit | blocker  | ไม่     |
| TC-FORMAT-001 | Formatting        | ราคา integer       | formatPrice(120)   | แสดง ฿120  | unit | normal   | ไม่     |

| ID               | ฟีเจอร์                 | สถานการณ์                              | ขั้นตอนโดยย่อ                           | ผลที่คาดหวัง                                                           | ชั้น             | Severity | DB จริง |
| ---------------- | --------------------- | ------------------------------------- | ------------------------------------ | ------------------------------------------------------------------- | -------------- | -------- | ------ |
| TC-AUTH-001      | Login                 | owner ถูกต้อง                           | mock signIn + is_owner=true          | เข้า owner, state ถูกต้อง                                              | unit           | critical | ไม่     |
| TC-AUTH-002      | Login                 | รหัสผิด/เครือข่ายล้ม                       | mock error/reject                    | แสดง error, ไม่ authenticated                                        | unit           | critical | ไม่     |
| TC-AUTH-003      | Login                 | authenticated แต่ไม่ใช่ owner            | mock is_owner=false                  | signOut และปฏิเสธ                                                    | unit           | blocker  | ไม่     |
| TC-AUTH-004      | Logout                | owner ออกจากระบบ                      | mock signOut                         | state ล้าง, route ป้องกัน                                              | unit/component | critical | ไม่     |
| TC-AUTH-005      | Session               | หมดอายุ/refresh ล้ม                     | ส่ง auth event + route                | กลับ login, ไม่ค้างสิทธิ์                                                 | component      | critical | ไม่     |
| TC-AUTH-006      | Route guard           | anon/owner เข้าหน้าข้ามสิทธิ์               | navigate owner routes                | anon ถูก redirect; owner ผ่าน                                         | component      | critical | ไม่     |
| TC-RLS-001       | Owner RLS             | test user A ไม่อยู่ allowlist            | query CRUD ทุกกลุ่มหลัก                  | ถูกปฏิเสธ                                                             | integration    | blocker  | ใช่     |
| TC-RLS-002       | Owner RLS             | owner A/B และขอบเขตแถว                | ทดสอบอ่าน/แก้/ลบ record ของอีกคน        | ระบุข้อเท็จจริงตาม policy; **คาดว่า owner เห็นร่วมกัน** ไม่ตั้ง expectation ผิด | integration    | blocker  | ใช่     |
| TC-RLS-003       | Anon                  | direct table/session/order/bill       | SELECT/INSERT/UPDATE/DELETE โดย anon | ถูกปฏิเสธตาม 00028/00029                                              | integration    | blocker  | ใช่     |
| TC-RLS-004       | Anon RPC              | guest token/QR ผิดหรือของคนอื่น           | เรียก customer RPC                    | ไม่เปิดเผยข้อมูล/ไม่เขียน                                                 | integration    | blocker  | ใช่     |
| TC-RLS-005       | RPC                   | anon เรียก owner/kitchen/analytics     | เรียก RPC ที่ถูก revoke                  | permission denied                                                   | integration    | blocker  | ใช่     |
| TC-CART-001      | Cart                  | เพิ่ม/ปรับจำนวน/ลบ/ล้าง                   | dispatch actions                     | subtotal/total และ localStorage แยก session ถูกต้อง                   | unit           | critical | ไม่     |
| TC-CART-002      | Cart                  | quantity 0, option price, storage เสีย | ส่ง boundary/input ผิด                 | ไม่เกิดยอดผิด/ไม่ crash                                                 | unit           | normal   | ไม่     |
| TC-ORDER-001     | Order                 | สั่งสำเร็จ                               | QR → menu → cart → submit            | ได้ order/queue และเห็น status                                        | e2e            | critical | ใช่     |
| TC-ORDER-002     | Order                 | ราคา/availability/option ถูกปลอม       | เรียก verified RPC ด้วย payload ผิด     | DB ปฏิเสธ ไม่เชื่อ client price                                         | integration    | blocker  | ใช่     |
| TC-ORDER-003     | Order                 | แก้เฉพาะ QUEUED                        | แก้ก่อน/หลัง PREPARING                  | ก่อนผ่าน หลังถูกปฏิเสธ; revision/history ถูกต้อง                           | integration    | critical | ใช่     |
| TC-ORDER-004     | Order                 | ลบ order ที่สร้างใน run                  | delete RPC เฉพาะ ID + marker         | cascade เฉพาะ test data                                             | integration    | critical | ใช่     |
| TC-ORDER-005     | Queue                 | FIFO, daily reset, ข้ามสถานะ           | สร้างหลาย order/advance               | ลำดับและ transition ถูกต้อง                                            | integration    | critical | ใช่     |
| TC-ORDER-006     | Order UI              | loading/empty/network/RPC error       | mock response                        | แสดง state และไม่ส่งซ้ำ                                                | component      | normal   | ไม่     |
| TC-SESSION-001   | Session               | QR ถูก/ผิด/หมดอายุ                       | resolve/join                         | ได้ session เฉพาะ token ถูก                                           | integration    | critical | ใช่     |
| TC-SESSION-002   | Session               | โต๊ะเปิด session ซ้ำ                     | สร้างซ้ำพร้อมกัน                         | unique index/trigger กันซ้ำ                                           | integration    | critical | ใช่     |
| TC-SESSION-003   | Session               | ย้าย/รวม/ปิด                            | ทำบน session marker                  | สถานะ, bills, orders ไม่สูญ                                           | integration    | critical | ใช่     |
| TC-TABLE-001     | Tables/QR             | CRUD โต๊ะและ refresh token             | สร้าง/อ่าน/แก้/ลบ marked table          | แสดงสถานะ, token เดิมหมดสิทธิ์                                          | integration    | critical | ใช่     |
| TC-TABLE-002     | Tables form           | ชื่อว่าง/ซ้ำ/active                       | กรอกค่า boundary                      | validation/error state ถูกต้อง                                        | component      | normal   | ไม่     |
| TC-MENU-001      | Categories            | CRUD หมวดหมู่                           | สร้าง/อ่าน/แก้/ลบ marked category       | แสดงลำดับ/active; cleanup ครบ                                        | integration    | normal   | ใช่     |
| TC-MENU-002      | Menu items            | CRUD เมนูและราคา                       | สร้าง/อ่าน/แก้/ลบ marked item           | ราคา integer >=0, availability ถูกต้อง                                | integration    | critical | ใช่     |
| TC-MENU-003      | Menu form             | ชื่อว่าง/ราคา -1/ขอบเขต                  | กรอกค่าผิด                             | ไม่ส่ง payload ไม่ถูกต้อง                                                | component      | normal   | ไม่     |
| TC-OPTION-001    | Option groups/options | CRUD + mapping menu                   | สร้าง/อ่าน/แก้/ลบ marked rows           | required/min/max, mapping ถูกต้อง                                     | integration    | critical | ใช่     |
| TC-OPTION-002    | Option validation     | required/single/multi/หมดสต็อก         | เลือก option boundary                 | UI ป้องกันการเลือกผิด                                                   | unit/component | normal   | ไม่     |
| TC-BILL-001      | Bill                  | คิดรวม/ปรับราคา/จ่าย                     | order marker → bill → paid           | total และ paid_at ถูกต้อง                                             | integration    | critical | ใช่     |
| TC-BILL-002      | Bill logic            | ยอดว่าง/หลาย order/options             | mock data                            | sum/subtotal ถูกต้อง                                                  | unit           | critical | ไม่     |
| TC-BILL-003      | Bill UI               | error/empty/loading                   | mock service                         | state และ retry ถูกต้อง                                               | component      | normal   | ไม่     |
| TC-STORAGE-001   | Image                 | upload/download marked path           | upload รูป test → public URL → remove | ไฟล์และ record ไม่เหลือ                                                | integration    | critical | ใช่     |
| TC-STORAGE-002   | Image                 | MIME/ขนาด/อัปโหลดล้ม                    | mock file/storage/canvas             | fallback หรือ validation ตามโค้ดจริง                                   | unit/component | normal   | ไม่     |
| TC-STORAGE-003   | Image RLS             | anon/non-owner upload/delete          | เรียก Storage API                     | ถูกปฏิเสธ; public read ยังทำได้                                         | integration    | blocker  | ใช่     |
| TC-LOCATION-001  | Geofence              | ใกล้/ไกล/พิกัดผิด                         | ส่ง coordinates boundary              | distance และสถานะถูกต้อง                                              | unit           | normal   | ไม่     |
| TC-ANALYTICS-001 | Sales/dashboard       | ยอดรายวัน/เวลา Bangkok                 | fixture ที่ควบคุมเวลา                   | aggregate/filter/pagination ถูกต้อง                                   | integration    | normal   | ใช่     |
| TC-ANALYTICS-002 | Dashboard             | empty/loading/error                   | mock RPC                             | ไม่ crash และสื่อสารสถานะ                                              | component      | normal   | ไม่     |
| TC-STATION-001   | Fry/rice/notification | สถานะคิวและ config                     | mock store/events                    | derived state และ cleanup listener ถูกต้อง                            | unit/component | normal   | ไม่     |
| TC-E2E-001       | ลูกค้า                  | QR → สั่ง → ดู order                     | ทำบน local fixture                   | flow สำเร็จ                                                          | e2e            | critical | ใช่     |
| TC-E2E-002       | ลูกค้า                  | แก้ order QUEUED                       | สั่ง/แก้/ดู revision                     | ข้อมูลใหม่ถูกต้อง                                                        | e2e            | critical | ใช่     |
| TC-E2E-003       | Owner                 | login → queue → served                | test owner local + marked order      | สถานะคิวตรงกัน                                                        | e2e            | critical | ใช่     |
| TC-E2E-004       | Owner                 | menu + image                          | เพิ่ม/แก้/ลบ marked menu/file           | UI และ Storage สอดคล้อง                                              | e2e            | normal   | ใช่     |
| TC-E2E-005       | Owner                 | bill → paid → close                   | marked session/order                 | ยอด/สถานะถูกต้อง                                                      | e2e            | critical | ใช่     |

รายการ E2E มี 5 flow; `TC-ORDER-001` เป็น integration ผ่าน UI ที่สามารถรวมกับ `TC-E2E-001` เพื่อไม่รันซ้ำ.

## กลยุทธ์และข้อมูลทดสอบ

รอบแรกใช้ Vitest mock `src/services/supabase.ts` หรือ mock service boundary ตามไฟล์ที่ทดสอบ (ห้าม import client จริงใน unit ที่ไม่มี env), เน้น auth/cart/ราคา/guard/ข้อผิดพลาด. Component ใช้ Quasar/Pinia test harness. Integration ใช้ Supabase CLI local เท่านั้นและ anon/test owner เฉพาะ local; Playwright ใช้ `globalSetup` ที่ตรวจ `.env.test` และ URL production ก่อนเปิด browser. ถ้าไม่มี Docker หรือ migration fail ให้ข้าม DB tests แบบ explicit และรายงานว่าไม่ผ่าน gate การครอบคลุม DB. ต้องตรวจ migrations และ role/grants บน local ก่อนเปิด test เขียนข้อมูล.

ทุกเคสที่เขียน DB ใช้ `runId` สุ่มและ marker `__test_<runId>__` ในชื่อ/ข้อความที่รองรับ; ไฟล์ใช้ path `__test_<runId>__/...`. Registry เก็บ ID + marker ของ restaurants/tables/QR/session/guest/categories/menu/options/orders/bills/Storage ที่สร้าง; cleanup ใน `finally` และ `afterEach/afterAll` ลบเฉพาะ ID ที่ตรวจ marker ตรงแล้ว, เรียงลูกก่อนแม่. Global teardown sweep เฉพาะ marker ของ run นี้และ assert เหลือ 0. `test:cleanup` สำหรับของเก่าแสดงจำนวน+รายการแบบ dry-run ก่อน, ต้องรับ flag ยืนยันแยก และลบเฉพาะ marker เท่านั้น. ห้าม `TRUNCATE`, ห้าม delete จากตารางโดยไม่มีเงื่อนไข marker. สำหรับแถวที่ไม่มีช่องใส่ marker ต้องผูก FK กับแถว marked parent และตรวจ parent marker ก่อนลบ. Storage ลบเฉพาะ path marker. Test user local ต้องแยกบัญชี; **RLS ปัจจุบันให้ owner มองเห็นข้อมูล owner ทั้งหมด ไม่จำกัดแถวตนเอง** จึงยังไม่ผ่านเงื่อนไข test user จำกัดสิทธิ์ตามโจทย์เดิม: ให้ใช้เฉพาะ local DB ที่แยกขาด, และต้องตกลงแนวทางสิทธิ์ก่อนเขียน DB tests โดยไม่แก้ schema/RLS prod.

## ลำดับรอบ

1. รอบ 1: mock ปลอดภัยและเสี่ยงสูง — Auth/route, cart, order/bill calculations, error states; เพิ่ม Allure epic/feature/story/severity/step และเก็บผล 3 รอบ
2. รอบ 2: local DB security — ตรวจ migration/RLS/RPC, anon/owner/guest token, constraint/atomicity; ทำ registry/cleanup/sweeper ก่อน test เขียนข้อมูล
3. รอบ 3: local CRUD ของ menu/options/tables/order/session/bill/Storage และรายงาน marker คงเหลือศูนย์
4. รอบ 4: E2E 5 flow บน local พร้อม screenshot/trace เมื่อ fail และ Allure report

**จุดหยุดรออนุมัติ:** เอกสารนี้เป็นข้อเสนอเท่านั้น ยังไม่เริ่มเขียน test ในรอบใหม่ และไม่แก้ source/schema/RLS/migration.
