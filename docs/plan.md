# รีวิว LINE Webhook — lineme

> วันที่รีวิว: 2026-07-29 · ขอบเขต: รีวิวอย่างเดียว (ไม่มีการแก้ไฟล์ในโปรเจกต์)

## Context

ตรวจสอบ LINE Messaging API webhook ที่ทำไว้ ว่าตรงตาม best practice หรือไม่

สถานะโปรเจกต์: Next.js 16.2.6 (App Router), `@line/bot-sdk` v11, Prisma 7 + Postgres,
Gemini + Typhoon ASR, **ยังไม่ได้ deploy — dev ผ่าน ngrok เท่านั้น**

ไฟล์หลักที่ตรวจ:
- `app/api/line-webhook/route.ts` (25 บรรทัด — จุดรับ webhook)
- `handlers/index.ts`, `handlers/messageHandler.ts`, `handlers/followHandler.ts`
- `config/line-config.ts`
- `services/replyService.ts`, `replyRuleService.ts`, `userService.ts`, `geminiService.ts`, `typhoon.ts`

---

## ✅ สิ่งที่ทำถูกตาม best practice แล้ว

| จุด | ทำไมถูก |
|---|---|
| `await req.text()` ก่อน `JSON.parse` | HMAC ต้องคำนวณจาก **raw body** ถ้าใช้ `req.json()` แล้ว stringify กลับ signature จะเพี้ยน — ตรงนี้ทำถูก |
| ใช้ `validateSignature` ของ SDK | ข้างในใช้ `crypto.timingSafeEqual` กัน timing attack — ดีกว่าเขียน HMAC เอง |
| ตรวจ signature **ก่อน** ทำอย่างอื่นทั้งหมด | ลำดับถูกต้อง |
| ใช้ `@line/bot-sdk` v11 namespaced API (`messagingApi`, `webhook.Event`) | เป็น API ปัจจุบัน ไม่ใช่ v7 แบบเก่า |
| รันบน Node runtime (ไม่ได้ตั้ง `runtime = "edge"`) | จำเป็น เพราะ `validateSignature` ใช้ `node:crypto` และ audio path ใช้ `Buffer` |
| `HTTPFetchError` narrowing ใน `replyService.ts:17` / `followHandler.ts:27` | จัดการ error ของ LINE API ได้ถูกชนิด |
| `if (!event.replyToken) return` | guard ถูกต้อง (บาง event ไม่มี replyToken) |
| แยกชั้น route → handlers → services | โครงสร้างสะอาด ขยายง่าย |
| Prisma singleton cache บน `globalThis` | กัน connection leak ตอน hot reload |

---

## 🔴 Critical — ต้องแก้ก่อน deploy จริง

### C1. `showLoadingAnimation` ไม่มี `.catch()` → 500 เมื่อบอทอยู่ในกลุ่ม
`handlers/messageHandler.ts:29-33`

```ts
await lineClient.showLoadingAnimation({   // ← ไม่มี .catch()
  chatId: userId,
  loadingSeconds: 5,
});
```

`showLoadingAnimation` ใช้ได้เฉพาะแชท 1:1 เท่านั้น แต่ในกลุ่ม/ห้องแชท `event.source.userId`
ก็ยังมีค่า → เงื่อนไข `if (userId)` ผ่าน → LINE ตอบ 400 → SDK throw → เด้งขึ้นไปที่ `route.ts`
ซึ่งไม่มี try/catch → **500 → LINE retry ซ้ำ ๆ**

สังเกตว่าอีกสองจุด (`:59-63` และ `:90-94`) มี `.catch(console.error)` แล้ว — จุดนี้ตกหล่นจุดเดียว

**ควรเป็น:** guard ด้วย `event.source?.type === "user"` แล้วต่อ `.catch(console.error)` ให้ครบทั้ง 3 จุด

---

### C2. `route.ts` ไม่มี try/catch เลย → LINE retry storm
`app/api/line-webhook/route.ts:15-25`

`JSON.parse` โยน error ได้, `handleLineEvent` โยน error ได้ → ทั้งคู่กลายเป็น 500

**best practice ของ LINE:** เมื่อรับ event แล้ว **ให้ตอบ 200 เสมอ** แม้ระบบภายในพัง —
เพราะ non-2xx ทำให้ LINE retry และถ้า error rate สูงต่อเนื่อง LINE จะขึ้นเตือน/ปิด webhook ให้เอง
error ภายในเป็นเรื่องที่เรา log และจัดการเองในบ้าน ไม่ใช่เรื่องที่ LINE ต้องรู้

---

