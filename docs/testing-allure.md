# การทดสอบและ Allure Report 3

## สถานะ

ชุดทดสอบที่รันอัตโนมัติเป็น unit test ไม่มีการเชื่อมต่อ Supabase และไม่เขียนข้อมูลจริง ส่วน E2E ยังไม่เปิดรันใน pipeline เพราะ repository ไม่มี `supabase/config.toml`, ยังไม่มีฐานข้อมูล test และ RLS ปัจจุบันให้สิทธิ์ owner ตาม allowlist ไม่ได้จำกัด test user ให้แก้เฉพาะแถวตนเอง

## วิธีรัน

ติดตั้งด้วย `npm install --package-lock=false --no-audit --no-fund` แล้วใช้ `npm run test:allure`, `npm run allure:generate` และ `npm run allure:open` ตามลำดับ `npm run allure:clean` ลบผลทดสอบและรายงานที่สร้างในเครื่อง

## โหมดสภาพแวดล้อม

- A: Supabase local ผ่าน CLI และ Docker (เลือกแล้ว; สร้าง `supabase/config.toml` แล้ว แต่ Docker daemon ยังไม่ทำงาน จึงยังไม่ได้รัน migration หรือ E2E)
- B: Supabase project แยกสำหรับ test (รอเลือกและตรวจ RLS)
- C: production แบบ manual (รอเลือกและทบทวนผลกระทบก่อน)

E2E ต้องมี `.env.test` ซึ่งถูก gitignore และต้องกำหนด `SUPABASE_URL`, `PROD_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TEST_DB_MODE=local` โดยตรง ไม่มีการ fallback ไป `.env` หรือค่า `VITE_SUPABASE_*` การเริ่ม Playwright จะถูก guard ปฏิเสธหาก URL ตรง production, ไม่มีค่าอ้างอิง production, ไม่ใช่ local หรือมี service role key ใน environment ค่า `ALLOW_PROD_TESTS=true` เพียงอย่างเดียวไม่เปิดโหมด C ใน config ปัจจุบัน

## ข้อมูลทดสอบและ cleanup

ยังไม่มี test ที่เขียนข้อมูล จึงยังไม่มี marker, sweeper หรือ `test:cleanup` ให้ใช้งาน ห้ามเปิด E2E เขียนข้อมูลก่อนกำหนด test user ที่ RLS จำกัดเฉพาะแถวตนเอง, ตรวจ trigger/RPC/Realtime/Storage ที่เกี่ยวข้อง, วาง marker `__test_<runId>__` ในทุก record/file, ลบเฉพาะ ID พร้อม marker ใน `finally`, ทำ global sweep และตรวจจำนวนคงเหลือเป็นศูนย์ สคริปต์กวาดของเก่าต้อง dry-run และแสดงจำนวนก่อนลบ

## Azure DevOps

Pipeline ที่เพิ่มรันเฉพาะ unit test และ publish `allure-report` เป็น artifact โดย generate/publish ใช้ `condition: always()` ยังไม่ใส่ secret ใดใน repo และยังไม่เปิดงานเขียนข้อมูลอัตโนมัติ
