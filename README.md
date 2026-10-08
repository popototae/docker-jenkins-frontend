# docker-jenkins-frontend

Next.js frontend สำหรับ attractions แยก repository และ pipeline จาก monorepo เดิม

## Jenkins flow

```text
Checkout → Prepare Environment → Validate → Unit Test → Build → Deploy Frontend → Health Check → Verify Deployment
```

อ่าน [Jenkinsfile](Jenkinsfile) ตาม stage ได้โดยตรง ไม่เรียกไฟล์ .sh ใช้ NodeJS tool ชื่อ `Node22` และ polling repo นี้ประมาณทุก 2 นาที

## เริ่มใช้งาน

หากย้ายจาก VPS เดิม ให้ทำตาม [MIGRATION.md](MIGRATION.md) ก่อน เพื่อใช้ฐานข้อมูลเดิมและไม่ชนพอร์ต frontend เก่า

Frontend ไม่ใช้ credentials ฐานข้อมูล ต้องมี API พร้อมอยู่บน Docker network `docker-jenkins-pipeline_stack` ก่อน

สำหรับ Docker ให้คัดลอก `.env.example` เป็น `.env` แล้วรัน `docker compose up -d --build --wait` หลังเปิด API

Unit tests: `npm ci --include=dev` แล้ว `npm test -- --runInBand`

พัฒนาในเครื่อง: `npm run dev` โดย API อยู่ที่ `localhost:3001` หรือกำหนด `API_HOST_INTERNAL` ก่อนเริ่ม Next.js ค่า rewrite ถูกใช้ตอน build; Dockerfile ใช้ `http://api:3001` เป็น API ภายใน network

## GitHub Actions

มี manual workflow ใน `.github/workflows/deploy.yml` สำหรับเปรียบเทียบ ดูขั้นตอนตั้ง SSH secrets และ checkout ใน [MIGRATION.md](MIGRATION.md)