### C3. Text branch ไม่มี try/catch
`handlers/messageHandler.ts:20-83`

audio branch มี try/catch ครบ (`:96-180`) แต่ text branch ไม่มีเลย
ถ้า `generateGeminiReply` หรือ Prisma throw → 500 + **ผู้ใช้ไม่ได้รับข้อความตอบกลับอะไรเลย**

(หมายเหตุ: `geminiService` มี outer catch ที่คืนข้อความขอโทษอยู่แล้ว จึงกันไว้ได้ระดับหนึ่ง
แต่ `findMatchedReply` (Prisma) และ `lineClient.replyMessage` ยังไม่มีอะไรกัน)

---

### C4. รอประมวลผลจนเสร็จก่อนตอบ 200 — ผิดหลัก LINE โดยตรง
`app/api/line-webhook/route.ts:23-25`

```ts
await Promise.all(body.events.map(handleLineEvent));  // ← รอ Gemini + ASR + DB
return NextResponse.json({ status: "success" });
```

หลัก LINE คือ **ตอบ 200 ให้เร็วที่สุด แล้วค่อยไปประมวลผลต่อเบื้องหลัง**
ตอนนี้ webhook รอครบทั้ง Typhoon ASR (ดาวน์โหลดไฟล์เสียง + ถอดเสียง) + Gemini
(มี fallback chain `flash-lite` → `flash` = ยิง 2 รอบ) + DB writes — รวมกันได้หลายสิบวินาที

ผลที่ตามมา: LINE ถือว่าส่งไม่สำเร็จ → retry → **Gemini ถูกเรียกซ้ำ, ChatHistory ซ้ำ, โควตาไหม้**
(ส่วน reply token ใช้ได้ครั้งเดียว รอบสองจึงตอบไม่ออก — ผู้ใช้เห็นเป็น "บอทเงียบ")

**วิธีที่ถูกต้องบน Next 16:** ใช้ `after()` จาก `next/server`
— stable ตั้งแต่ v15.1 (ยืนยันจาก `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`)
ทำงานได้ทั้งบน Node server เองและบน serverless (Next แปลงเป็น `waitUntil` ให้)

โครงที่ควรเป็น (รวมแก้ C2 + C5 + H1 ไปด้วย):

```ts
import { after, NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;   // กัน timeout ตอน deploy จริง

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!signature || !channelSecret ||
      !validateSignature(bodyText, channelSecret, signature)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: webhook.CallbackRequest;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const events = body.events ?? [];

  // ตอบ 200 ก่อน แล้วค่อยประมวลผล
  after(async () => {
    const results = await Promise.allSettled(events.map(handleLineEvent));
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`[Webhook] event ${events[i]?.webhookEventId} ล้มเหลว:`, r.reason);
      }
    });
  });

  return new NextResponse(null, { status: 200 });
}
```

---

### C5. `channelSecret` fallback เป็น `""` → เปิดช่องปลอม signature
`config/line-config.ts:4`

```ts
export const channelSecret = process.env.CHANNEL_SECRET || "";
```

ถ้าลืมตั้ง env (เช่นตอน deploy ครั้งแรก) โค้ดจะ**ไม่พัง** แต่จะไป `validateSignature(body, "", sig)`
คือตรวจ HMAC ด้วย key ว่าง — ใครก็ตามที่รู้ว่าระบบตั้ง env พลาด สามารถคำนวณ signature
ด้วย key ว่างแล้วยิง event ปลอมเข้ามาได้

เช่นเดียวกันกับ `CHANNEL_ACCESS_TOKEN || ""` (`:7`, `:11`) — จะกลายเป็น 401 จาก LINE
แบบงง ๆ แทนที่จะฟ้องตั้งแต่ตอน start

**ควรเป็น:** throw ตั้งแต่ตอน import ถ้า env หาย (fail fast) หรืออย่างน้อยเช็ค `!channelSecret` ใน route

---

## 🟠 High

### H1. `Promise.all` → event เดียวพัง ทั้ง batch พัง
`route.ts:23` — LINE ส่งได้หลาย event ต่อ 1 request ถ้า event แรก reject
event ที่เหลือจะถูกทิ้ง error และไม่มีใครรู้ว่าเกิดอะไรกับตัวไหน → ใช้ `Promise.allSettled` แทน

### H2. ไม่มี `unfollow` handler → ข้อมูล `isFollowing` ผิดถาวร
`handlers/index.ts:14-15` — `unfollow` ตกไปที่ `default: return`
ใน `prisma/schema.prisma` มีฟิลด์ `isFollowing` แต่ถูก set เป็น `true` อย่างเดียว
(`userService.ts:22,29`) **ไม่มีที่ไหนเซ็ตเป็น `false` เลย**

