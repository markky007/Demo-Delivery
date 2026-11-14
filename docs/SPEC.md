# ข้อกำหนดระบบสั่งอาหารผ่าน QR สำหรับการพัฒนาใหม่

**ฉบับ:** 1.0 (ร่างสำหรับเริ่มพัฒนา)  
**วันที่จัดทำ:** 6 พฤศจิกายน 2569  
**ระบบอ้างอิง:** DEMO Bang saen ใน repository นี้  
**เทคโนโลยีเป้าหมาย:** Quasar (Vue 3, TypeScript) + Hono บน Cloudflare Workers + Cloudflare D1 + Drizzle ORM  
**สถานะเอกสาร:** ระบุพฤติกรรมจากโค้ดเดิมแยกจากข้อกำหนดที่เสนอสำหรับระบบใหม่; รายการในหัวข้อ 15 ต้องยืนยันก่อนใช้งานจริง

## 1. วิธีอ่านและขอบเขต

เอกสารนี้เป็นสเปกสำหรับ **สร้างระบบใหม่จากฐานข้อมูลว่าง** โดยใช้ระบบเดิมเป็นต้นแบบด้านหน้าจอและกฎธุรกิจ มิใช่คำอธิบายว่าระบบใหม่มีอยู่แล้ว คำว่า **[เดิม]** หมายถึงตรวจพบใน repository; **[ใหม่]** หมายถึงข้อกำหนดหรือการตัดสินใจด้านสถาปัตยกรรมสำหรับการพัฒนาใหม่; **[ยืนยัน]** หมายถึงข้อมูลที่ต้องให้เจ้าของระบบตัดสินใจ

ระบบเดิมเป็นแอป Quasar แอปเดียว เชื่อม Supabase Auth, PostgreSQL RPC และ Storage ผ่าน Vue service โดยตรง ไม่มี backend package แยก มี 18 page component (ลูกค้า 6, เจ้าของร้าน 11, หน้า 404 อีก 1), ตารางหลัก 16 ตาราง และไฟล์ migration 25 ไฟล์ การนับเป็นจำนวนไฟล์/องค์ประกอบที่พบใน repository ไม่ใช่จำนวนงานที่สมบูรณ์พร้อมใช้จริง แหล่งตรวจสอบหลัก: [routes](../src/router/routes.ts), [services](../src/services/), [stores](../src/stores/), [schema และ migrations](../supabase/migrations/), [types](../src/types/).

### 1.1 เป้าหมาย

1. ลูกค้าสแกน QR ของโต๊ะหรือจุดรับกลับบ้าน เปิดเมนู เลือกตัวเลือก สั่งอาหาร ติดตามคิวและออเดอร์ได้
2. เจ้าของร้านจัดการคิว ออเดอร์ โต๊ะ/QR เมนู ตัวเลือก บิล ยอดขาย และการตั้งค่าร้านได้
3. ย้ายกฎสำคัญด้านราคา สิทธิ์ และสถานะจากการเรียก Supabase โดยตรงมาไว้ใน Hono API โดยใช้ D1 เป็นฐานข้อมูลหลัก
4. ใช้ Cloudflare เป็นสภาพแวดล้อมรันระบบ; ภาพเมนูให้เก็บใน Cloudflare R2 หากเปิดใช้ฟังก์ชันอัปโหลดภาพ

### 1.2 ขอบเขตที่ยังไม่รวม

ไม่มี payment gateway, SMS, email, ระบบสมาชิก/สะสมแต้ม, หลายสาขา, เครื่องพิมพ์ใบเสร็จเฉพาะรุ่น, Excel XLSX หรือ PDF ที่สร้างจากเซิร์ฟเวอร์ในระบบเดิม สิ่งเหล่านี้ไม่เป็นข้อกำหนดของรุ่นแรก เว้นแต่เจ้าของระบบเพิ่มขอบเขตภายหลัง การย้ายข้อมูลจริงจาก Supabase ไม่รวมในสเปกฐานข้อมูลว่างนี้

## 2. ผู้ใช้งานและสิทธิ์

| ผู้ใช้งาน   | พฤติกรรมที่พบ [เดิม]                                                                 | สิทธิ์ระบบใหม่ [ใหม่]                                                                     |
| ----------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| ลูกค้า      | ใช้ QR และ guest token ใน browser; ไม่ต้อง login                                     | เข้าถึงเมนูสาธารณะ เปิด/เข้าร่วม session สั่งและแก้ไขออเดอร์ของ guest token ตนเองเท่านั้น |
| เจ้าของร้าน | Login ด้วย Supabase Auth; route เจ้าของร้านมี guard; ไม่พบ role ย่อยที่บังคับใช้จริง | Login ด้วยบัญชีเจ้าของร้าน; จัดการข้อมูลร้านและรายการทั้งหมดตามตารางด้านล่าง              |

**รุ่นแรกมี 2 actor และ 1 ระดับสิทธิ์บัญชีหลังบ้าน (OWNER)** ไม่มี cashier/kitchen/admin แยกสิทธิ์ในโค้ดเดิม จึงไม่ตั้งเป็นข้อเท็จจริง ส่วนคำว่า “ครัว” ในหน้าจอเป็นงานของ OWNER เดียวกัน

| กลุ่มการกระทำ                            | ลูกค้า                                       | OWNER                        |
| ---------------------------------------- | -------------------------------------------- | ---------------------------- |
| อ่านเมนูและข้อมูลโต๊ะที่ QR ระบุ         | ได้                                          | ได้                          |
| เปิด/เข้าร่วม session และสร้างออเดอร์    | ได้ตาม QR/session ของตน                      | ได้ผ่านการจัดการหลังบ้าน     |
| อ่าน/แก้ไขออเดอร์                        | เฉพาะออเดอร์ที่ผูก guest token และยัง QUEUED | ทุกออเดอร์; มีบันทึกการแก้ไข |
| เปลี่ยนสถานะออเดอร์/รายการอาหาร          | ไม่ได้                                       | ได้                          |
| จัดการเมนู โต๊ะ QR บิล รายงาน การตั้งค่า | ไม่ได้                                       | ได้                          |

การซ่อนเมนูและปุ่มใน Quasar เป็นเพียง UX; Hono ต้องตรวจสิทธิ์ทุก request และห้ามเชื่อ role, ราคา, ยอดรวม หรือ session ownership ที่ส่งมาจาก browser

## 3. แผนผังระบบเป้าหมาย

