# docker-jenkins-frontend

Next.js frontend สำหรับ attractions แยก repository และ pipeline จาก monorepo เดิม

## ฟีเจอร์ที่ลองเล่นได้

- ค้นหาจากชื่อหรือคำอธิบายสถานที่
- เรียงชื่อ A–Z / Z–A และล้างตัวกรอง
- กด View details เพื่ออ่านรายละเอียดและพิกัด
- บันทึกสถานที่โปรด กรองเฉพาะรายการโปรด และนำออกได้
- รายการโปรดเก็บใน localStorage ของเบราว์เซอร์นี้ และยังอยู่หลัง reload
- หากโหลด API ไม่สำเร็จ กด Try again ได้

## Playwright

อ่านคู่มือภาษาไทย [PLAYWRIGHT.md](PLAYWRIGHT.md) สำหรับคำสั่งรัน วิธีอ่าน test และการทดสอบกับ API จริง

```powershell
npm ci --include=dev
npx playwright install chromium
npm run test:browser
```

Playwright เปิด Next.js ที่พอร์ต 3100 ให้เอง ชุดเริ่มต้นทดสอบผ่าน Chromium ด้วยข้อมูล API จำลอง ไม่ต้องเปิด MySQL
ชุด `npm run test:browser:live` ใช้ API และฐานข้อมูลจริง ต้องเปิด API ก่อน
Jenkins รันทั้งชุด UI ก่อน Build และชุด API จริงหลัง Deploy โดยใช้ Playwright Docker image

## Jenkins flow

```text
Checkout → Prepare Environment → Validate → Unit Test → Browser Test (Playwright) → Build → Deploy Frontend → Health Check → Browser Test (Live API) → Verify Deployment
```

อ่าน [Jenkinsfile](Jenkinsfile) ตาม stage ได้โดยตรง ไม่เรียกไฟล์ .sh ใช้ NodeJS tool ชื่อ `Node22` และ polling repo นี้ประมาณทุก 2 นาที

Playwright ใช้ Docker image `mcr.microsoft.com/playwright:v1.64.0-noble` ที่มี Chromium และ system dependencies แล้ว
ไม่ต้องติดตั้ง browser บน host Jenkins เพิ่ม แต่ต้องมี JUnit plugin เพื่อแสดงผล tests
รายงานและไฟล์ประกอบของทั้งสองชุดเก็บแยกกันใน Artifacts แม้ tests ไม่ผ่าน
ครั้งแรกอาจใช้เวลานานเพื่อดาวน์โหลด image; หากตั้งระบบใหม่ ให้รัน API job ให้ผ่านก่อน frontend job

## เริ่มใช้งาน

หากย้ายจาก VPS เดิม ให้ทำตาม [MIGRATION.md](MIGRATION.md) ก่อน เพื่อใช้ฐานข้อมูลเดิมและไม่ชนพอร์ต frontend เก่า

Frontend ไม่ใช้ credentials ฐานข้อมูล ต้องมี API พร้อมอยู่บน Docker network `docker-jenkins-pipeline_stack` ก่อน

สำหรับ Docker ให้คัดลอก `.env.example` เป็น `.env` แล้วรัน `docker compose up -d --build --wait` หลังเปิด API

Unit tests: `npm ci --include=dev` แล้ว `npm test -- --runInBand`

พัฒนาในเครื่อง: `npm run dev` โดย API อยู่ที่ `localhost:3001` หรือกำหนด `API_HOST_INTERNAL` ก่อนเริ่ม Next.js ค่า rewrite ถูกใช้ตอน build; Dockerfile ใช้ `http://api:3001` เป็น API ภายใน network

## GitHub Actions

มี manual workflow ใน `.github/workflows/deploy.yml` สำหรับเปรียบเทียบ ดูขั้นตอนตั้ง SSH secrets และ checkout ใน [MIGRATION.md](MIGRATION.md)
