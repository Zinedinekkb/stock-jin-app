# การตั้งค่ารายงานอัตโนมัติและ LINE Bot

เอกสารนี้อธิบายการตั้งค่าระบบรายงาน ได้แก่ รายงานประจำวันทางอีเมล, สรุปครึ่งเดือนทาง LINE และ LINE Bot ที่ตอบคำสั่งในกลุ่ม

## ภาพรวม

| ส่วน | ช่องทาง | ตารางเวลา (เวลาไทย) | ค่าใช้จ่าย LINE |
|---|---|---|---|
| รายงานประจำวัน | อีเมล (Gmail SMTP) + หน้า Documents | ทุกวัน 21:00 | ไม่มี |
| สรุปครึ่งเดือน | LINE push 1 ข้อความ | วันที่ 1 และ 16, 20:00 | 1 ข้อความต่อครั้ง (ไม่ควรเกิน 2 ข้อความ/เดือน) |
| LINE Bot | LINE reply | เมื่อมีคนพิมพ์คำสั่งในกลุ่ม | ฟรี (reply ไม่นับโควตา) |

ตารางเวลาอยู่ในไฟล์ `vercel.json` (Vercel Cron เรียกผ่าน GET พร้อม header `Authorization: Bearer <CRON_SECRET>`)

## ตัวแปรสภาพแวดล้อม (Environment Variables)

ตั้งค่าที่ Vercel: Project → Settings → Environment Variables (และในไฟล์ `.env.local` สำหรับการทดสอบในเครื่อง)

| ตัวแปร | จำเป็น | รายละเอียด |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | ใช่ | service account JSON หรือ base64 ของ JSON |
| `CRON_SECRET` | ใช่ | รหัสสุ่มยาวๆ สำหรับป้องกัน cron endpoint |
| `LINE_CHANNEL_SECRET` | ใช่ (สำหรับ Bot) | ใช้ตรวจลายเซ็นของ webhook |
| `LINE_ACCESS_TOKEN` | ใช่ | มีอยู่แล้ว ใช้ทั้ง push และ reply |
| `LINE_GROUP_ID` | ใช่ (สำหรับสรุปครึ่งเดือน) | id ของกลุ่มที่รับสรุป (ถ้าไม่มีใช้ `LINE_USER_ID`) |
| `EMAIL_USER`, `EMAIL_PASS` | ใช่ | มีอยู่แล้ว (Gmail App Password) |
| `EMAIL_HOST` / `SMTP_HOST`, `EMAIL_PORT` / `SMTP_PORT` | ไม่ | ค่าเริ่มต้น smtp.gmail.com และ 465 |
| `REPORT_EMAILS` | ไม่ | รายชื่ออีเมลผู้รับรายงานประจำวัน คั่นด้วยเครื่องหมายจุลภาค ถ้าไม่ตั้งจะใช้ `ADMIN_EMAILS` / `ADMIN_EMAIL` |
| `NEXT_PUBLIC_APP_URL` | ไม่ | URL ของแอป ถ้าไม่ตั้งจะใช้โดเมนของคำขอ (request origin) แทน |

### วิธีได้ค่าแต่ละตัว

**FIREBASE_SERVICE_ACCOUNT**
1. เปิด Firebase Console → เลือกโปรเจกต์ → Project settings (ไอคอนเฟือง)
2. แท็บ Service accounts → กด Generate new private key → ดาวน์โหลดไฟล์ JSON
3. นำเนื้อหาไฟล์ทั้งหมดไปวางในค่า Vercel ได้เลย (JSON ดิบ) หรือแปลงเป็น base64 ก่อนวางก็ได้
4. **อย่า commit ไฟล์ JSON นี้ลงใน Git** และลบไฟล์ที่ดาวน์โหลดหลังตั้งค่าเสร็จ

**CRON_SECRET**
- สร้างรหัสสุ่มยาวๆ เช่น รันคำสั่ง `openssl rand -hex 32` แล้วนำค่าไปวางใน Vercel

**LINE_CHANNEL_SECRET**
1. เปิด LINE Developers Console → เลือก Provider → เลือก Messaging API channel
2. แท็บ Basic settings → คัดลอกค่า Channel secret

