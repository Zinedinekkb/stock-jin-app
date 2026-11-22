# คู่มือติดตั้งเอง (Self-hosting)

หนึ่งการ deploy ต่อหนึ่งร้าน ใช้ Firebase เป็นฐานข้อมูลและระบบล็อกอิน และ Vercel เป็นที่โฮสต์

## สิ่งที่ต้องมี

- Node.js 20 ขึ้นไป
- บัญชี Google (Firebase) และบัญชี Vercel
- Git

```bash
git clone <URL ของ repo นี้> stockpro
cd stockpro
npm install
cp .env.example .env.local
```

## 1. สร้างโปรเจกต์ Firebase

1. เปิด [Firebase Console](https://console.firebase.google.com) แล้วสร้างโปรเจกต์ใหม่
2. Build > Authentication > Get started > เปิด **Email/Password**
3. Build > Firestore Database > Create database (เลือก production mode และ region ที่ใกล้ เช่น `asia-southeast1`)
4. Build > Storage > Get started

## 2. Deploy กฎความปลอดภัย (Security Rules)

```bash
npx firebase-tools login
npx firebase-tools use --add   # เลือกโปรเจกต์ที่สร้างไว้
npx firebase-tools deploy --only firestore:rules,storage
```

กฎจะอนุญาตเฉพาะผู้ใช้ที่ล็อกอิน และมีแต่แอดมินที่แก้ไขการตั้งค่าร้านได้

## 3. นำค่า Web config ใส่ `.env.local`

Project settings > Your apps > เพิ่ม Web app > คัดลอกค่า config มากรอกในตัวแปร `NEXT_PUBLIC_FIREBASE_*` ใน `.env.local` (ดูชื่อตัวแปรทั้งหมดใน `.env.example`)

ทดลองรันในเครื่อง:

```bash
npm run dev
```

## 4. สร้าง VAPID key (Push แจ้งเตือน)

1. Project settings > แท็บ **Cloud Messaging**
2. หัวข้อ **Web configuration** กด **Generate key pair**
3. คัดลอก key pair ไปใส่ `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
4. ตรวจว่า **Firebase Cloud Messaging API (V1)** เป็น Enabled

## 5. Service account (ตั้งที่ Vercel เท่านั้น)

1. Project settings > แท็บ **Service accounts** > **Generate new private key**
2. นำเนื้อหา JSON ทั้งหมดไปวางเป็นค่า `FIREBASE_SERVICE_ACCOUNT` ใน Vercel (หรือแปลงเป็น base64 ก่อนก็ได้)
3. ตั้ง `CRON_SECRET` เป็นรหัสสุ่มยาวๆ เช่น `openssl rand -hex 32`

> **คำเตือน:** ห้าม commit ไฟล์ service account ลง Git และลบไฟล์ที่ดาวน์โหลดหลังตั้งค่าเสร็จ ใครได้ไฟล์นี้จะเข้าถึงข้อมูลทั้งโปรเจกต์ได้ `.gitignore` ป้องกันไฟล์ชื่อ `*firebase-adminsdk*.json` ไว้แล้ว แต่ไฟล์ชื่ออื่นไม่ถูกป้องกัน

## 6. Deploy ที่ Vercel

1. Push โค้ดขึ้น GitHub แล้ว Import โปรเจกต์ใน [Vercel](https://vercel.com/new)
2. ใส่ Environment Variables ทั้งหมดจาก `.env.local` (รวม `NEXT_PUBLIC_APP_URL` เป็น URL ของ Vercel)
3. Deploy

Cron (รายงานประจำวัน 21:00 และสรุปครึ่งเดือน 20:00 เวลาไทย) ตั้งไว้ใน `vercel.json` แล้ว Vercel เรียกให้อัตโนมัติพร้อม `Authorization: Bearer <CRON_SECRET>`

ค่า `NEXT_PUBLIC_*` ถูกฝังตอน build ต้อง Redeploy ทุกครั้งที่แก้

## 7. ผู้ใช้คนแรกเป็นแอดมิน

เปิดเว็บที่ deploy แล้วสมัครสมาชิก **คนแรกที่สมัครจะเป็นแอดมินอัตโนมัติ** คนถัดไปต้องรอแอดมินอนุมัติ

จากนั้นไปที่แท็บ **ตั้งค่าร้าน** เพื่ออัปโหลดโลโก้ เลือกสี และกรอกชื่อร้าน

## 8. (ไม่บังคับ) LINE

ถ้าไม่ตั้งค่า ระบบจะข้ามการส่ง LINE และซ่อนปุ่มส่ง LINE

1. สร้าง Messaging API channel ที่ [LINE Developers Console](https://developers.line.biz)
2. ตั้ง `LINE_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `LINE_GROUP_ID` (หรือ `LINE_USER_ID`) ใน Vercel
3. ติดตั้ง Rich Menu (ตั้ง `LINE_CHANNEL_ACCESS_TOKEN` และ `NEXT_PUBLIC_APP_URL` ใน `.env.local` ก่อน):

   ```bash
   node --env-file=.env.local scripts/setup-rich-menu.mjs
   ```

   ทดสอบโดยไม่ต่อเครือข่าย: `node scripts/setup-rich-menu.mjs --dry-run`
4. ตั้ง Webhook URL เป็น `https://<โดเมน>/api/webhook` เปิด **Use webhook** แล้วกด Verify
5. ปิด Auto-reply และ Greeting messages ใน LINE Official Account Manager ถ้าไม่ต้องการให้ LINE ตอบซ้ำ

คำสั่งบอท: `สรุปวันนี้`, `สต็อกต่ำ`, `ช่วยเหลือ`

## 9. (ไม่บังคับ) อีเมล

ถ้าไม่ตั้งค่า ระบบยังสร้างรายงานและบันทึกลงหน้า Documents ได้ แต่จะไม่ส่งอีเมล

1. เปิด 2-Step Verification ในบัญชี Google
2. สร้าง **App Password** ที่ <https://myaccount.google.com/apppasswords>
3. ตั้ง `EMAIL_USER` (อีเมล Gmail) และ `EMAIL_PASS` (App Password) ใน Vercel
4. ตั้ง `REPORT_EMAILS` เป็นรายชื่อผู้รับรายงาน คั่นด้วยจุลภาค (ถ้าไม่ตั้งจะใช้ `ADMIN_EMAILS`)

SMTP อื่นที่ไม่ใช่ Gmail: ตั้ง `EMAIL_HOST` และ `EMAIL_PORT` เพิ่ม

## ทดสอบ cron ด้วยตนเอง

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<โดเมน>/api/cron/daily-report
curl -H "Authorization: Bearer $CRON_SECRET" "https://<โดเมน>/api/cron/daily-report?date=2026-11-01"
curl -H "Authorization: Bearer $CRON_SECRET" https://<โดเมน>/api/cron/line-summary
```

## ปัญหาที่พบบ่อย

- **ไม่ได้รับ push:** ตรวจ `NEXT_PUBLIC_FIREBASE_VAPID_KEY` และ `FIREBASE_SERVICE_ACCOUNT` แล้ว Redeploy iPhone ต้อง iOS 16.4 ขึ้นไปและเพิ่มแอปลงหน้าจอโฮมก่อน
- **เขียนข้อมูลไม่ได้ (permission denied):** ยังไม่ได้ deploy rules ในขั้นตอนที่ 2
- **Build ล้มเหลวเพราะ Sentry:** ไม่ต้องตั้ง `SENTRY_*` ถ้าไม่ใช้ Sentry

## อัปเกรดจากเวอร์ชันเก่า (มีผู้ใช้อยู่แล้ว)

กฎความปลอดภัยใหม่ใช้เอกสาร `settings/setup` ตัดสินว่าใครเป็นแอดมินคนแรก ถ้าระบบเดิมมีผู้ใช้อยู่แล้วแต่ยังไม่มีเอกสารนี้ **คนที่สมัครคนถัดไปจะกลายเป็นแอดมิน** ก่อน deploy กฎใหม่ ให้สร้างเอกสารนี้ใน Firestore console เอง:

- คอลเลกชัน `settings` เอกสาร `setup` ฟิลด์ `adminUid` (string) = UID ของแอดมินคนปัจจุบัน

Upgrading an existing install: before deploying the new rules, create `settings/setup` with `adminUid` set to your current admin's UID. Otherwise the next new sign-up becomes admin.

## Demo deployment (โหมดทดลอง)

ใช้เปิดให้คนทั่วไปลองระบบโดยไม่ต้องล็อกอินและไม่มี backend ข้อมูลทั้งหมดอยู่ในหน่วยความจำของเบราว์เซอร์ และรีเซ็ตทุกครั้งที่รีเฟรชหน้า

1. สร้างโปรเจกต์ Vercel ใหม่ **อีกอัน** จาก repo เดียวกัน (แยกจากโปรเจกต์จริง)
2. ตั้ง Environment Variable เดียว: `NEXT_PUBLIC_DEMO_MODE=true` (ไม่ต้องใส่ค่า Firebase, LINE, อีเมล หรือ Sentry)
3. Deploy ตามปกติ (`npm run build`) ค่า `NEXT_PUBLIC_*` ฝังตอน build ต้อง Redeploy ทุกครั้งที่เปลี่ยน

ทดลองในเครื่อง: `npm run dev:demo` หรือ `npm run build:demo`

ในโหมดนี้ระบบจะสลับ `firebase/firestore`, `firebase/auth`, `firebase/storage` เป็นตัวจำลองใน `lib/demo/` อัตโนมัติ เข้าสู่ระบบเป็นแอดมินเดโมทันที และมีแถบ "โหมดทดลอง" แสดงอยู่ ฟีเจอร์ที่ต้องใช้เซิร์ฟเวอร์ (ส่ง LINE, อีเมล, Push) จะไม่ทำงาน
