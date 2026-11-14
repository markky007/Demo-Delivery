# Prompt สำหรับพัฒนาระบบใหม่จากโค้ดอ้างอิงเดิม

คัดลอกข้อความตั้งแต่หัวข้อ “เริ่ม Prompt” ถึง “จบ Prompt” ไปใช้กับ coding agent ใน repository ใหม่ หลัง clone repository ให้เรียบร้อย

## เริ่ม Prompt

คุณเป็น Senior Full-stack Engineer และ Solution Architect รับผิดชอบสร้างระบบสั่งอาหารผ่าน QR ของร้าน DEMO Bang saen **ใหม่ทั้งระบบ** จากโค้ดอ้างอิงที่คัดลอกมาใน repository นี้

### เป้าหมายและแหล่งความจริง

1. อ่าน docs/SPEC.md ทั้งฉบับก่อนเริ่ม แล้วใช้ FR-01 ถึง FR-28, กฎธุรกิจ, ตารางข้อมูล, API contract และ acceptance cases เป็นเกณฑ์ส่งมอบหลัก
2. อ่าน src/pages, src/components, src/stores, src/services, src/types, src/router, supabase/migrations, README.md และ DESIGN.md เพื่อถอด UX และพฤติกรรมจริงของระบบเดิม หากพบข้อขัดแย้งระหว่างเอกสารกับโค้ด ให้ระบุหลักฐานและตัดสินใจโดยรักษากฎธุรกิจล่าสุดใน migration; ถ้าตัดสินไม่ได้ให้บันทึกคำถามใน docs/DECISIONS.md แล้วเดินหน้าส่วนที่ไม่ติดขัด
3. โค้ดที่คัดลอกมาเป็น **legacy reference** เท่านั้น อย่าคิดว่า backend ใหม่มีอยู่แล้ว ห้ามคัดลอก PostgreSQL function, RLS หรือ Supabase client มาใช้เป็น runtime ของระบบใหม่
4. ผลลัพธ์ต้องเป็นระบบที่ run, test, build และ deploy ได้จริงบน Cloudflare โดยใช้ **Quasar + Vue 3 + TypeScript สำหรับ frontend; Hono บน Cloudflare Workers สำหรับ API; Cloudflare D1 + Drizzle ORM สำหรับข้อมูล; Cloudflare R2 สำหรับภาพที่อัปโหลด** ห้ามเพิ่ม Supabase หรือบริการ backend อื่นใน runtime
5. เริ่ม D1 schema/migration ใหม่จากศูนย์; อย่าใช้ migration history เดิมที่มีเลข 00022 ซ้ำและเลข 00005 ขาด ข้อมูล production จาก Supabase ยังไม่อยู่ในขอบเขตจนกว่าจะได้รับข้อมูลและสิทธิ์จากเจ้าของระบบ

### วิธีดำเนินงาน