**REPORT_EMAILS** (ไม่บังคับ)
- ตัวอย่าง: `owner@example.com,manager@example.com`

## ตั้งค่า LINE Webhook

1. LINE Developers Console → Messaging API → Webhook URL ใส่ `https://<โดเมน>/api/webhook`
2. เปิด **Use webhook** เป็น ON และกด Verify เพื่อทดสอบ
3. LINE Official Account Manager → การตอบกลับ (Response settings) → ปิด **Auto-reply messages** และ **Greeting messages** ถ้าไม่ต้องการให้ LINE ตอบซ้ำ
4. เชิญบอทเข้ากลุ่มที่ต้องการ แล้วพิมพ์ `ช่วยเหลือ` เพื่อทดสอบ

คำสั่งที่บอทรองรับ
- `สรุปวันนี้` หรือ `สรุป` สรุปความเคลื่อนไหวของวันนี้
- `สต็อกต่ำ` หรือ `สต็อก` รายการสินค้าใกล้หมด
- `ช่วยเหลือ` หรือ `help` แสดงรายการคำสั่ง

## ทดสอบด้วยตนเอง

แทน `<โดเมน>` และ `$CRON_SECRET` ด้วยค่าจริง

```bash
# ส่งรายงานประจำวันของวันนี้ (เวลาไทย) ทางอีเมล และบันทึกลง Documents
curl -H "Authorization: Bearer $CRON_SECRET" https://<โดเมน>/api/cron/daily-report

# สร้างรายงานย้อนหลังของวันที่ระบุ
curl -H "Authorization: Bearer $CRON_SECRET" "https://<โดเมน>/api/cron/daily-report?date=2026-11-01"

# ส่งสรุปครึ่งเดือนเข้า LINE (จะนับโควตา 1 ข้อความ)
curl -H "Authorization: Bearer $CRON_SECRET" https://<โดเมน>/api/cron/line-summary
```

- ผลลัพธ์เป็น JSON เช่น `{"ok":true,"dateKey":"2026-11-08","emailedTo":[...]}`
- ถ้าไม่ได้ตั้งค่าอีเมล ระบบจะยังสร้างรายงานและบันทึกลง Documents ได้ตามปกติ โดยจะระบุ `emailSkipped` ในผลลัพธ์
- รายงานที่สร้างแล้วเปิดดูได้ที่ `https://<โดเมน>/api/reports/<YYYY-MM-DD>?t=<token>` (ลิงก์อยู่ในอีเมลและในหน้า Documents) มีปุ่มพิมพ์ในหน้า

## หมายเหตุ

- รันรายงานประจำวันซ้ำในวันเดียวกันจะเขียนทับรายงานเดิม และอัปเดตรายการเดิมในหน้า Documents (ไม่สร้างซ้ำ)
- Vercel Cron ใช้เวลา UTC: `0 14 * * *` = 21:00 เวลาไทย และ `0 13 1,16 * *` = 20:00 เวลาไทย วันที่ 1 และ 16


## การแจ้งเตือนบนมือถือ (Push Notification ผ่าน FCM)

ระบบส่งการแจ้งเตือนไปยังมือถือ (iPhone/Android) และเดสก์ท็อปผ่าน Firebase Cloud Messaging (FCM) เมื่อมีเหตุการณ์ เช่น ใบเบิก/รับใหม่รอตรวจ, ใบเบิก/รับได้รับการตรวจหรือถูกยกเลิก, มีงานใหม่มอบหมาย, มีใบลาใหม่รออนุมัติ และผลการพิจารณาใบลา

### 1. สร้างคู่กุญแจ Web Push (VAPID key)

1. เปิด Firebase Console ของโปรเจกต์ แล้วไปที่ Project settings (ไอคอนเฟืองข้างบน)
2. เลือกแท็บ **Cloud Messaging**
3. ไปที่หัวข้อ **Web configuration** แล้วกด **Generate key pair**
4. คัดลอกค่า **Key pair** ที่ขึ้นต้นด้วย `B...`

### 2. ตรวจสอบว่าเปิด Cloud Messaging API (V1) แล้ว

ที่ Project settings > Cloud Messaging ให้ตรวจว่า **Firebase Cloud Messaging API (V1)** เป็นสถานะ Enabled
(ถ้ายังไม่เปิด ให้กด Manage API ใน Google Cloud Console แล้วกด Enable)

