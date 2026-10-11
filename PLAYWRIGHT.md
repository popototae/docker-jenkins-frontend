# ฝึกทดสอบหน้าบ้านด้วย Playwright

## เริ่มจากใช้งานเว็บ

เว็บนี้เป็นรายการสถานที่ท่องเที่ยว ลองค้นหาชื่อหรือคำในคำอธิบาย เรียงชื่อ เปิด View details
กด Save favorite แล้วเลือก Favorites only ลอง reload และนำรายการโปรดออก
Clear filters คืนค่าการค้นหา การเรียง และตัวกรอง โดยไม่ลบรายการโปรด

รายการโปรดเก็บใน localStorage ของเบราว์เซอร์และ origin นี้ ไม่มีการเขียนข้อมูลลง API หรือ MySQL
ถ้าใช้ incognito หรือล้างข้อมูลเว็บไซต์ รายการโปรดจะหาย

## ติดตั้งครั้งแรก

เปิด terminal ในโฟลเดอร์ `02_frontend`:

```powershell
npm ci --include=dev
npx playwright install chromium
```

## 1. เริ่มจากทดสอบ UI ที่ควบคุมข้อมูลได้

```powershell
npm run test:browser
```

คำสั่งนี้เรียก Playwright → อ่าน `playwright.config.js` → เปิด Next.js ที่ `127.0.0.1:3100`
→ เปิด Chromium → รัน `e2e/attractions.spec.js` → สร้างรายงาน → ปิด server ที่เปิดให้
ไม่ต้องรัน `npm run dev` เอง และพอร์ต 3100 ต้องว่าง

ชุดนี้ใช้ `page.route()` ตอบ `/api/attractions` ด้วยข้อมูลใน `e2e/fixtures/attractions.json`
จึงทดสอบโค้ดหน้าบ้านและเบราว์เซอร์จริงได้โดยไม่พึ่ง VPS หรือ MySQL
ชุดนี้ยังไม่ได้ยืนยันว่า backend หรือฐานข้อมูลทำงาน

มี 11 เคส:

1. เปิดเว็บและเห็นรายการครบ
2. ค้นหาชื่อโดยไม่สนตัวพิมพ์ใหญ่เล็กหรือช่องว่างหัวท้าย
3. ค้นหาจากคำอธิบาย
4. ค้นหาไม่พบ แล้วล้างตัวกรอง
5. เรียงชื่อทั้งสองทิศทาง
6. เปิดและปิดรายละเอียด
7. บันทึกรายการโปรด → reload → กรอง → นำออก → reload
8. แสดง Loading ขณะรอ API
9. API ผิดพลาด → กด Try again → โหลดสำเร็จ
10. ฐานข้อมูลไม่มีรายการ
11. ค้นหาและบันทึกรายการโปรดบนจอแคบ

## 2. ดูเบราว์เซอร์ทำงานและลองไล่ทีละขั้น

```powershell
npm run test:browser:headed
npm run test:browser:ui
```

`headed` เปิดหน้าต่าง Chromium ให้เห็นการทำงาน ส่วน `ui` เปิดเครื่องมือสำหรับเลือก test และดูแต่ละขั้นตอน
ถ้าอยากดูช้าลงและไล่เอง ให้เปิด debug:

```powershell
npx playwright test --project=chromium --debug
```

รันเฉพาะเคสด้วยคำในชื่อ test:

```powershell
npm run test:browser -- --grep "favorite across reload"
```

## อ่าน test อย่างไร

ตัวอย่างจากเคสค้นหา:

```js
await page.goto("/");
await page.getByRole("searchbox", { name: "Search attractions" }).fill("  pHI pHI  ");
await expect(page.getByRole("article")).toHaveCount(1);
await expect(page.getByRole("heading", { name: "Phi Phi Islands" })).toBeVisible();
```

- `page.goto()` เปิดหน้าเว็บ
- `getByRole()` หาช่องหรือปุ่มจากสิ่งที่ผู้ใช้มองเห็นและชื่อที่เข้าถึงได้
- `fill()` พิมพ์ข้อความ, `click()` กด, `check()` ติ๊ก checkbox
- `expect()` ตรวจผลลัพธ์ พร้อมรอให้หน้าเว็บเปลี่ยนจนตรงเงื่อนไข

ไม่ใช้ `waitForTimeout()` เพื่อเดาว่าต้องรอกี่วินาที และแต่ละ test ได้ browser context ใหม่
รายการโปรดของ test หนึ่งจึงไม่ปนกับอีก test ส่วน reload ภายใน test เดียวกันยังใช้ storage เดิม

## 3. ทดสอบร่วมกับ API และ MySQL จริง

เปิด API ที่ทำงานกับฐานข้อมูลและมีข้อมูลอย่างน้อย 1 รายการก่อน ชุดนี้ไม่สร้างหรือลบข้อมูลในฐานข้อมูล
ถ้า API อยู่บนเครื่องที่ `localhost:3001`:

```powershell
npm run test:browser:live
```

ถ้า API อยู่ที่ VPS แต่ต้องการทดสอบโค้ดหน้าบ้านบนเครื่อง ให้กำหนด backend ก่อนเริ่ม Playwright:

```powershell
$env:API_HOST_INTERNAL = "http://138.2.70.183:3001"
npm run test:browser:live
Remove-Item Env:API_HOST_INTERNAL
```

flow: Chromium → Next.js บนเครื่อง พอร์ต 3100 → rewrite `/api/attractions` → API บน VPS → MySQL

