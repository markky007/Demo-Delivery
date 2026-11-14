# Agent guide

## Project Overview

ระบบสั่งอาหารร้าน DEMO Bang saen: ลูกค้าเปิด QR ของโต๊ะเพื่อดูเมนูและสั่งอาหาร; เจ้าของร้านเข้าสู่ระบบเพื่อจัดการคิว ออเดอร์ โต๊ะ บิล เมนู และยอดขาย. อ่านวิธีเริ่มต้นใน [README.md](README.md) และรายละเอียดภาพ UI ใน [DESIGN.md](DESIGN.md).

## Architecture Map

```text
src/pages/customer, src/pages/owner  หน้าลูกค้าและเจ้าของร้าน
src/layouts, src/router           layout, เส้นทาง, guard หน้าเจ้าของร้าน
src/components, src/composables   UI และ logic ที่ใช้ร่วมกัน
src/stores                     Pinia: auth, session, cart, menu, queue, notification
src/services                   การเรียก Supabase table, RPC, storage
src/types, src/utils, src/css  model, helper, global style
supabase/migrations            PostgreSQL schema, RLS, functions
public                        static assets และฟอนต์
```

ข้อมูลไหลจากหน้า Vue → store/service → Supabase client (`src/services/supabase.ts`) → PostgreSQL/RPC/Storage. Repo นี้มีแอปเดียว; ไม่มี NestJS, TypeORM, MySQL, หรือ backend package แยก.

## Commands

รันจาก root ด้วย Node ตาม `package.json` (`>=22.12` ในสาย 22 หรือ 24/26). ดูชื่อตัวแปรที่ต้องตั้งใน [.env.example](.env.example); ห้ามคัดลอกค่าจาก `.env` ลงเอกสาร.

```bash
npm install --package-lock=false --no-audit --no-fund # ติดตั้งได้ในสภาพ lockfile ปัจจุบัน
npm run dev                                    # เปิด Quasar dev server
npm run build                                  # สร้าง dist/spa; ปัจจุบันติด type error
npm run lint:check                             # สคริปต์ใน package.json; ปัจจุบันล้มเหลว
npm run typecheck                              # ปัจจุบันติด type error
./node_modules/.bin/eslint -c ./eslint.config.js './src*/**/*.{ts,js,cjs,mjs,vue}'
./node_modules/.bin/prettier --check src quasar.config.ts eslint.config.js README.md
supabase migration new descriptive_name       # CLI สร้างไฟล์ชื่อ timestamp; ยังไม่ทดสอบการสร้างจริง
supabase db push --dry-run                     # ต้องเชื่อม Supabase project ก่อน; ยังไม่ทดสอบกับ DB
supabase db push                               # deploy migration; ถามเจ้าของก่อนและตรวจ dry-run
```

ห้ามใช้ `npm ci` จนกว่าจะซ่อม `package-lock.json`: ขาด `echarts`, `vue-echarts`, `tslib`, `zrender` ที่ต้องใช้. `npm run lint` แก้ไฟล์ด้วย `--write`/`--fix`; ใช้ `lint:check` เมื่อต้องการตรวจอย่างเดียว. `lint:check` เรียก Prettier โดยไม่มี `--check` จึงพิมพ์เนื้อหาไฟล์จำนวนมาก; คำสั่ง Prettier แยกด้านบนอ่านผลได้ง่ายกว่า. ไม่มี `test` script หรือ test framework ใน repo.

## Code Conventions

- เพิ่ม route ลูกค้าใต้ `/t/:publicToken` และ route เจ้าของใต้ `/owner`; route เจ้าของอาศัย `meta.requiresAuth` ใน `src/router/index.ts`.
- เก็บการเรียกตาราง/RPC/Storage ใน `src/services/`; ใช้ `src/stores/` สำหรับ state ข้ามหน้า. `cartStore` ผูกตะกร้ากับ table session และเก็บใน `localStorage`.
- ใช้ Supabase Auth สำหรับเจ้าของร้าน. ห้ามถือว่า Vue route guard เป็นสิทธิ์ DB: ตรวจ RLS และ `GRANT EXECUTE` ใน migration ทุกครั้งที่เพิ่ม table/RPC; บาง RPC เปิดให้ `anon` เรียกได้.
- ใช้ชนิดและ enum จาก `src/types/`; id ของ record เป็น UUID ใน DB ส่วน `public_token`/`session_token` เป็นข้อความ. ราคาและยอดรวมใน schema ใช้ `INTEGER`; อย่าแปลงเป็นเลขทศนิยมโดยไม่มี migration.
- ใช้ Quasar และ token CSS ใน `src/css/app.css`; ดู [DESIGN.md](DESIGN.md) ก่อนแก้รูปแบบ UI. ไม่พบระบบ i18n; ข้อความ UI อยู่ใน component/route.