ผลคือถ้าจะทำ broadcast/push ในอนาคต จะยิงหาคนที่บล็อกบอทไปแล้ว → โควตา push ไหม้เปล่า
และ LINE คิดเงินตาม message ที่ส่ง

### H3. ไม่จัดการ redelivery / idempotency
LINE มีระบบ retry ที่ส่ง header `X-Line-Retry-Key` และ flag `event.deliveryContext.isRedelivery`
ตอนนี้ไม่ได้อ่านทั้งคู่ → event ที่ถูกส่งซ้ำจะเรียก Gemini ใหม่ + เขียน `ChatHistory` ซ้ำ

`webhookEventId` ก็มีอยู่ในทุก event แต่ไม่ถูกใช้ — เป็น key ที่เหมาะกับการทำ dedup

### H4. `updateProfileInBackground` ยิง LINE API + เขียน DB **ทุกข้อความ**
`handlers/messageHandler.ts:16-18` → `services/userService.ts:40`

ทุกครั้งที่ผู้ใช้พิมพ์อะไรมา = `getProfile` 1 ครั้ง + `upsert` 1 ครั้ง
ทั้งที่โปรไฟล์แทบไม่เปลี่ยน → เปลืองโควตา LINE API และเขียน DB ทิ้ง ๆ ขว้าง ๆ

ปัญหาซ้อน 2 ชั้น:
1. เป็น **floating promise** — ตอน deploy บน serverless มีโอกาสถูกฆ่ากลางทางเมื่อ response ส่งกลับ (ควรอยู่ใน `after()`)
2. `catch` ว่างเปล่า (`userService.ts:53-55`) — พังแล้วเงียบสนิท debug ไม่ได้

**ควรเป็น:** refresh เฉพาะเมื่อ `updatedAt` เก่ากว่า ~24 ชม. หรืออาศัย `follow` event เป็นหลัก

### H5. Reply token อาจหมดอายุใน audio path
reply token ใช้ได้ **ครั้งเดียว** และมีอายุจำกัด แต่ audio path ต้อง
ดาวน์โหลดไฟล์เสียง → Typhoon ASR → keyword lookup → Gemini (อาจ 2 รอบ) ก่อนจะได้ตอบ
ถ้าเกินอายุ token → `replyMessage` fail → `replyService.ts:23` คืน `null` **เงียบ ๆ**
ผู้ใช้เห็นแค่ loading หมุนแล้วหายไป

พิจารณา fallback เป็น push message เมื่อ reply ล้มเหลว (แลกกับโควตา push)

### H6. Admin API routes ไม่มี auth เลย
`app/api/keywords/route.ts`, `app/api/keywords/[id]/route.ts`,
`app/api/richmenu/route.ts`, `app/api/richmenu/[id]/route.ts`, `app/api/richmenu/link/route.ts`

ทุกเส้นเปิดโล่ง — ใครรู้ URL ก็ลบ/แก้ auto-reply, สร้าง/ลบ rich menu, ผูก rich menu ให้ user คนไหนก็ได้
(นอกขอบเขต webhook โดยตรง แต่อยู่ในระบบเดียวกันและร้ายแรงกว่า)

### H7. Server action เชื่อ `lineId` ที่ client ส่งมา
`app/actions/userAction.ts` — `saveUserNameAction(lineId, ...)` รับ `lineId` จากฝั่ง client ตรง ๆ
ใครก็ยิง action นี้พร้อม lineId ของคนอื่นเพื่อเขียนทับข้อมูลได้

**best practice ของ LIFF:** ส่ง ID token (`liff.getIDToken()`) มาแทน แล้วฝั่งเซิร์ฟเวอร์ยืนยันกับ
`https://api.line.me/oauth2/v2.1/verify` เพื่อดึง `sub` (= userId ที่เชื่อถือได้) ออกมาใช้

---

## 🟡 Medium

