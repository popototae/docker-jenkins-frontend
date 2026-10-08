# ย้ายจาก repo เดิมมาเป็นสอง repo

## สิ่งที่แยกแล้ว

- API repo มี API, MySQL, init.sql และ Jenkinsfile ของตัวเอง
- Frontend repo มี Next.js, Compose และ Jenkinsfile ของตัวเอง ไม่พึ่ง `file:..`
- API ใช้ project `docker-jenkins-pipeline` เพื่อใช้ volume MySQL เดิม
- Frontend ใช้ project `docker-jenkins-frontend` เชื่อม external network `docker-jenkins-pipeline_stack`
- ไม่มีไฟล์ `.sh` แต่ละ Jenkinsfile แสดง flow ด้วย stage และคำสั่งสั้น ๆ

การแยก repo ทำให้ polling ไม่เรียกอีก job เมื่อ push คนละ repo แต่ frontend ยังต้องเรียก API ดังนั้นรัน API ให้พร้อมก่อน frontend ครั้งแรก

## ทำครั้งเดียวบน Jenkins/VPS

1. Disable jobs ที่ยังชี้ repo เก่า `popototae/docker-jenkins` ทั้งหมด และอย่า deploy ผ่าน GitHub ของ repo เก่าอีก
2. ตรวจ NodeJS plugin และ Tools → NodeJS ชื่อ `Node22` รุ่น 22.x
3. API job ใช้ Secret text IDs `MYSQL_ROOT_PASSWORD` และ `MYSQL_PASSWORD` ที่ตรงกับฐานข้อมูลเดิม Frontend job ไม่ต้องใช้รหัสฐานข้อมูล
4. ตั้ง Pipeline script from SCM สอง job ตามตาราง ใช้ branch `*/main` และ Script Path `Jenkinsfile` ทั้งสองตัว:

| Job | Repository URL |
| --- | --- |
| docker-jenkins-api | https://github.com/popototae/docker-jenkins-api.git |
| docker-jenkins-frontend | https://github.com/popototae/docker-jenkins-frontend.git |

Repo ทั้งสองเป็น Public จึงเลือก Git Credentials เป็น `- none -` ได้สำหรับ checkout ผ่าน HTTPS

5. ตรวจ project และ volume เดิมบน VPS ก่อนรัน:

```sh
docker ps -a --filter label=com.docker.compose.project=docker-jenkins-pipeline
```

ตรวจ volume ของ MySQL container ที่พบ โดยแทน `<mysql-container>` ด้วยชื่อจริง:

```sh
docker inspect <mysql-container> --format '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Name}}{{end}}{{end}}'
```

ค่า project ต้องตรงกับ `name:` ใน API Compose และ volume เดิมต้องเป็นชุดที่ต้องการใช้ ถ้าชื่อเดิมต่างออกไป ให้แก้ API project name และ frontend external network ให้ตรงก่อนรัน ห้าม `down -v` เพื่อย้ายระบบ

6. กด Build Now ของ API แล้วรอผ่าน API job ไม่ใช้ `--remove-orphans` จึงยังไม่ลบ frontend เก่า
7. หยุดและลบเฉพาะ frontend ของ project เก่าเพื่อคืนพอร์ต 3000 ดู ID ด้วยคำสั่งนี้:

```sh
docker ps -aq --filter label=com.docker.compose.project=docker-jenkins-pipeline --filter label=com.docker.compose.service=frontend
```

ถ้ามี ID ให้ใช้ ID นั้นเท่านั้น:

```sh
docker stop <old-frontend-id>
docker rm <old-frontend-id>
```

ไม่แตะ MySQL/API/volume ขั้นตอนนี้ทำให้หน้าบ้านหยุดชั่วคราวจน frontend job ใหม่เสร็จ

8. กด Build Now ของ frontend แล้วเปิด `http://<VPS-IP>:3000`
9. หลัง build ครั้งแรก polling จะตรวจแต่ละ repo ประมาณทุก 2 นาที แก้ API push API repo แก้ frontend push frontend repo

## GitHub Actions (ถ้าต้องการเปรียบเทียบ)

แต่ละ repo มี manual workflow ของตัวเอง ทดสอบบน runner แล้ว SSH ไป build/deploy เฉพาะบริการใน repo นั้น ตั้ง `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_HOST_KEY_FINGERPRINT` และเลือก `VPS_APP_DIR` ให้ตรง checkout ของ repo นั้น

ค่า APP_DIR เริ่มต้นตรงกับ workspace ของ job ในตาราง workflow ต้องมี checkout และ `.env` อยู่ก่อน เช่นหลัง Jenkins build ครั้งแรก หรือ clone ไป deployment directory แยกแล้วสร้าง `.env` จาก `.env.example` ด้วยค่าจริง

GitHub รัน deploy เป็นเจ้าของ checkout และต้องมีสิทธิ์ sudo แบบ noninteractive หาก SSH คนละบัญชี Disable Jenkins job ของ repo นั้นระหว่างทดลอง GitHub เพราะทั้งสอง CI ยัง deploy แอปเดียวกันได้ ไม่ต้องใช้ environment file กลางแบบ repo เก่าแล้ว

## หมายเหตุ

- API job ไม่ deploy frontend และ frontend job ไม่ deploy API/MySQL
- การอัปเดต API อาจทำให้คำขอ frontend สะดุดชั่วคราว การแยก repo ไม่ได้ทำให้ frontend ไม่ต้องพึ่ง API
- ไม่มี automatic rollback และไม่มีคำสั่งลบ volume
- HTTP checks ใช้ API port 3001 และ frontend port 3000 หากเปลี่ยนพอร์ตให้แก้ Health Check ใน pipeline ด้วย