1. สำรวจ repo แล้วเขียน docs/IMPLEMENTATION_PLAN.md แบบสั้นที่จับคู่แต่ละ FR กับหน้า, API, ตาราง และ test; ระบุข้อขัดแย้ง/ข้อสงสัยจาก docs/SPEC.md
2. สร้างโครงงานที่ชัดเจน เช่น apps/web, apps/api, packages/domain, packages/db โดยย้ายหรือปรับ Quasar UI เดิมตามความเหมาะสม อย่าลบฟีเจอร์ที่มีหลักฐานว่าใช้งานได้เพียงเพื่อให้ build ผ่าน
3. สร้าง Drizzle schema, D1 migrations, constraints, indexes, seed data สำหรับ local/UAT และ ER diagram; เก็บราคาเป็น INTEGER หน่วยบาทและเวลา UTC โดยตีความวันที่ธุรกิจเป็น Asia/Bangkok
4. สร้าง Hono API /api/v1 พร้อม validation, error format, authentication, ownership check, audit, idempotency และ atomic write ตาม docs/SPEC.md สร้าง OpenAPI ให้ตรงกับ implementation
5. ย้าย frontend ให้เรียก Hono API ผ่าน service layer แทน Supabase โดยคงเส้นทางและประสบการณ์ของลูกค้า/OWNER ที่ระบุใน spec; ปรับ Pinia stores และ polling ของคิว/ออเดอร์; ใช้ R2 ผ่าน API สำหรับภาพ
6. เพิ่ม unit, API integration และ E2E tests สำหรับ acceptance cases ใน spec โดยเฉพาะราคา snapshot, option validation, คิวข้ามวัน, คำสั่งซื้อซ้ำ, สิทธิ์ลูกค้า, ย้าย/รวมโต๊ะ, บิล PAID และ rollback เมื่อเขียนหลายตารางล้มเหลว
7. สร้างไฟล์ config สำหรับ Local/UAT/Production, วิธีตั้ง secrets โดยไม่ commit ค่า, วิธี migrate/rollback, วิธี deploy Cloudflare Workers Static Assets + API + D1 + R2 และ README ที่ทำตามได้จริง
8. รัน lint, format check, typecheck, unit, integration, E2E ที่เกี่ยวข้อง และ production build; แก้ข้อบกพร่องของระบบใหม่ทั้งหมดก่อนรายงานว่าพร้อมส่งมอบ แยกข้อบกพร่องของ legacy baseline ออกจากผลใหม่

### กฎสำคัญ

- งานที่ทำต้องจบเป็น vertical slice ที่ใช้งานได้จริง ไม่ทิ้ง stub, mock data หรือ TODO ใน production path แล้วนับว่าส่งมอบ
- ทุกคำสั่งเปลี่ยนราคา บิล ออเดอร์ สถานะ QR และการย้ายโต๊ะต้องตรวจสิทธิ์ใน API; Vue route guard ใช้เพื่อ UX เท่านั้น
- คำนวณราคาจากเมนู/option ใน D1, ตรวจ required/min/max และความสัมพันธ์ option group กับเมนูฝั่ง API; snapshot ราคาและชื่อเมื่อสร้างออเดอร์
- ลูกค้าแก้เฉพาะออเดอร์ QUEUED ของ guest token ตน; OWNER ต้อง login; guest token ต้องไม่อยู่ใน URL หรือ log
- การสร้างออเดอร์และการรวมโต๊ะต้อง atomic; คิวไม่ซ้ำตามวัน Asia/Bangkok; กดสั่งซ้ำต้องไม่สร้างรายการหรือยอดซ้ำ
- ห้ามให้ browser ติดต่อ D1/R2 โดยตรง และห้ามส่ง secret/connection string ไป frontend
- ระวังความคลาดเคลื่อนของต้นแบบ: main_ingredient ถูกอ้างใน TypeScript แต่ไม่พบใน migration; QR resolver เดิมไม่ตรวจ expires_at; geofence เดิมตรวจ client; build เดิมติด .value ใน MenuItemModal.vue; Supabase migration เดิมมีเลขซ้ำ
- อัปเดต AGENTS.md, README.md และ docs/SPEC.md เฉพาะเมื่อ implementation ใหม่เปลี่ยนข้อเท็จจริงหรือเมื่อเจ้าของระบบตัดสินใจประเด็นค้าง; ระบุเหตุผลการเปลี่ยน
- ไม่ deploy, push migration ไปฐานข้อมูลจริง หรือแก้ค่าบัญชี Cloudflare จริงจนกว่าจะมีข้อมูล environment และการอนุมัติจากเจ้าของระบบ

### เกณฑ์รายงานความสำเร็จ

รายงานเป็นตาราง: FR แต่ละข้อ → ไฟล์ implementation → test ที่ผ่าน → สถานะ; พร้อมคำสั่ง run/build/deploy, รายการ environment variables, migration ที่เพิ่ม, ข้อจำกัดที่ยังเหลือ และคำถามที่ต้องให้เจ้าของระบบยืนยัน ห้ามรายงานว่า “เสร็จแล้ว” หากยังมี flow หลักที่เป็น stub หรือ tests สำคัญไม่ผ่าน

## จบ Prompt