### 3. ตั้งค่า Environment Variable ที่ Vercel

Project → Settings → Environment Variables เพิ่มค่า:

| ตัวแปร | ค่า |
|---|---|
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Key pair ที่คัดลอกจากขั้นตอนที่ 1 |

หลังเพิ่มค่าแล้วต้อง **Redeploy** ใหม่ทุกครั้ง เพราะค่า `NEXT_PUBLIC_*` ถูกฝังตอน build

ตัวแปรที่เกี่ยวข้องอื่น ๆ (ใช้ค่าที่มีอยู่แล้ว):

- `FIREBASE_SERVICE_ACCOUNT` ใช้ส่ง push จากเซิร์ฟเวอร์ (ต้องมีอยู่แล้ว)
- `NEXT_PUBLIC_APP_URL` ใช้สร้างลิงก์ที่เปิดเมื่อกดการแจ้งเตือน (ไม่บังคับ ถ้าไม่ตั้งจะใช้โดเมนของคำขอ)

### 4. วิธีที่ผู้ใช้เปิดการแจ้งเตือน

- **Android / คอมพิวเตอร์ (Chrome, Edge):** เข้าเว็บแอป เมนู > การตั้งค่า แล้วกด **เปิดการแจ้งเตือนบนอุปกรณ์นี้** แล้วกดอนุญาตเมื่อเบราว์เซอร์ถาม
- **iPhone (iOS 16.4 ขึ้นไป):** ต้องติดตั้งแอปลงหน้าจอโฮมก่อน โดยเปิดเว็บใน Safari กดปุ่มแชร์ แล้วเลือก **เพิ่มไปยังหน้าจอโฮม** จากนั้นเปิดแอปจากไอคอนบนหน้าจอ แล้วไปที่ เมนู > การตั้งค่า > **เปิดการแจ้งเตือน** และกดอนุญาต
- ถ้าการแจ้งเตือนถูกบล็อก ให้ไปที่การตั้งค่าของเบราว์เซอร์ (หรือการตั้งค่า iPhone > การแจ้งเตือน > ชื่อแอป) แล้วอนุญาตสำหรับเว็บนี้ จากนั้นรีเฟรชหน้า

### หมายเหตุ

- การแจ้งเตือนเป็นรายอุปกรณ์ ผู้ใช้ที่ใช้หลายเครื่องต้องเปิดในแต่ละเครื่อง
- เมื่อแอปเปิดอยู่ข้างหน้า ระบบจะแสดงการแจ้งเตือนเป็นข้อความบนหน้าจอแทน
- token ที่หมดอายุหรือไม่ถูกต้องจะถูกลบออกจากข้อมูลผู้ใช้โดยอัตโนมัติ

## Rich Menu (เมนูปุ่ม LINE)

เมนูปุ่มด้านล่างแชท LINE มี 3 ปุ่ม: **สรุปวันนี้**, **สต็อกต่ำ** (ส่งข้อความเข้าบอท) และ **เปิดแอป** (เปิดเว็บแอปโดยตรง)

ติดตั้งหรืออัปเดตเมนู (รันซ้ำได้ ระบบจะลบเมนูเดิมที่ชื่อ `stockpro-main` ให้):

```bash
node --env-file=.env.local scripts/setup-rich-menu.mjs
```

ทดสอบสร้างรูปและดู JSON โดยไม่เชื่อมต่อเครือข่าย (ไม่ต้องมี token):

```bash
node scripts/setup-rich-menu.mjs --dry-run
```

- ต้องตั้งค่า `LINE_CHANNEL_ACCESS_TOKEN` ใน `.env.local` ก่อนรันจริง
- `NEXT_PUBLIC_APP_URL` ใช้เป็นลิงก์ของปุ่ม "เปิดแอป" (จำเป็นเมื่อรัน scripts/setup-rich-menu.mjs)
- รูปที่สร้างอยู่ที่ `scripts/rich-menu.png` (2500x843, ไม่เกิน 1MB)
- การกดปุ่มข้อความจะส่งข้อความปกติเข้าบอท บอทตอบกลับด้วย reply message ซึ่ง **ไม่นับโควตา push 300 ข้อความ/เดือน**
