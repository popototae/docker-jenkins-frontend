# ทดสอบหน้าบ้านด้วย Playwright

## ทำไมเว็บใน tests เคยต่างจากเว็บจริง

โค้ดหน้าเว็บเป็น app/page.js เดียวกัน แต่เดิมคำสั่งหลักเปิด Next.js dev server พอร์ต 3100
แล้ว page.route() ตอบ API ด้วย e2e/fixtures/attractions.json แทนฐานข้อมูลจริง
fixture มี 3 รายการ ไม่มี coverimage และ Eiffel Tower มีคำว่า city view
ส่วนเว็บ Docker พอร์ต 3000 อ่าน MySQL จริง 12 รายการ ซึ่งไม่มีคำนี้ในคำอธิบาย Eiffel Tower
จึงค้นคำเดียวกันแล้วได้ผลต่างกัน และเห็นรูปต่างกันได้

ตอนนี้คำสั่งหลักใช้เว็บที่เปิดอยู่จริง ส่วน mock เป็นคำสั่งแยกที่ระบุชัดเจน
ไม่แก้ข้อมูลจริงเพื่อให้ตรง fixture และไม่เปลี่ยนเงื่อนไขค้นหาให้ผ่าน tests

## ติดตั้งครั้งแรก

ในโฟลเดอร์ 02_frontend:

```powershell
npm ci --include=dev
npx playwright install chromium
```

## ทดสอบ Docker ที่เปิดอยู่จริง

เปิด Docker Desktop และเตรียม .env ฝั่ง API จาก .env.example พร้อมรหัสฐานข้อมูลก่อน
เปิด API/MySQL ก่อน frontend เพราะ frontend ใช้ network ของ API:

```powershell
cd 'D:\Work\docker jenkins\01_api'
docker compose up -d --build --wait
cd 'D:\Work\docker jenkins\02_frontend'
docker compose up -d --build --wait
npm run test:browser
```

flow: Chromium → http://localhost:3000 → Next.js /api/attractions → API container → MySQL จริง
คำสั่งนี้ไม่เปิด server เพิ่ม ไม่ใช้ page.route() และไม่ใช้ข้อมูลจาก fixtures
ถ้าเว็บ/API เข้าไม่ได้ จะ fail; ถ้าฐานข้อมูลว่างหรือไม่มีรูป ต้องเตรียมข้อมูลก่อน

ดูการทำงานผ่าน UI หรือเปิด browser:

```powershell
npm run test:browser:ui
npm run test:browser:headed
```

ใน Playwright UI เลือก project live-api จะเห็นข้อมูล/URL เดียวกับเว็บที่เปิดอยู่
แต่ละ test มี browser context ใหม่ จึงไม่ใช้รายการโปรดหรือ cookies จาก Chrome ที่เปิดเอง
localhost กับ 127.0.0.1 เป็นคนละ origin สำหรับ localStorage แม้จะเข้า server เดียวกัน

## ชุดจริงตรวจ 9 เคส

1. ชื่อและจำนวนรายการตรงกับ API จริง และรูปแรกที่ API ส่งมาดาวน์โหลดสำเร็จ (naturalWidth มากกว่า 0)
2. ค้นหาชื่อจริงโดยไม่สนตัวพิมพ์ใหญ่เล็กและช่องว่างหัวท้าย
3. ค้นข้อความจากคำอธิบายจริง
4. ค้น city view แล้วเทียบกับข้อมูลจริง ถ้าไม่มีคำนี้ต้องไม่พบรายการ
5. ล้างการค้นหา/การเรียง/ตัวกรองรายการโปรด แล้วคืนรายการจริงทั้งหมด
6. เรียงชื่อทั้ง A–Z และ Z–A
7. เปิด/ปิดรายละเอียด และตรวจพิกัดจาก API
8. บันทึกรายการโปรด → reload → กรอง → นำออก → reload
9. ค้นหาและกรองรายการโปรดบนจอแคบ

ไฟล์ e2e/live-api.spec.js อ่าน response จริงใหม่ในแต่ละ test ไม่กำหนดว่าต้องมี 12 รายการ
ชุดนี้ไม่เพิ่ม/ลบ/แก้ข้อมูลใน MySQL และรายการโปรดเก็บเฉพาะ localStorage ใน browser ของ test
การโหลดรูปพึ่งบริการ URL รูปจริง ถ้ารูปเข้าไม่ได้ test เคสแรกจะ fail แทนการผ่านทั้งที่รูปไม่ขึ้น
ตรวจโหลดเฉพาะรูปแรกที่เลือก ไม่ได้ยืนยันว่ารูปทุกใบหรือทุกบริการภายนอกพร้อมใช้งาน

## ทดสอบ URL อื่น

ค่าเริ่มต้นมาจาก playwright.config.js คือ http://localhost:3000
เปลี่ยนด้วย E2E_BASE_URL ได้ เช่น VPS ที่ต้องการทดสอบ:

PowerShell:

```powershell
$env:E2E_BASE_URL = 'http://138.2.70.183:3000'
npm run test:browser
Remove-Item Env:E2E_BASE_URL
```

Git Bash/Linux:

```bash
E2E_BASE_URL=http://138.2.70.183:3000 npm run test:browser
```

npm run test:browser:live เป็น alias ที่เรียก npm run test:browser อีกทีเพื่อไม่เก็บคำสั่งซ้ำ
การตั้ง API_HOST_INTERNAL บนเครื่อง test ไม่เปลี่ยน backend ของ frontend ที่เปิดอยู่แล้ว
หากต้องการตรวจ dev server ที่เปิดเอง ให้ตั้ง E2E_BASE_URL เป็น URL ของ server นั้น