Quasar SPA → Hono API บน Cloudflare Worker → Drizzle ORM → Cloudflare D1  
Cloudflare R2 ใช้เก็บไฟล์ภาพเมนูและโลโก้ (เมื่อเปิดใช้ upload)  
Cloudflare Workers Static Assets ใช้เสิร์ฟ SPA และกำหนด fallback สำหรับ deep link

- [ใหม่] API ทุกตัวใช้ prefix /api/v1; route ของ SPA ตามหัวข้อ 4
- [ใหม่] ฝั่งลูกค้าและ OWNER เรียก Hono API เท่านั้น ไม่มี credential ของ D1/R2 ใน browser
- [ใหม่] ใช้ polling เมื่อหน้าคิว/ออเดอร์เปิดอยู่ ประมาณทุก 5 วินาที และลดความถี่หรือหยุดเมื่อ tab ไม่ active; ไม่อ้างว่ามี Supabase Realtime ในระบบใหม่
- [ใหม่] ใช้ Cloudflare Worker เดียวสำหรับ API และ static assets ได้ โดยกำหนด routing ของ /api/* แยกจาก SPA fallback ตาม [Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/); Hono รองรับ [Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers) และ Drizzle รองรับ [D1 binding](https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1)
- [ใหม่] D1 มี foreign key และเปิด enforcement ตาม [เอกสาร D1](https://developers.cloudflare.com/d1/sql-api/foreign-keys/); งานเขียนหลายตารางต้องทำแบบ atomic ผ่านกลไกที่ D1 รองรับ เช่น [batch](https://developers.cloudflare.com/d1/worker-api/d1-database/) พร้อมทดสอบ rollback จริงก่อนส่งมอบ

## 4. หน้าจอและเส้นทาง

ตารางนี้ถอดจาก [src/router/routes.ts](../src/router/routes.ts) โดยรักษาโครงเส้นทางเดิมเพื่อให้พัฒนา UI ใหม่ได้ตรงงาน ผู้ใช้จะเห็นเฉพาะข้อมูลที่ API อนุญาต

| เส้นทาง                         | หน้าจอ [เดิม]     | ข้อกำหนดระบบใหม่                                                            |
| ------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| /t/:publicToken                 | ต้อนรับ/ตรวจ QR   | แสดงชื่อร้าน โต๊ะ/กลับบ้าน, สถานะ QR, เริ่มหรือเข้าร่วม session             |
| /t/:publicToken/menu            | เมนู              | หมวดหมู่ รายการ ราคา ภาพ สถานะพร้อมขาย ค้นหา/กรองตาม UI เดิม                |
| /t/:publicToken/menu/:itemId    | รายละเอียดสินค้า  | เลือก option ตามกลุ่ม จำนวน หมายเหตุ คำนวณราคาชั่วคราว                      |
| /t/:publicToken/cart            | ตะกร้า            | แก้จำนวน/ลบ ตรวจความถูกต้องก่อนส่ง คงตะกร้าแยกตาม session ใน browser        |
| /t/:publicToken/orders          | ออเดอร์ของลูกค้า  | แสดงออเดอร์ของ guest token ตนเองและคิว                                      |
| /t/:publicToken/orders/:orderId | รายละเอียดออเดอร์ | รายการอาหาร สถานะ ปุ่มแก้ไขเมื่อ QUEUED                                     |
| /owner/login                    | เข้าสู่ระบบ       | Login OWNER และจัดการ session                                               |
| /owner/dashboard                | ภาพรวม            | ตัวชี้วัดคิว โต๊ะ บิลและยอดขาย                                              |
| /owner/queue                    | คิวครัว           | คิววันนี้ สถานะ รายการอาหารที่ทำเสร็จ                                       |
| /owner/orders                   | จัดการออเดอร์     | ค้นหา/กรอง แก้รายการ เปลี่ยนสถานะ ดูประวัติ ลบตามนโยบาย                     |
| /owner/tables                   | โต๊ะและ QR        | เพิ่ม/แก้/ปิดโต๊ะ สร้างใหม่/ยกเลิก QR พิมพ์/ดาวน์โหลด QR จัดการย้าย/รวมโต๊ะ |
| /owner/menu                     | เมนู              | จัดหมวดหมู่ รายการ ราคา ภาพ พร้อมขาย และค่าการทอดที่มีในระบบเดิม            |
| /owner/options                  | ตัวเลือกเสริม     | กลุ่มตัวเลือก/ตัวเลือก ราคา เงื่อนไขเลือก และการผูกเมนู                     |
| /owner/bills                    | บิล               | session ที่เปิดอยู่และสถานะชำระ                                             |
| /owner/bills/:sessionId         | รายละเอียดบิล     | รายการ ยอดรวม เพิ่มรายการเร็ว ปรับราคา รับชำระ พิมพ์ใบเสร็จ ปิด session     |
| /owner/sales                    | ยอดขาย            | ช่วงวันที่ สรุป/กราฟ รายการย้อนหลัง ส่งออก CSV และภาพกราฟ                   |
| /owner/location                 | พิกัดร้าน         | ตั้งค่าพิกัด รัศมี และเปิด/ปิด geofence                                     |
| /:catchAll(._)_                 | ไม่พบหน้า         | แสดง 404                                                                    |

ใช้ CustomerLayout, OwnerLayout และ BlankLayout ตามการแบ่งหน้าจอเดิม ต้องรองรับโทรศัพท์สำหรับลูกค้าและ desktop/tablet สำหรับ OWNER; ปุ่มสำคัญต้องแสดงสถานะ loading/error/success

## 5. ข้อกำหนดฟังก์ชัน

รหัส FR ใช้อ้างใน test และ API contract คำว่า “ต้อง” คือเกณฑ์ส่งมอบของรุ่นแรก

### 5.1 QR, โต๊ะ และ session

| รหัส  | ข้อกำหนด                                                                                                                                                                          |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01 | OWNER เพิ่ม แก้ชื่อ ลำดับ และเปิด/ปิดโต๊ะได้; มีจุดสั่งกลับบ้านหนึ่งจุดต่อร้าน                                                                                                    |
| FR-02 | OWNER สร้าง QR token ใหม่แล้ว token ก่อนหน้าต้องใช้เปิด session ใหม่ไม่ได้; ดาวน์โหลด PNG, ZIP หลายโต๊ะ และพิมพ์ QR ได้ตาม UI เดิม                                                |
| FR-03 | ลูกค้าเปิด QR ที่ active และโต๊ะ active เท่านั้น; หากตั้งเวลาหมดอายุ ต้องตรวจ expires_at ฝั่ง API; แสดงเหตุผล QR ไม่พบ/หมดอายุ/โต๊ะปิด                                            |
| FR-04 | โต๊ะทานที่ร้านมี active session ได้ครั้งละหนึ่งรายการ; guest หลายเครื่องเข้าร่วม session โต๊ะเดียวได้ แต่แต่ละเครื่องมี guest identity แยก                                        |
| FR-05 | จุดสั่งกลับบ้านเปิดหลาย active session พร้อมกันได้ โดยลูกค้าแต่ละคนระบุชื่อและกลับเข้ารายการของตนผ่าน guest token ได้                                                             |
| FR-06 | OWNER ย้าย active session ไปโต๊ะว่าง หรือรวมเข้ากับ active session ปลายทางเมื่อเลือก “รวม”; รายการอาหาร guest และบิลต้องย้าย/รวมแบบ atomic และจัดการ guest token ที่ซ้ำกันหลังรวม |
| FR-07 | ปิด session ว่างได้; session ที่มีออเดอร์ปิดได้เมื่อทุกออเดอร์ SERVED และบิล PAID; session ที่ปิดแล้วสั่งเพิ่มไม่ได้                                                              |

### 5.2 เมนู ตะกร้า และการสั่ง

| รหัส  | ข้อกำหนด                                                                                                                                                                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-08 | OWNER จัดการหมวดหมู่ เมนู ราคาเต็มบาท คำอธิบาย รูป ลำดับ active/available และค่ากำหนดการทอดที่มีในระบบเดิม                                                                                                             |
| FR-09 | OWNER จัดการ option group แบบ single/multi, option, ราคาเพิ่ม, สถานะพร้อมขาย และการผูก group กับเมนู                                                                                                                   |
| FR-10 | ลูกค้าเห็นเฉพาะเมนู/option ที่ active และ available; UI บังคับ required, min/max และรูปแบบ single/multi; API ต้องตรวจซ้ำ รวมถึง group ที่ผูกกับเมนู                                                                    |
| FR-11 | ตะกร้าเก็บใน localStorage โดยแยกตาม session; จำนวนต้องเป็นจำนวนเต็มบวก หมายเหตุไม่เกิน 200 ตัวอักษร; ราคาแสดงเป็นค่าประมาณจน API ยืนยัน                                                                                |
| FR-12 | สร้างออเดอร์ต้องตรวจ active session, guest ownership, รายการ, option, จำนวนและราคาใน API (ตรวจ QR ตอนเปิด/เข้าร่วม session), สร้าง snapshot ชื่อและราคา, ออกเลขคิวประจำวัน, รวมยอด order และ bill ในการเขียนแบบ atomic |
| FR-13 | ลูกค้าแก้ได้เฉพาะออเดอร์ของ guest ตนที่สถานะ QUEUED; การแก้ต้องบันทึก snapshot revision ก่อนแก้และคำนวณยอดใหม่                                                                                                         |
| FR-14 | การส่งคำสั่งซื้อซ้ำจากการกดซ้ำหรือ retry ต้องไม่สร้างออเดอร์ซ้ำ โดยใช้ Idempotency-Key ที่มี unique constraint                                                                                                         |

### 5.3 คิวและงานหลังบ้าน

| รหัส  | ข้อกำหนด                                                                                                                                                                                                                                                              |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-15 | เลขคิวเริ่มใหม่ตามวันที่ Asia/Bangkok; แสดงวันคู่กับเลขคิวเพื่อไม่ให้ซ้ำข้ามวัน                                                                                                                                                                                       |
| FR-16 | สถานะออเดอร์คือ QUEUED, PREPARING, PREPARED, SERVED; OWNER เปลี่ยนตามตารางสถานะหัวข้อ 6; ลูกค้าเห็น PREPARING และ PREPARED เป็นข้อความ “ร้านกำลังเตรียมอาหาร” ตาม UI เดิม                                                                                             |
| FR-17 | OWNER ติ๊กสถานะ “ทำเสร็จ” ราย order item ได้ โดยเก็บ completed_at; การติ๊ก item ไม่เปลี่ยนสถานะ order อัตโนมัติ                                                                                                                                                       |
| FR-18 | OWNER แก้รายการอาหารของออเดอร์และดู revision history ได้; การแก้จำนวน/option/ราคาอัปเดตยอด order และ bill แบบ atomic                                                                                                                                                  |
| FR-19 | OWNER ค้นหา/กรองออเดอร์ตามวันที่ สถานะ โต๊ะ และดูคิววันนี้; ลูกค้าดูเฉพาะออเดอร์ของ guest ตน                                                                                                                                                                          |
| FR-20 | OWNER ลบ session ทั้งชุดตามพฤติกรรมเดิมได้เฉพาะก่อนบิล PAID โดยต้องเห็นคำเตือนว่าออเดอร์อื่นใน session เดียวกันจะถูกลบด้วย, ระบุเหตุผล, บันทึก snapshot ลง audit ก่อนลบ และลบ order/item/bill/guest แบบ atomic; ห้ามลบเพียงออเดอร์เดียวโดยเข้าใจว่า session จะยังอยู่ |

### 5.4 บิลและยอดขาย

| รหัส  | ข้อกำหนด                                                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| FR-21 | หนึ่ง session มีหนึ่ง bill สถานะ PENDING/PAID; ยอด bill เท่าผลรวมยอดทุก order ใน session; ห้ามคิดยอดจากค่าที่ browser ส่ง              |
| FR-22 | OWNER เพิ่มรายการเร็ว เช่น น้ำดื่ม ที่ไม่ผูกเมนูได้ โดยระบุชื่อ ราคา จำนวน; เก็บเป็น order item snapshot ชนิด MANUAL และมี audit       |
| FR-23 | OWNER ปรับราคาฐาน/ยอดรายการและหมายเหตุได้พร้อมบันทึกเหตุผล; ยอด order/bill ต้องคำนวณใหม่; บิล PAID ห้ามแก้โดยตรง                       |
| FR-24 | OWNER บันทึกชำระเงินแบบ manual และเวลา paid_at; ไม่มีการตัดบัตรหรือเชื่อม payment gateway; พิมพ์ใบเสร็จผ่าน browser print              |
| FR-25 | รายงานยอดขายแยกบิล PAID จากยอดค้างชำระ, เลือกช่วงวันที่ตาม Asia/Bangkok, แสดงกราฟ/เมนูขายดี/รายการ และส่งออก CSV กับภาพกราฟตามระบบเดิม |

### 5.5 การตั้งค่าและการแจ้งเตือน

| รหัส  | ข้อกำหนด                                                                                                                                                                   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-26 | OWNER แก้ชื่อร้าน คำอธิบาย โลโก้ และพิกัด/รัศมี/สถานะ geofence ได้                                                                                                         |
| FR-27 | หากเปิด geofence ให้ browser ขอพิกัดเมื่อสั่ง; API รับค่าพิกัดพร้อมเวลาที่วัดและตรวจระยะเทียบพิกัดร้านก่อนรับคำสั่งซื้อ โดยระบุข้อจำกัดว่าพิกัดจากอุปกรณ์ลูกค้าปลอมแปลงได้ |
| FR-28 | แสดงการแจ้งเตือนในหน้าเว็บเมื่อมีออเดอร์ใหม่หรือสถานะเปลี่ยนจาก polling; ไม่มี push/SMS/email ในขอบเขตพื้นฐาน                                                              |

## 6. กฎธุรกิจและกรณีทดสอบสำคัญ

### 6.1 สถานะออเดอร์

ตารางต่อไปนี้ยึด SQL ล่าสุดใน [00015_allow_direct_order_serving.sql](../supabase/migrations/00015_allow_direct_order_serving.sql) ไม่ยึด mapping แบบทีละขั้นใน src/types/enums.ts ซึ่งไม่ตรงกัน

| จาก       | ไปได้                       | ผู้กระทำ |
| --------- | --------------------------- | -------- |
| QUEUED    | PREPARING, PREPARED, SERVED | OWNER    |
| PREPARING | PREPARED, SERVED            | OWNER    |
| PREPARED  | SERVED                      | OWNER    |
| SERVED    | ไม่มี                       | —        |

ลูกค้าแก้เฉพาะ QUEUED ตาม [00021_order_history_and_fix_order_update.sql](../supabase/migrations/00021_order_history_and_fix_order_update.sql) และ EditableStatuses; comment ใน orderService ที่ระบุ QUEUED/PREPARING เป็นข้อความเก่า

### 6.2 ราคาและข้อมูลย้อนหลัง

- เก็บเงินเป็น INTEGER หน่วยบาทตาม schema เดิม; สูตร subtotal = (snapshot_base_price + ผลรวม snapshot_price_adjustment ของ option) × quantity; order.total_amount = ผลรวม subtotal; bill.total_amount = ผลรวม order.total_amount
- เมื่อสร้าง/แก้ order ต้องตรวจ option ที่เลือกว่าผูกกับเมนู กลุ่ม active, option active/available, required/min/max และจำนวนไม่ซ้ำเกินเงื่อนไข แล้วคำนวณราคาใน API
- เก็บ snapshot ชื่อเมนู รายละเอียด ราคา ชื่อ option และราคาเพิ่ม เพื่อให้บิลเก่าไม่เปลี่ยนเมื่อแก้เมนู
- ห้ามแก้ยอดหรือสถานะของบิล PAID; หากต้องคืนเงิน/แก้บิลชำระแล้วต้องออกแบบ flow แยก ซึ่งยังไม่พบในระบบเดิม

### 6.3 session และ token

- publicToken ใน QR ใช้ระบุโต๊ะ ไม่ใช่สิทธิ์ดูออเดอร์ของทุกคน; guestToken เป็น secret เฉพาะ browser/session เก็บแยกตาม session ใน browser และส่งผ่าน Authorization header โดยไม่ใส่ URL หรือ log; ตั้งอายุ token และลบทิ้งเมื่อปิด session
- การเปลี่ยน QR ต้องไม่ตัด session ที่เปิดอยู่โดยอัตโนมัติ เว้นแต่ OWNER ปิดหรือย้าย session; การสร้างออเดอร์ใหม่ต้องตรวจสถานะ session และนโยบาย QR ที่ตกลงกัน
- เดิม QR resolver ไม่ตรวจ expires_at ทั้งที่ comment ระบุว่าตรวจ; ระบบใหม่ต้องตรวจจริงหากเปิดใช้ expiry
- เดิมตรวจ geofence ที่ CartPage ฝั่ง client; ระบบใหม่ตรวจฝั่ง API ด้วย แต่ไม่ถือเป็นการพิสูจน์การอยู่ในพื้นที่อย่างแน่นอน

### 6.4 เกณฑ์รับงานเชิงธุรกิจขั้นต่ำ

| กรณี                                                  | ผลที่ต้องได้                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| สแกน QR ที่ถูกยกเลิก/หมดอายุ                          | ไม่เปิด session ใหม่; ตอบรหัสข้อผิดพลาดที่ UI แสดงได้                                        |
| ลูกค้า 2 เครื่องสั่งโต๊ะเดียวกัน                      | อยู่ใน table session เดียว แต่เห็น/แก้ออเดอร์แยกตาม guest token                              |
| ลูกค้า 2 คนใช้ QR กลับบ้าน                            | ได้ 2 session และ 2 bill แยกกัน                                                              |
| ราคาเมนูเปลี่ยนหลังมีออเดอร์                          | ออเดอร์เดิมและบิลเดิมยังใช้ snapshot ราคาเดิม                                                |
| คำสั่งซื้อถูกส่งซ้ำด้วย Idempotency-Key เดิม          | ได้ order เดิม ไม่สร้างคิวหรือยอดซ้ำ                                                         |
| ลูกค้าแก้ออเดอร์ที่ PREPARING                         | API ปฏิเสธ และข้อมูลไม่เปลี่ยน                                                               |
| OWNER ลบออเดอร์ใน session ที่มีหลายออเดอร์            | แสดงจำนวนออเดอร์ที่จะถูกลบและต้องยืนยันอีกครั้ง; audit เก็บ snapshot ก่อนลบ; บิล PAID ปฏิเสธ |
| OWNER รวม session                                     | ยอดรวมถูกต้อง ไม่มี order/guest/bill กำพร้า; ถ้าขั้นใดล้มเหลวต้อง rollback ทั้งหมด           |
| ปิด session ที่มี order ไม่ SERVED หรือ bill ไม่ PAID | API ปฏิเสธ                                                                                   |
| บุคคลทั่วไปเรียก API ของ OWNER                        | 401/403; D1/R2 ไม่ถูกเรียกด้วยสิทธิ์ผู้ใช้ทั่วไป                                             |

## 7. แบบข้อมูล D1 ที่เสนอ

**ตารางด้านล่างเป็นแบบใหม่ที่เสนอ ไม่ใช่การอ้างว่า D1 schema มีอยู่แล้ว** เริ่มจาก 16 ตารางเดิมและเพิ่มตารางสำหรับ authentication/session/audit/idempotency ตามความจำเป็น บังคับ foreign key, index และ unique constraint ใน Drizzle schema และ migration

| ตารางเป้าหมาย               | แหล่งอ้างอิงเดิม        | คีย์/ความสัมพันธ์และหน้าที่                                                                                            |
| --------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| restaurants                 | restaurants             | id; ข้อมูลร้าน/พิกัด/รัศมี                                                                                             |
| tables                      | tables                  | restaurant_id → restaurants; name, kind = DINE_IN/TAKEAWAY, sort_order, is_active                                      |
| table_qr_tokens             | table_qr_tokens         | table_id → tables; token_hash UNIQUE, is_active, expires_at, revoked_at                                                |
| table_sessions              | table_sessions          | table_id → tables; kind, status, customer_name, merged_into_session_id → table_sessions                                |
| guest_sessions              | guest_sessions          | table_session_id → table_sessions; token_hash, created_at                                                              |
| menu_categories             | menu_categories         | restaurant_id → restaurants; ชื่อ/ลำดับ/สถานะ                                                                          |
| menu_items                  | menu_items              | category_id → menu_categories; ชื่อ ราคา ภาพ สถานะ fry_config                                                          |
| option_groups               | option_groups           | restaurant_id → restaurants; selection_type, required/min/max                                                          |
| options                     | options                 | option_group_id → option_groups; ชื่อ ราคาเพิ่ม สถานะ fry_config                                                       |
| menu_item_option_groups     | menu_item_option_groups | menu_item_id → menu_items; option_group_id → option_groups                                                             |
| orders                      | orders                  | table_session_id → table_sessions; guest_session_id → guest_sessions; queue_date, queue_number, status, total_amount   |
| order_items                 | order_items             | order_id → orders; menu_item_id nullable → menu_items; item_type MENU/MANUAL, snapshot, quantity, subtotal, completion |
| order_item_options          | order_item_options      | order_item_id → order_items; option_id nullable → options; snapshot ชื่อ/ราคา                                          |
| bills                       | bills                   | table_session_id UNIQUE → table_sessions; total_amount, status, paid_at                                                |
| daily_queue_counters        | daily_queue_counters    | (restaurant_id, queue_date) UNIQUE; next_number                                                                        |
| order_histories             | order_histories         | order_id → orders; revision, actor_type, snapshot JSON, created_at                                                     |
| owner_users **[ใหม่]**      | —                       | restaurant_id → restaurants; login identifier, password_hash, is_active                                                |
| owner_sessions **[ใหม่]**   | —                       | owner_user_id → owner_users; token_hash, expires_at, revoked_at                                                        |
| audit_events **[ใหม่]**     | —                       | actor_type/id, action, target, before/after JSON, created_at                                                           |
| idempotency_keys **[ใหม่]** | —                       | scope + key UNIQUE; request_hash, response reference, expires_at                                                       |

**รวมแบบที่เสนอ 20 ตาราง** โดย 16 ตารางแรกสืบหน้าที่จาก schema เดิมและ 4 ตารางสุดท้ายเป็นข้อเสนอใหม่ ตัวเลขนี้เป็นจำนวนตารางในแบบร่าง ไม่ใช่จำนวนตารางที่ deploy แล้ว

ข้อกำหนดชนิดข้อมูล: ID เป็น UUID string; เงินเป็น INTEGER CHECK >= 0; เวลาเก็บเป็น UTC ISO string และแปลงวันที่ธุรกิจเป็น Asia/Bangkok; enum ใช้ TEXT + CHECK; ค่า fry_config และ snapshot เก็บ JSON ใน TEXT พร้อม schema validation ที่ API; index อย่างน้อยที่ FK, orders(queue_date, queue_number), orders(table_session_id), orders(guest_session_id), bills(status, paid_at), table_sessions(table_id, status) และ token_hash. D1 migration ต้องสร้างผ่านไฟล์ version ใหม่และทดสอบทั้ง local/remote ตาม [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)

**Invariant ที่ต้องบังคับใน DB/API:** โต๊ะ DINE_IN เปิด session ได้หนึ่ง session ในเวลาเดียวกัน; TAKEAWAY เปิดได้หลาย session; active QR หนึ่ง token ต่อโต๊ะ; bill หนึ่งใบต่อ session; queue_number ไม่ซ้ำภายใน restaurant_id + queue_date; order ของ guest ต้องอยู่ใน table_session เดียวกัน; bill ของ session ที่ PAID ไม่รับการแก้รายการอาหาร

## 8. สัญญา Hono API รุ่นแรก

ทุก endpoint ตอบ JSON เว้นแต่ไฟล์ดาวน์โหลด ใช้ version /api/v1; OWNER ต้องมี owner session cookie แบบ HttpOnly, Secure, SameSite=Lax; customer ใช้ guest token ใน Authorization header แยกตาม table session และแยกจาก QR token รูปแบบผลสำเร็จ { data, meta? }; ผลผิดพลาด { error: { code, message, details? }, requestId } โดย message สำหรับผู้ใช้เป็นภาษาไทยและ code เสถียรสำหรับ frontend

| วิธีและเส้นทาง                                     | ผู้ใช้  | งาน                                                          |
| -------------------------------------------------- | ------- | ------------------------------------------------------------ |
| GET /api/v1/qr/:publicToken                        | สาธารณะ | ตรวจ QR/ข้อมูลร้าน/โต๊ะ                                      |
| POST /api/v1/customer/sessions                     | ลูกค้า  | เปิด/เข้าร่วม session โดย publicToken; รับ guest session     |
| GET /api/v1/customer/session                       | ลูกค้า  | อ่าน session ปัจจุบัน                                        |
| GET /api/v1/menu                                   | สาธารณะ | หมวดหมู่และเมนูพร้อมขาย                                      |
| GET /api/v1/menu/:itemId                           | สาธารณะ | รายละเอียดเมนูและ option                                     |
| POST /api/v1/customer/orders                       | ลูกค้า  | สร้างออเดอร์; ต้องมี Idempotency-Key                         |
| GET /api/v1/customer/orders                        | ลูกค้า  | ออเดอร์ของ guest ปัจจุบัน                                    |
| GET /api/v1/customer/orders/:orderId               | ลูกค้า  | รายละเอียดออเดอร์                                            |
| PUT /api/v1/customer/orders/:orderId               | ลูกค้า  | แก้ออเดอร์ QUEUED ของตน                                      |
| GET /api/v1/customer/queue                         | ลูกค้า  | ตำแหน่งคิวของออเดอร์ที่ตนเห็น                                |
| POST /api/v1/owner/auth/login                      | สาธารณะ | Login OWNER                                                  |
| POST /api/v1/owner/auth/logout                     | OWNER   | ยกเลิก owner session                                         |
| GET /api/v1/owner/auth/me                          | OWNER   | ข้อมูลบัญชีปัจจุบัน                                          |
| GET /api/v1/owner/dashboard                        | OWNER   | ตัวชี้วัดภาพรวม                                              |
| GET /api/v1/owner/queue                            | OWNER   | คิววันนี้                                                    |
| GET /api/v1/owner/orders                           | OWNER   | ค้นหา/กรองออเดอร์                                            |
| GET /api/v1/owner/orders/:orderId                  | OWNER   | รายละเอียดและ revision                                       |
| PUT /api/v1/owner/orders/:orderId                  | OWNER   | แก้รายการอาหาร                                               |
| DELETE /api/v1/owner/orders/:orderId               | OWNER   | ลบ session ทั้งชุดตาม FR-20 โดยส่งเหตุผลและยืนยันจำนวนรายการ |
| PATCH /api/v1/owner/orders/:orderId/status         | OWNER   | เปลี่ยนสถานะ                                                 |
| PATCH /api/v1/owner/order-items/:itemId/completion | OWNER   | ติ๊กอาหารเสร็จ                                               |
| GET/POST /api/v1/owner/tables                      | OWNER   | รายการ/เพิ่มโต๊ะ                                             |
| PATCH /api/v1/owner/tables/:tableId                | OWNER   | แก้โต๊ะ                                                      |
| POST /api/v1/owner/tables/:tableId/qr              | OWNER   | สร้าง QR ใหม่/ยกเลิกเดิม                                     |
| POST /api/v1/owner/sessions/:sessionId/transfer    | OWNER   | ย้าย/รวมโต๊ะ                                                 |
| POST /api/v1/owner/sessions/:sessionId/close       | OWNER   | ปิด session                                                  |
| GET/POST /api/v1/owner/categories                  | OWNER   | รายการ/เพิ่มหมวด                                             |
| PATCH/DELETE /api/v1/owner/categories/:categoryId  | OWNER   | แก้/ปิดใช้หมวด                                               |
| GET/POST /api/v1/owner/menu-items                  | OWNER   | รายการ/เพิ่มเมนู                                             |
| PATCH/DELETE /api/v1/owner/menu-items/:itemId      | OWNER   | แก้/ปิดใช้เมนู                                               |
| GET/POST /api/v1/owner/option-groups               | OWNER   | รายการ/เพิ่มกลุ่ม                                            |
| PATCH/DELETE /api/v1/owner/option-groups/:groupId  | OWNER   | แก้/ปิดใช้กลุ่ม                                              |
| GET/POST /api/v1/owner/options                     | OWNER   | รายการ/เพิ่ม option                                          |
| PATCH/DELETE /api/v1/owner/options/:optionId       | OWNER   | แก้/ปิดใช้ option                                            |
| GET /api/v1/owner/bills                            | OWNER   | รายการบิล                                                    |
| GET /api/v1/owner/bills/:sessionId                 | OWNER   | บิลตาม session                                               |
| POST /api/v1/owner/bills/:sessionId/quick-items    | OWNER   | เพิ่มรายการเร็ว                                              |
| PATCH /api/v1/owner/order-items/:itemId/price      | OWNER   | ปรับราคา/หมายเหตุ                                            |
| POST /api/v1/owner/bills/:sessionId/pay            | OWNER   | บันทึกชำระ                                                   |
| GET /api/v1/owner/sales                            | OWNER   | สรุปยอดและกราฟ                                               |
| GET /api/v1/owner/sales/export.csv                 | OWNER   | ส่งออก CSV                                                   |
| GET/PATCH /api/v1/owner/restaurant                 | OWNER   | อ่าน/แก้การตั้งค่าร้าน                                       |
| POST /api/v1/owner/uploads                         | OWNER   | อัปโหลดภาพเข้า R2                                            |

รายการ GET/POST หรือ PATCH/DELETE ในแถวเดียวหมายถึง **สอง endpoint แยกกัน**; การกำหนดชื่อและ payload สุดท้ายทำใน OpenAPI ก่อน coding ห้ามใช้แถวนี้เป็นจำนวน endpoint ที่ implement แล้ว

### 8.1 Payload หลัก

**สร้าง/แก้ออเดอร์:** { tableSessionId, items: [{ menuItemId, quantity, optionIds: [], specialInstruction }] } สำหรับลูกค้า; guest identity มาจาก Authorization header ไม่ส่ง guestSessionId เพื่อแอบอ้าง API ตอบ { order: { id, queueDate, queueNumber, status, totalAmount, items: [...] } } โดยราคาเป็น snapshot ฝั่ง server

**ย้าย/รวมโต๊ะ:** { targetTableId, mergeIfOccupied: boolean } ถ้าโต๊ะปลายทางมี active session และ mergeIfOccupied=false ตอบ 409 TABLE_OCCUPIED

**รับชำระ:** { paymentMethod: "CASH" | "TRANSFER" | "OTHER", note? } เป็นเพียงการบันทึกการชำระ ไม่ใช่ payment gateway; ระบบเดิมมีเพียง PAID/PENDING จึงต้องยืนยันว่าเก็บวิธีชำระหรือไม่

**HTTP:** 400/422 สำหรับข้อมูลไม่ถูกต้อง, 401 เมื่อไม่มี session, 403 เมื่อไม่มีสิทธิ์, 404 เมื่อไม่พบหรือไม่ควรเปิดเผย record, 409 สำหรับ conflict ด้านสถานะ, 429 เมื่อเกินอัตรา, 500 พร้อม requestId สำหรับ error ภายใน; ห้ามส่ง SQL error/stack/secret ให้ browser

## 9. Authentication, security และ audit

1. [ใหม่] OWNER login ผ่าน Hono, hash password ด้วยวิธีที่รองรับ Workers และมีการทดสอบ, session cookie แบบ HttpOnly/Secure/SameSite, session expiration และ logout; rate limit login
2. [ใหม่] ใช้ CSRF protection สำหรับคำสั่งเปลี่ยนข้อมูลที่อาศัย cookie; CORS จำกัด origin; ตรวจ input ด้วย schema กลางที่ Hono route ใช้ร่วมกับ TypeScript type
3. [ใหม่] public QR token และ guest token ต้องสุ่มด้วย Web Crypto; เก็บ hash ใน D1; guest token ที่อยู่ใน browser ต้องจำกัดอายุและลดความเสี่ยง XSS ด้วย CSP/output escaping; อย่า log token หรือส่งใน analytics; จำกัดการเรียก API ที่เปิดสาธารณะ
4. [ใหม่] OWNER API ตรวจบัญชีและ restaurant ownership ทุกครั้ง; customer API ตรวจ guest/session ownership; ห้ามเปิด D1 หรือ R2 write endpoint ให้ browser โดยตรง
5. [ใหม่] audit_events สำหรับ login, เปลี่ยน QR, ย้าย/รวมโต๊ะ, แก้ออเดอร์/ราคา, ชำระบิล, ปิด session และการตั้งค่า; เก็บ actor, เวลา, target, ก่อน/หลังที่จำเป็น โดยไม่เก็บ password/token
6. [เดิม] การรักษาสิทธิ์อาศัย Supabase RLS/RPC; migration บางส่วนเปิด RPC/Storage กว้างเกินการใช้งานหลังบ้าน จึงต้องออกแบบสิทธิ์ใหม่ใน Hono ไม่คัดลอก grant เดิม

## 10. File storage, export และรายงาน

- [เดิม] ภาพเมนูใช้ Supabase Storage; QR PNG/ZIP และภาพกราฟสร้างใน browser; CSV ส่งออกจากหน้ารายงาน; ใบเสร็จใช้ window.print()
- [ใหม่] อัปโหลดภาพผ่าน OWNER API ไป R2 เท่านั้น; ตรวจชนิด MIME/ขนาด, ตั้งชื่อไฟล์แบบไม่ชนกัน, ผูก URL/key กับ menu_items หรือ restaurants, ลบไฟล์กำพร้าตามนโยบายที่ยืนยัน
- [ใหม่] QR PNG/ZIP และภาพกราฟสร้างใน browser ได้; CSV ต้อง escape formula injection และใช้ UTF-8 BOM หากต้องเปิดใน Excel ภาษาไทย; พิมพ์ใบเสร็จด้วย print stylesheet
- [ใหม่] รายงานรายวันใช้เขตเวลา Asia/Bangkok; ยอดขายรับรู้จากบิล PAID ตาม paid_at และแสดงยอดค้างชำระแยก ข้อนี้เป็นนิยามใหม่ที่ต้องยืนยันกับเจ้าของร้าน

## 11. คุณภาพระบบและการปฏิบัติการ

| เรื่อง         | ข้อกำหนดรุ่นแรก [ใหม่]                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ความเร็ว       | หน้าเมนูและรายการคิวต้องตอบ API p95 ไม่เกิน 1 วินาทีภายใต้ข้อมูลทดสอบ 1 ร้าน, 100 โต๊ะ, 500 เมนู, 1,000 ออเดอร์/วัน; ทดสอบหลัง deploy จริงก่อนรับงาน                                       |
| การใช้งาน      | ลูกค้าใช้งานจอมือถือ 360px ขึ้นไป; OWNER ใช้ tablet/desktop; แสดง loading, empty, offline/retry และข้อผิดพลาดภาษาไทย                                                                       |
| ความถูกต้อง    | คำสั่งซื้อ/แก้ไข/รวมโต๊ะ/ชำระต้อง atomic และ retry ได้อย่างปลอดภัย; ป้องกันเลขคิวและบิลซ้ำ                                                                                                 |
| เวลา           | บันทึก UTC; วันที่คิว/รายงานแปลง Asia/Bangkok อย่างสม่ำเสมอ                                                                                                                                |
| Backup         | เปิดใช้และทดสอบการกู้ D1 ด้วย [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/); เก็บ/export ภาพ R2 และค่าตั้งค่าที่จำเป็นตามนโยบายสำรองข้อมูลที่เจ้าของร้านกำหนด |
| Monitoring     | เก็บ requestId, error rate, latency, จำนวนคำสั่งซื้อ/ข้อผิดพลาดสำคัญใน Cloudflare logs/analytics; ตั้งแจ้งเตือนเมื่อ API ล้มเหลวหรือ error พุ่ง                                            |
| Availability   | พึ่งพา Cloudflare Workers/D1/R2; ไม่มี SLA เชิงตัวเลขในโค้ดเดิม จึงต้องตกลงตัวเลข uptime และเวลาตอบสนองก่อนสัญญา                                                                           |
| Data retention | เก็บออเดอร์ บิล audit และ guest token ตามระยะเวลาที่เจ้าของระบบกำหนด; ยังไม่มีนโยบายยืนยัน                                                                                                 |

ค่า p95 และชุดข้อมูลเป็น **เป้าหมายเสนอเพื่อทดสอบ** ไม่ใช่ผลการวัดของระบบเดิม D1 มีข้อจำกัดรูปแบบการประมวลผลต่อฐานข้อมูล จึงต้องวัดภาระจริงก่อนรับรองจำนวนผู้ใช้พร้อมกันตาม [Cloudflare D1 FAQ](https://developers.cloudflare.com/d1/reference/faq/)

## 12. โครงงานและการส่งมอบ

โครงสร้างที่เสนอ: apps/web (Quasar), apps/api (Hono Worker), packages/domain (schema validation/types/กฎราคาและสถานะที่ใช้ร่วมกัน), packages/db (Drizzle schema และ migrations) หรือโครงสร้างเทียบเท่าที่ build/deploy ได้จริง โครงนี้เป็นข้อเสนอสำหรับระบบใหม่; repository เดิมไม่ได้มี monorepo backend

| สภาพแวดล้อม | ข้อกำหนด                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| Local       | Quasar dev server + Wrangler local D1/R2 binding; seed ร้าน/OWNER/โต๊ะตัวอย่าง โดยไม่ใช้ production data |
| UAT         | Worker, D1 และ R2 แยกจาก production; ใช้ข้อมูลทดสอบและ QR ทดสอบ                                          |
| Production  | Worker static assets/API, D1, R2, domain และ secret แยก; migration ผ่านขั้นตรวจและ backup ก่อน apply     |

ขั้นทำงาน: (1) ยืนยันหัวข้อ 15 และ OpenAPI; (2) สร้าง Drizzle schema/migration/seed; (3) Hono auth และ API ตาม FR; (4) Quasar pages/stores; (5) ทดสอบ flow และแก้ defect; (6) UAT และ deploy. ส่งมอบ source code ของระบบใหม่, migration, OpenAPI, ER diagram, วิธีติดตั้ง/deploy/rollback, คู่มือ OWNER, คู่มือลูกค้า, test report และรายการค่าตั้งค่าโดยไม่แนบ secret

## 13. แผนทดสอบและเกณฑ์ตรวจรับ

1. **Unit:** สูตรราคา, option required/min/max, สถานะ, วันคิว Asia/Bangkok, token/permission helper
2. **API integration กับ D1 local:** unique/index/FK, atomic write/rollback, idempotency, concurrent queue, permission, session merge, snapshot ราคา
3. **E2E:** QR ทานที่ร้าน → เลือกเมนู → สั่ง → คิว → OWNER ทำอาหาร → ชำระ → ปิดโต๊ะ; QR กลับบ้าน 2 คน; ย้าย/รวมโต๊ะ; QR ถูกยกเลิก; แก้ออเดอร์ก่อน/หลังเริ่มทำ
4. **Security:** ลูกค้าดูออเดอร์คนอื่นไม่ได้; endpoint OWNER ถูกปฏิเสธเมื่อไม่ login; CSRF, upload validation, rate limit และ output escaping
5. **UAT:** เจ้าของร้านตรวจชื่อสถานะ, ราคา, รูปใบเสร็จ, รายงานและ flow งานจริง พร้อมลงรายการข้อบกพร่อง; ต้องแก้ข้อบกพร่องระดับทำงานไม่ได้/ยอดเงินผิด/สิทธิ์รั่วก่อนส่งมอบ

## 14. สิ่งที่พบในระบบเดิมแต่ไม่ควรคัดลอกตรงตัว

- ไม่มี automated test suite ใน package.json; typecheck/build เดิมติดข้อผิดพลาดใน MenuItemModal.vue และมีไฟล์ไม่ผ่าน Prettier จึงถือเป็น **ข้อบกพร่องของต้นแบบ** ไม่ใช่คุณสมบัติที่ส่งมอบของระบบใหม่
- migration มีเลข 00022 ซ้ำ และไม่มี 00005; ระบบใหม่ต้องเริ่ม migration history ใหม่ ไม่ import history นี้
- src/types/database.ts และหน้าเมนูอ้าง main_ingredient แต่ไม่พบคอลัมน์นี้ใน migration ที่ตรวจ; ต้องยืนยันว่าฟิลด์นี้จำเป็นก่อนออกแบบ D1
- QR resolver ไม่ตรวจวันหมดอายุจริง; geofence เดิมตรวจที่ browser; create_order เดิมตรวจราคา/availability แต่ไม่ครอบคลุม linkage และ required/min/max ทุกเงื่อนไข; ระบบใหม่กำหนด validation ฝั่ง API
- fallback บาง service เขียนข้อมูลหลายตารางจาก browser เมื่อ RPC ไม่พร้อม; ระบบใหม่ต้องใช้ API และ atomic operation เท่านั้น
- ระบบเดิมไม่มี backend Hono, D1, Drizzle, R2, Cloudflare Auth, payment gateway, email, SMS, cron หรือ queue; รายการที่เสนอในเอกสารนี้คือ **งานสร้างใหม่**

## 15. ประเด็นที่เจ้าของระบบต้องยืนยันก่อนล็อกสเปก

1. สั่งกลับบ้านต้องระบุชื่อลูกค้าอย่างเดียว หรือมีเบอร์โทร/เลขรับอาหารด้วย? ระบบเดิมมี customer_name
2. ต้องย้ายข้อมูลร้าน เมนู ออเดอร์ บิล หรือรูปจาก Supabase เดิมหรือเริ่มฐานข้อมูลว่างทั้งหมด?
3. ต้องใช้ฟิลด์ main_ingredient และ fry_config ในรุ่นแรกอย่างไร? ความหมายของค่าการทอดต้องระบุให้ชัด
4. การลบ session ทั้งชุดตาม FR-20 ควรเปลี่ยนเป็นสถานะ “ยกเลิก” แบบเก็บประวัติแทนการลบจริงหรือไม่? ถ้าเปลี่ยนต้องกำหนดผลต่อเลขคิว บิล และรายงาน
5. QR ที่สร้างใหม่ต้องตัดสิทธิ์การสั่งของ active session เดิมหรือให้สั่งต่อจนปิด session? QR ต้องหมดอายุหรือใช้ถาวร?
6. วิธีชำระเงินที่ต้องบันทึกมีอะไรบ้าง; ต้องรองรับคืนเงิน/แก้บิลหลัง PAID หรือไม่?
7. นิยามยอดขายให้ใช้วันที่ชำระเงินของบิล PAID ตามข้อเสนอ หรือวันที่สร้างออเดอร์?
8. ใช้ geofence เป็นเพียงเงื่อนไข UX หรือเป็นเงื่อนไขบังคับทางธุรกิจ? ต้องมีกรณีอนุโลมเมื่อ GPS ใช้งานไม่ได้หรือไม่?
9. ต้องมีบัญชี OWNER กี่บัญชี และต้องแยกสิทธิ์ครัว/แคชเชียร์ในอนาคตหรือไม่?
10. ต้องการนโยบาย retention, backup, uptime, ขนาดไฟล์รูป, domain และ Cloudflare account ของผู้ใด?

---

**หมายเหตุด้านราคาและบริการ:** สเปกนี้ระบุงานพัฒนาระบบใหม่ ไม่รวมค่าใช้บริการ Cloudflare ตามการใช้งานจริง และไม่กำหนดสิทธิ์ใน source code หรือค่าบริการรายเดือน; ให้ใช้เอกสารข้อเสนอเชิงพาณิชย์แยกต่างหาก