`e2e/live-api.spec.js` ไม่มี `page.route()` ใช้ชื่อสถานที่จาก response จริง ตรวจจำนวนรายการที่แสดง
แล้วค้นหา เปิดรายละเอียด บันทึกรายการโปรด กรอง และ reload เพื่อตรวจว่ายังบันทึกอยู่
ถ้า API เข้าไม่ได้หรือฐานข้อมูลว่าง test จะ fail เพื่อบอกว่าต้องเตรียมระบบก่อน

ถ้าจะทดสอบหน้าบ้านที่ deploy แล้ว ให้ตั้ง URL ของหน้าบ้านแทน:

```powershell
$env:E2E_BASE_URL = "http://138.2.70.183:3000"
npm run test:browser:live
Remove-Item Env:E2E_BASE_URL
```

โหมดนี้ไม่เปิด Next.js เพิ่ม และต้อง deploy โค้ดที่มีฟีเจอร์ใหม่แล้วจึงจะผ่าน
Next.js อ่าน `API_HOST_INTERNAL` ตอนเริ่ม dev server หรือตอน build;
การตั้งตัวแปรนี้บนเครื่องไม่ได้เปลี่ยน backend ของเว็บที่ deploy อยู่

## รายงานและการหาสาเหตุเมื่อ fail

```powershell
npm run test:browser:report
```

รายงาน HTML อยู่ใน `playwright-report/` เมื่อ fail จะเก็บ screenshot, video และ trace ใน `test-results/`
เปิด trace จากรายงานเพื่อดู action, DOM และ network ของขั้นที่ล้มเหลว
การรันครั้งถัดไปเขียนรายงานใหม่ โฟลเดอร์เหล่านี้ไม่ถูก commit และไม่ถูกส่งเข้า Docker build

## Unit test กับ Playwright ต่างกันตรงไหน

| คำสั่ง | สิ่งที่ตรวจ |
|---|---|
| `npm test -- --runInBand` | React component ใน Jest / jsdom โดย mock fetch |
| `npm run test:browser` | UI และการกดใช้งานใน Chromium จริง โดยจำลอง API |
| `npm run test:browser:live` | Browser + frontend + API + ฐานข้อมูลจริง |

## แล้ว pipeline ล่ะ

Jenkinsfile ใช้คำสั่งตรง ๆ ในแต่ละ stage โดยไม่มีไฟล์ .sh เพิ่ม:

```text
Unit Test → Browser Test (Playwright) → Build → Deploy → Health Check → Browser Test (Live API)
```

- `Browser Test (Playwright)` รัน 11 เคส UI โดยเปิด Next.js พอร์ต 3100 ภายใน test container และจำลอง API
- `Browser Test (Live API)` รัน 1 เคสกับ frontend ที่เพิ่ง deploy ผ่าน `http://frontend:3000` บน Docker network เดียวกับ API แล้วต่อ MySQL จริง
- ถ้า UI test fail จะหยุดก่อน Build/Deploy; ถ้า live test fail จะทำให้ build fail หลัง deploy แล้ว ไม่มีการ rollback อัตโนมัติ

ทั้งสอง stage ใช้ image `mcr.microsoft.com/playwright:v1.64.0-noble` ซึ่งมี Chromium และ system dependencies
เวอร์ชัน image ต้องตรงกับ `@playwright/test` ที่ pin ใน package.json ไม่ต้องติดตั้ง Chromium หรือ apt packages บน host Jenkins
container mount workspace ที่ Unit Test ติดตั้ง npm dependencies ไว้แล้ว และใช้ UID/GID ของ Jenkins เพื่อให้ไฟล์ที่สร้างยังเป็นของ Jenkins
Node22 ยังใช้ใน Unit Test ส่วน Playwright ใช้ Node ที่มากับ image สำหรับ test runner
Docker daemon ต้องอยู่เครื่องเดียวกับ Jenkins workspace เพื่อ mount ได้ และต้องเข้าถึง registry เพื่อ pull image ในครั้งแรก

ต้องมี JUnit plugin และ API job ต้อง deploy สำเร็จ มี network `docker-jenkins-pipeline_stack` กับข้อมูลอย่างน้อย 1 รายการก่อนรัน live test
ไม่ต้องเพิ่ม credentials สำหรับ Playwright ส่วน API job ยังคงใช้ credentials ของ MySQL เดิม

ดูผลที่หน้า build → Test Result และ Artifacts:

| ชุด | HTML | JUnit / ไฟล์ประกอบ |
|---|---|---|
| UI | `playwright-report/` | `test-results/junit.xml` และ `test-results/` |
| API จริง | `playwright-report-live/` | `test-results-live/junit.xml` และ `test-results-live/` |

`post { always { ... } }` เก็บผลแม้ test fail และรายงานสองชุดแยกกันเพื่อไม่ให้ทับกัน
ดาวน์โหลดรายงาน HTML พร้อมโฟลเดอร์ data ทั้งชุดเพื่อเปิดอ่าน; trace/video/screenshot จะอยู่ใน Artifacts เมื่อ fail
GitHub Actions ยังเป็น flow เดิม การเพิ่ม tests รอบนี้ทำเฉพาะ Jenkins

อ้างอิงเอกสารทางการ:
[Web server](https://playwright.dev/docs/test-webserver),
[Mock APIs](https://playwright.dev/docs/mock),
[Writing tests](https://playwright.dev/docs/writing-tests),
[Trace viewer](https://playwright.dev/docs/trace-viewer)