## ชุดจำลองสำหรับควบคุมสถานการณ์

```powershell
npm run test:browser:mock
npm run test:browser:mock:ui
```

flow: Playwright → playwright.mock.config.js → Next.js dev พอร์ต 3100 → Chromium → page.route() ตอบข้อมูลจำลอง
project ชื่อ mock-chromium ใช้ e2e/attractions.spec.js กับ e2e/fixtures/attractions.json
มี 11 เคสเดิม รวมกรณี Loading, API error/retry และข้อมูลว่าง โดยไม่หยุดหรือแก้ฐานข้อมูลจริง
local ใช้ dev server ของ workspace ที่เปิดอยู่พอร์ต 3100 ต่อได้ หากยังไม่เปิด Playwright จะเปิดและปิดให้
เมื่อ CI=true ต้องเปิด server ใหม่และพอร์ต 3100 ต้องว่าง ไม่ต้องเปิด API/MySQL สำหรับชุดนี้
รูป/ข้อความใน fixture อาจต่างจากข้อมูลจริง
การผ่านชุดนี้ยืนยันพฤติกรรมกับข้อมูลจำลอง ไม่ยืนยันเว็บ Docker, การเชื่อมต่อ API, ฐานข้อมูล หรือบริการรูปจริง

## รายงานและการหาสาเหตุเมื่อ fail

```powershell
npm run test:browser:report
```

รายงานจริงอยู่ใน playwright-report-live/ และ JUnit/screenshot/video/trace อยู่ใน test-results-live/
รายงาน mock อยู่ใน playwright-report/ และ test-results/ เปิดด้วย npm run test:browser:mock:report
แต่ละชุดเขียนทับรายงานเดิมของตัวเอง โดยไม่ทับอีกชุด ทั้ง local และ Jenkins ใช้ paths จาก config เดียวกัน
โฟลเดอร์รายงานไม่ถูก commit หรือส่งเข้า Docker build
ภาพ DOM snapshot ใน trace เป็นภาพสถานะของ test ณ ตอนนั้น โดย mock response ยังเป็นข้อมูลจำลอง
จึงใช้แทนหลักฐานว่า API จริงส่งข้อมูลเดียวกันไม่ได้

## Jenkins

```text
Unit Test → Browser Test (Mock UI) → Build → Deploy → Health Check → Browser Test (Live API)
```

- ก่อน Build: npm run test:browser:mock รัน 11 เคสจำลองบน dev server พอร์ต 3100 ภายใน test container
- หลัง Deploy: npm run test:browser รัน 9 เคสจริงกับ http://localhost:3000 เหมือน local
- ถ้า mock fail จะหยุดก่อน Deploy ถ้า live fail จะทำให้ build fail หลัง Deploy ไม่มี rollback อัตโนมัติ

Jenkins ใช้ Docker agent ของแต่ละ stage กับ image mcr.microsoft.com/playwright:v1.64.0-noble
ซึ่งตรงกับ @playwright/test ใน package.json มี Chromium และ system dependencies แล้ว
reuseNode true ทำให้ Jenkins mount workspace เดิม และ Docker Pipeline จัดการ UID/GID ของ Jenkins ให้
live agent ใช้ --network host บน Linux จึงเข้า http://localhost:3000 ที่ Docker Compose เปิดไว้บน VPS ได้เหมือน local
Jenkins ต้องมีทั้ง Docker Pipeline plugin และ JUnit plugin, Docker daemon ที่ mount workspace ได้ และ API/MySQL ที่พร้อมพร้อมข้อมูล/รูปจริง
ติดตั้ง Docker Pipeline ครั้งเดียวที่ Manage Jenkins → Plugins → Available plugins → Docker Pipeline
หากยังไม่มี plugin นี้ Jenkins จะอ่าน agent docker ไม่ผ่าน ต้องติดตั้งก่อนใช้ Jenkinsfile ใหม่นี้

| ชุดใน Jenkins | HTML | JUnit และไฟล์ประกอบ |
|---|---|---|
| Mock UI | playwright-report/ | test-results/ |
| Live API | playwright-report-live/ | test-results-live/ |

post always เก็บ Tests และ Build Artifacts แม้ test fail รายงานสองชุดทั้ง local และ Jenkins ไม่ทับกัน
Node22 ใช้ใน Unit Test และ application build ส่วน test runner ใช้ Node จาก Playwright image
GitHub Actions ยังเป็น flow เดิม การแก้ครั้งนี้ปรับ tests/Jenkins โดยตรง ไม่มีไฟล์ .sh เพิ่ม

## คำสั่งเดียวกันระหว่าง local กับ Jenkins

| ชุด | local | steps ใน Jenkins |
|---|---|---|
| API unit | npm test | sh 'npm test' |
| API Bruno | npm run test:api | sh 'npm run test:api' |
| Frontend unit | npm test | sh 'npm test' |
| Frontend mock | npm run test:browser:mock | sh 'npm run test:browser:mock' |
| Frontend จริง | npm run test:browser | sh 'npm run test:browser' |

คำสั่งเครื่องมืออยู่ใน scripts ของ package.json ส่วน URL/รายงานอยู่ใน Playwright config
Jenkinsfile เลือก agent และลำดับ stages แล้วเรียก npm เท่านั้น ไม่เก็บ bru CLI, playwright CLI, output flags หรือ docker run ซ้ำ
แก้รายละเอียดคำสั่งที่ package.json แล้ว commit/push ให้ Jenkins checkout revision ใหม่
การแก้ที่ยังไม่ commit/push จะมีผลเฉพาะเครื่อง local