| # | จุด | รายละเอียด |
|---|---|---|
| M1 | `messageHandler.ts` | รองรับแค่ `text` / `audio` — image, video, file, location, sticker เงียบสนิท ไม่ตอบอะไรเลย ควรมี fallback message |
| M2 | `handlers/index.ts:12-13` | `postback` ยัง comment ไว้ และไม่มี `join`/`leave`/`memberJoined`/`unsend`/`videoPlayComplete` — ถ้ามีแผนใช้ rich menu แบบ postback ต้องเปิดตัวนี้ |
| M3 | `replyRuleService.ts:28-33` | ดึง `AutoReply` แบบ CONTAINS **ทั้งตาราง** ทุกข้อความ — ควร cache in-memory แบบมี TTL หรือใช้ React `cache` |
| M4 | `route.ts` | ไม่มี `runtime` / `maxDuration` route segment config — บน Vercel hobby default 10s จะไม่พอ |
| M5 | env | ไม่มี `.env.example`, ชื่อ env ไม่มี prefix (`CHANNEL_SECRET` เฉย ๆ เสี่ยงชนกับตัวแปรอื่น — ปกตินิยม `LINE_CHANNEL_SECRET`) |
| M6 | `messageHandler.ts:42,141` | `(msg: any)` — เสีย type safety ของ `messagingApi.Message` ที่ SDK ให้มาแล้ว |
| M7 | `messageHandler.ts:36-39,76-79,135-138,166-169` | object `sender` (น้องกรีน / น้องโปรแกรม) hardcode ซ้ำ 4 ที่ ควรดึงเป็น constant ที่เดียว |
| M8 | `messageHandler.ts:85` | `if (event.message.type === "audio")` ควรเป็น `else if` (ตอนนี้ไม่พังเพราะ type ตัดกันอยู่แล้ว แต่อ่านแล้วชวนเข้าใจผิด) |
| M9 | ทั้งระบบ | log เป็น `console.log`/`console.error` ล้วน ไม่มี `webhookEventId` ติดไปด้วย — พอ event พังจริงจะสืบไม่ได้ว่าเป็นตัวไหน |
| M10 | `typhoon.ts:46` | `data.text.trim()` — ถ้า API คืน response ที่ไม่มีฟิลด์ `text` จะ throw TypeError (ตกไป catch แล้วกลายเป็นข้อความ error ทั่วไป ทำให้ debug ยาก) ควรเป็น `data.text?.trim()` |
| M11 | `typhoon.ts:8-11` | `const TYPHOON_API_KEY = "sk-..."` เป็น literal แล้วเช็ค `if (!TYPHOON_API_KEY)` ต่อ — เงื่อนไขนี้เป็นจริงไม่ได้เลย เป็นเศษโค้ดจากตอนที่เคยอ่านจาก env |

---

## 📌 หมายเหตุด้านความปลอดภัย (เจ้าของโปรเจกต์เลือก "ปล่อยไว้ก่อน")

`services/typhoon.ts:8` มี API key hardcode อยู่ในซอร์ส และ**ติดอยู่ใน git history แล้ว**
(commit `074df3c`) — ยังไม่ต้องจัดการตอนนี้ บันทึกไว้เพื่อไม่ให้ลืมก่อน push ขึ้น public repo

ข้อดี: `.gitignore` ครอบคลุม `.env*` อยู่แล้ว และตรวจแล้วว่า `.env` **ไม่ได้** ถูก track ใน git

---

## สรุปลำดับความสำคัญ (ถ้าจะแก้)

1. **C1** — bug จริงที่ทำให้ 500 ในกลุ่มแชท (แก้ 2 บรรทัด)
2. **C2 + C4 + H1** — ยกเครื่อง `route.ts` ใช้ `after()` + `allSettled` + try/catch (ไฟล์เดียว ~25 บรรทัด ได้ผลมากที่สุด)
3. **C3** — ครอบ try/catch text branch
4. **C5** — fail fast เมื่อ env หาย
5. **H2** — เพิ่ม `unfollowHandler`
6. **H4** — throttle `updateProfileInBackground`
7. **H6 + H7** — auth ของ admin routes และ LIFF ID token verification
8. ที่เหลือตามสะดวก

---

## การตรวจสอบ (ถ้าตัดสินใจแก้ภายหลัง)

- ยิง webhook ปลอมด้วย signature ผิด → ต้องได้ 401
- ยิงด้วย body ที่ไม่ใช่ JSON → ต้องได้ 400 ไม่ใช่ 500
- กด "Verify" ใน LINE Developers Console (ส่ง `events: []`) → ต้องได้ 200
- วัดเวลา response จาก LINE Console หลังใส่ `after()` → ควรลดเหลือหลัก ms
- เชิญบอทเข้ากลุ่ม แล้วพิมพ์ keyword ที่ตั้ง `showLoading: true` → ต้องไม่ 500 (เทสต์ C1)
- ส่งข้อความ 3 ข้อความติดกันเร็ว ๆ → ตรวจว่า handler ไม่ล้มทั้ง batch
- ส่งรูป/สติกเกอร์ → ตรวจว่ามี fallback ตอบ ไม่ใช่เงียบ