## Database & Migration Rules

- เพิ่ม migration ใหม่ใน `supabase/migrations/`; ห้ามแก้ไฟล์ migration เดิมที่อาจใช้แล้ว เพราะ history ของ remote ยังไม่ได้ตรวจ.
- ตรวจ schema ใน `00001_complete_schema.sql` และ migration ถัดมา ไม่อนุมาน schema จากไฟล์แรกอย่างเดียว. ตาราง/คอลัมน์ใช้ `snake_case`, ชื่อ table ส่วนใหญ่เป็นพหูพจน์, primary key เป็น UUID; `created_at`/`updated_at` มีเฉพาะบางตาราง ไม่ใช่กฎสากล. การปิด session ใช้ status/`closed_at`; ไม่พบ soft delete ทั่วระบบ.
- ให้ transaction หลายตารางที่ต้อง atomic อยู่ใน PostgreSQL function/RPC ตาม `create_order`, `update_order`, `advance_order_status`; ตรวจ RLS, `SECURITY DEFINER` และ grant เมื่อเปลี่ยน function.
- TODO: ยืนยันกับเจ้าของโปรเจกต์ว่าจัดการ migration ชื่อ `00022` ที่ซ้ำกันและเลข `00005` ที่หายไปอย่างไร ก่อนใช้ CLI กับฐานข้อมูลจริง.

## Testing

- ก่อนส่งงาน รัน ESLint, Prettier check, `npm run typecheck`, `npm run build`; รายงานข้อผิดพลาดเดิมแยกจากงานที่แก้. ไม่มี automated test suite ให้รันใน `package.json`.
- สำหรับ flow ที่แก้ ตรวจด้วย dev server และข้อมูลทดสอบที่ได้รับอนุญาต; อย่าใช้ production Supabase เพื่อทดสอบการเขียนข้อมูล.
- ณ วันที่ตรวจ: ESLint ผ่าน; Prettier check พบ 15 ไฟล์เดิมไม่ตรง format; typecheck/build ล้มที่ `.value` หลายจุดใน `src/components/menu/MenuItemModal.vue`.

## Git & PR

- ก่อนเปิด PR ให้รายงานผล gate ด้านบนและ migration ที่เพิ่ม. Commit ล่าสุดใช้ prefix `feat:`, `style:`, `refactor:` แต่ไม่พบกฎบังคับใน repo.
- TODO: ยืนยันกับเจ้าของโปรเจกต์เรื่อง branch naming, commit format และ PR gate ที่บังคับ; ไม่พบ hook หรือ pipeline สำหรับยืนยันกฎเหล่านี้.

## Deployment

- `npm run build` ผลิต `dist/spa`; `wrangler.jsonc` กำหนด Cloudflare Workers static assets ให้ชี้ที่ path นี้ และ SPA fallback. ไม่พบ Azure DevOps pipeline, Dockerfile, k3s/Helm หรือ config แยก environment ใน repo.
- TODO: ยืนยันกับเจ้าของโปรเจกต์ว่าใช้คำสั่ง release ใด, environment ใด และ Supabase migration ถูก apply อย่างไร; repo ยังไม่มี release script.

## Boundaries

- ✅ แก้ source ใน `src/`, เพิ่ม migration ใหม่ และอัปเดตเอกสารที่เกี่ยวข้องได้.
- ⚠️ ถามก่อน push migration, deploy, เปลี่ยน RLS/grant/auth, เปลี่ยน `wrangler.jsonc` หรือค่า environment ที่ใช้จริง เพราะกระทบข้อมูล/สิทธิ์/การเผยแพร่.
- 🚫 ห้าม commit `.env`, secret หรือ connection string; ห้ามแก้ generated `.quasar/`, `dist/`, `node_modules/` และ migration เดิมที่อาจ deploy แล้ว.

## Gotchas

- `src/boot/supabase.ts` โหลด Supabase และ initialize auth ก่อน mount; ไม่มี `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` แล้ว client throw error. ใช้ [.env.example](.env.example) เป็นรายการตัวแปร.
- Quasar ใช้ history routing; host ต้องส่ง deep link กลับ SPA. `wrangler.jsonc` ตั้ง `not_found_handling` เป็น `single-page-application` แล้ว.
- `package-lock.json` ไม่ตรง `package.json`; `bun.lock` ก็อยู่ใน repo แต่ README แนะนำ pnpm และไม่มี `pnpm-lock.yaml`. TODO: ยืนยัน package manager/lockfile หลักกับเจ้าของโปรเจกต์.
