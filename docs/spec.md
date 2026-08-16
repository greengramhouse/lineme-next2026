# Spec — แผนดำเนินการแก้ LINE Webhook (lineme)

> อ้างอิงจาก `docs/plan.md` (รีวิว 2026-07-29) · ตรวจสอบความถูกต้องกับโค้ดจริงแล้วเมื่อ 2026-08-16 — ทุกข้อยังเป็นจริง ไม่มี drift
>
> **วิธีใช้ไฟล์นี้:** ทำข้อไหนเสร็จให้เปลี่ยน `[ ]` เป็น `[x]` แล้ว commit ไฟล์นี้ไปพร้อมกับโค้ด
> จะได้รู้ตลอดว่าค้างตรงไหน

## สถานะ ณ 2026-08-16 · branch `fix/webhook-hardening`

| Phase | สถานะ | commit |
|---|---|---|
| 0 — เตรียมพื้นที่ | ✅ เสร็จ | `5a70e55` |
| 1 — Critical C1-C5 + H1 + M4 | ✅ เสร็จ ทดสอบผ่าน 7/7 | `9fb4bfe` |
| 2 — High H2 / H4 / H5 | ✅ เสร็จ ทดสอบผ่าน 5/5 | `35e8363` |
| 3 — H3 idempotency | ✅ เสร็จ ทดสอบผ่าน 4/4 | `5117154` |
| 3 — H6 admin auth (Better Auth + LINE Login) | ✅ เสร็จ ทดสอบผ่าน 15/15 | `ef5f0cd` |
| 3 — H7 LIFF ID token | ✅ เสร็จ ทดสอบผ่าน 6/6 | `d444044` |
| 4 — Medium M1/M3/M5a/M6-M11 | ✅ เสร็จ ทดสอบผ่าน 12/12 | `a73ca0c` |
| 4 — M2 postback, M5b เปลี่ยนชื่อ env | ⏸ ข้ามตามที่ตัดสินใจ | — |
| 5 — ย้าย Typhoon key ไป env | ✅ เสร็จ ทดสอบผ่าน 4/4 | `c72752c` |
| 5 — ตั้ง env / ตรวจ Vercel | ⬜ ค้าง (5.2b, 5.2d, 5.4, 5.5, 5.6) | — |

โค้ดทั้งหมด push ขึ้น `origin/main` แล้ว (`c72752c`)

## ✅ ยืนยันบน production แล้ว — 2026-08-16

โค้ดทั้งหมด push ขึ้น `origin/main` และ deploy บน `https://lineme-next2026.vercel.app` เรียบร้อย
เจ้าของโปรเจกต์ทดสอบล็อกอินจริงผ่านแล้ว และตรวจซ้ำจากภายนอกได้ผล **11/11**:

| ตรวจ | ผล |
|---|---|
| 🔴 `POST /api/line-webhook` signature ถูก | **200** — ไม่ถูก auth บล็อก |
| 🔴 `POST /api/line-webhook` signature ผิด | **401** — `validateSignature` ยังทำงาน |
| `GET /dashboard` | 307 → `/login?redirect=%2Fdashboard` |
| `POST /api/keywords`, `/api/richmenu`, `/api/richmenu/link` | 401 ทุกเส้น |
| `/login`, `/`, `/form/userform`, `/api/auth/*` | 200 ตามเดิม |
| `redirect_uri` ของ LINE Login | `https://lineme-next2026.vercel.app/api/auth/callback/line` |
| scope / PKCE | `openid profile email` · `S256` |

env บน Vercel ตั้งครบแล้ว (`BETTER_AUTH_URL` ชี้ production ถูก ไม่ใช่ localhost)
และลง Callback URL ทั้ง localhost + production ใน LINE Developers Console แล้ว

---

**ค้างอยู่:**
1. 🔴 **revoke Typhoon key เดิม** (ข้อ 5.2b) — key ใหม่ใช้งานได้แล้ว แต่ key เดิมยังดึงได้จาก
   git history ที่ commit `074df3c` บน public repo และ**ยังใช้งานได้อยู่จนกว่าจะ revoke**
2. ทดสอบจากมือถือจริง: ส่งข้อความเสียง, บล็อก/ปลดบล็อกบอท, เชิญบอทเข้ากลุ่มแล้วพิมพ์
   keyword ที่ตั้ง `showLoading: true`
3. M2 postback — ถ้าจะใช้ rich menu แบบ postback (ข้อ 4.2-4.3)

> **เกร็ดจากการ debug:** แก้ `schema.prisma` แล้วต้อง **รีสตาร์ท dev server** ไม่ใช่แค่
> `prisma generate` เพราะ `lib/prisma.ts` cache PrismaClient ไว้บน `globalThis`
> (ตัวที่กัน connection leak) ซึ่งอยู่รอดข้าม hot reload ไฟล์ที่ generate ใหม่จึงไม่ถูกโหลด
> อาการคือ Better Auth ฟ้อง `Model adminVerification does not exist in the database`
> ทั้งที่ทั้ง client และตารางใน DB มีครบ — production ไม่เจอปัญหานี้เพราะ `build` script
> รัน `prisma generate` ก่อน `next build` อยู่แล้ว

---

## สภาพแวดล้อมที่ยืนยันแล้ว (ไม่ต้องตรวจซ้ำ)

- Next.js 16.2.6 — `after()` stable ตั้งแต่ v15.1.0, รองรับ Node.js server (ตรงกับ dev ผ่าน ngrok)
- `export const runtime = 'nodejs'` และ `export const maxDuration` ใช้ได้ ไม่มี deprecation
- env ครบแล้วใน `.env`: `CHANNEL_SECRET`, `CHANNEL_ACCESS_TOKEN`, `DATABASE_URL`, `DIRECT_URL`, `GEMINI_API_KEY`, `NEXT_PUBLIC_LIFF_ID`
- ไม่มี `middleware.ts` / `proxy.ts` ในโปรเจกต์ → ยังไม่มีระบบ auth ใด ๆ
- ยังไม่ได้ deploy — dev ผ่าน ngrok เท่านั้น

---

## Phase 0 — เตรียมพื้นที่ทำงาน

- [x] **0.1** commit งานที่ค้างอยู่ก่อน — `pnpm-workspace.yaml` มีการเพิ่ม `allowBuilds` ที่ยังไม่ commit
      → commit `5a70e55` บน `main`
- [x] **0.2** สร้าง branch ใหม่สำหรับงานชุดนี้ → `fix/webhook-hardening`
- [ ] **0.3** ~~ยิงข้อความทดสอบ baseline ก่อนแก้~~ — **ข้ามไป** (ทำ regression test ด้วย signed request จริงหลังแก้แทน ดูข้อ 1.15-1.20)

---

## Phase 1 — Critical (แตะแค่ 3 ไฟล์ ไม่ต้อง migrate DB)

> ทั้ง Phase นี้ไม่ต้องตัดสินใจอะไรเพิ่ม ทำได้ทันที

### C1 — `showLoadingAnimation` ไม่มี `.catch()` → 500 เมื่อบอทอยู่ในกลุ่ม

ไฟล์: `handlers/messageHandler.ts:29-33`

- [x] **1.1** เติม `.catch(console.error)` ที่ `showLoadingAnimation` ตัวแรก
- [x] **1.2** เพิ่ม guard `event.source?.type === "user"` ให้ครบทั้ง 3 จุด
- [x] **1.3** ดึงออกมาเป็น helper เดียว → `showLoadingSafely(event, loadingSeconds)`
      ที่ `handlers/messageHandler.ts:12-31` ทั้ง 3 จุดเรียกใช้ helper นี้แล้ว ไม่มีการเรียก
      `showLoadingAnimation` ตรง ๆ เหลืออยู่

### C5 — `channelSecret` fallback เป็น `""` → เปิดช่องปลอม signature

ไฟล์: `config/line-config.ts:4,7,11`

- [x] **1.4** เอา `|| ""` ออกจาก `CHANNEL_SECRET` → ใช้ helper `requireEnv()` ที่ throw ตอน import
- [x] **1.5** ทำแบบเดียวกันกับ `CHANNEL_ACCESS_TOKEN` (รวมเป็นตัวแปรเดียวใช้ทั้ง 2 client)
- [x] **1.6** ยืนยันว่า `pnpm dev` และ `next build` ยังขึ้นปกติ — build ผ่าน 14/14 หน้า

> ⚠️ **ผลข้างเคียงที่ต้องรู้ก่อน deploy:** การ throw ตอน import แปลว่า `next build` จะพังด้วย
> ถ้า env ไม่ครบ **ตอน build** ไม่ใช่แค่ตอน runtime (Next รัน route module ตอน "Collecting page data")
> → ต้องตั้ง env บน platform ให้ครบ **ก่อน** สั่ง build ไปผูกไว้ที่ข้อ 5.4 แล้ว

> **หมายเหตุ:** เลือกทางเดียวพอ — throw ตอน import (แนะนำ) **หรือ** เช็ค `!channelSecret` ใน route
> ถ้าทำ 1.4 แล้ว ใน Phase 1.7 ไม่ต้องเช็คซ้ำ

### C2 + C4 + H1 — ยกเครื่อง `route.ts`

ไฟล์: `app/api/line-webhook/route.ts` (ทั้งไฟล์ 26 บรรทัด) — **ได้ผลมากที่สุดต่อแรงที่ลง**

- [x] **1.7** เพิ่ม `export const runtime = "nodejs"` และ `export const maxDuration = 60` (แก้ M4 ไปด้วย)
- [x] **1.8** ครอบ `JSON.parse` ด้วย try/catch → ตอบ **400** (C2)
- [x] **1.9** ย้ายการประมวลผล event เข้า `after()` จาก `next/server` แล้วตอบ 200 ทันที (C4)
- [x] **1.10** เปลี่ยนเป็น `Promise.allSettled` + log ตัวที่ `rejected` พร้อม `webhookEventId` (H1)
- [x] **1.11** รองรับ `body.events` ที่เป็น `undefined` / array ว่าง
- [x] **1.12** ลบคอมเมนต์เก่าเรื่อง sequential for-loop ออก
- [x] **1.12b** เพิ่มการเช็ค `!signature` แยกก่อน `validateSignature` (เดิมใช้ `|| ""`)

โครงที่ควรได้ (จาก `plan.md`):

```ts
import { after, NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!signature || !validateSignature(bodyText, channelSecret, signature)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: webhook.CallbackRequest;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const events = body.events ?? [];

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

### C3 — Text branch ไม่มี try/catch

ไฟล์: `handlers/messageHandler.ts:20-83`

- [x] **1.13** ครอบ text branch ทั้งก้อนด้วย try/catch
- [x] **1.14** ใน `catch` ตอบข้อความขอโทษกลับผู้ใช้ผ่าน `replyMessages()`
      (ใช้ `replyMessages` ไม่ใช่ `lineClient.replyMessage` ตรง ๆ เพราะตัวมันมี error handling ในตัว
      จะได้ไม่ throw ซ้ำออกมาจาก catch block)

### ✅ ตรวจรับ Phase 1

ทดสอบด้วย signed request จริง (คำนวณ HMAC จาก `CHANNEL_SECRET` ใน `.env`) ยิงเข้า dev server — **ผ่าน 7/7**

- [x] **1.15** signature ผิด → **401** ✓ / ไม่ส่ง header `x-line-signature` เลย → **401** ✓
- [x] **1.16** signature ถูกแต่ body ไม่ใช่ JSON → **400** ✓ (เดิมเป็น 500)
- [x] **1.17** `events: []` (ปุ่ม Verify) → **200** ✓ / body ที่ไม่มีฟิลด์ `events` เลย → **200** ✓
- [x] **1.18** ยิง message event จริง → **200 ใน 8 ms** ✓
      log ยืนยันว่า Gemini + replyMessage ถูกเรียก**หลัง** response ออกไปแล้ว (stack ชี้ไปที่ `route.ts:39` = ใน `after()`)
- [x] **1.19** ยิง event ที่ `source.type = "group"` → **200 ไม่ใช่ 500** ✓
      และ log ยืนยันว่า `showLoadingAnimation` ถูกเรียกแค่ 2 ครั้ง = เฉพาะ event ที่เป็น `type: "user"`
      ส่วน event ในกลุ่มถูกข้ามตามที่ต้องการ (เดิมจุดนี้คือสาเหตุของ 500)
- [x] **1.20** batch 3 events (group + user + unfollow) ใน request เดียว → **200** ✓ ไม่ล้มทั้ง batch
- [ ] **1.21** ส่งข้อความเสียงจริงผ่าน LINE → ยังทำงานปกติหลังย้ายไป `after()`
      *(ยังทำไม่ได้ — ต้องใช้ไฟล์เสียงจริงจาก LINE ต้องทดสอบจากมือถือ)*
- [x] **1.22** commit Phase 1

> **ยังต้องยืนยันด้วยมือ (ต้องใช้ LINE จริง):** ข้อ 1.21, กด Verify ในหน้า LINE Developers Console จริง,
> และลองเชิญบอทเข้ากลุ่มจริงแล้วพิมพ์ keyword ที่ตั้ง `showLoading: true`
> — ที่ทำไปคือจำลอง payload ให้ตรงสเปกและตรวจพฤติกรรมฝั่งเซิร์ฟเวอร์แล้ว

---

## Phase 2 — High (แก้ได้เลย ไม่ต้องตัดสินใจ)

### H2 — ไม่มี `unfollow` handler → `isFollowing` ผิดถาวร

- [x] **2.1** สร้าง `handlers/unfollowHandler.ts` — เรียก `setFollowingStatus(userId, false)`
      ใช้ `updateMany` ไม่ใช่ `update` เพราะถ้าไม่เจอ record `update` จะ throw P2025
      (เกิดได้จริงกับคนที่เคยคุยตั้งแต่ก่อนมีตาราง User แล้วมาบล็อกทีหลัง)
- [x] **2.2** เพิ่ม `case "unfollow"` ใน `handlers/index.ts`
- [x] **2.3** แก้ `upsertUserProfile` ให้เขียน `isFollowing` เฉพาะตอนที่ส่งค่ามาจริง
      เดิมใช้ `?? true` ซึ่งแปลว่า event อะไรก็ตามที่วิ่งเข้ามาจะปลุกคนที่บล็อกไปแล้วกลับเป็น `true`
- [x] **2.4** เพิ่ม self-heal — ถ้า DB บอก `isFollowing: false` แต่ผู้ใช้ส่งข้อความเข้ามาได้
      แปลว่ายังไม่ได้บล็อกจริง ให้แก้กลับเป็น `true` (กันกรณี follow event ตอนปลดบล็อกหล่นหาย)

### H4 — `updateProfileInBackground` ยิง LINE API + เขียน DB ทุกข้อความ

ไฟล์: `handlers/messageHandler.ts:16-18` → `services/userService.ts:40-55`

- [x] **2.5** แก้ `catch` ว่าง → `console.error` พร้อม userId
- [x] **2.6** เพิ่ม throttle 24 ชม. (`PROFILE_REFRESH_INTERVAL_MS`) — อ่าน `updatedAt` จาก DB ก่อน
      ค่อยตัดสินใจว่าจะยิง `getProfile` ไหม
- [x] **2.7** ย้ายจาก floating promise → `after(() => updateProfileInBackground(userId))`
      ใน `handlers/messageHandler.ts` (Next รองรับ `after()` ซ้อนใน `after()` — ยืนยันจาก doc และทดสอบแล้วว่าทำงานจริง)

### H5 — Reply token อาจหมดอายุใน audio path

> **สำคัญ:** ข้อนี้ **ไม่ได้หายไปเอง** หลังแก้ C4 — `after()` ทำให้ตอบ 200 เร็วขึ้น แต่ไม่ได้ยืดอายุ reply token

- [x] **2.8** เพิ่ม replyToken (8 ตัวแรก) ลงใน error log ของ `replyMessages` เพื่อสืบย้อนได้
- [x] **2.9** เพิ่ม `replyOrPush(replyToken, userId, messages)` ใน `services/replyService.ts`
      — ลอง reply ก่อน ถ้าคืน `null` ค่อย `pushMessage`
- [x] **2.10** **[ตัดสินใจแล้ว]** เปิด fallback เฉพาะ path ที่ช้าจริง เพราะ push กินโควตาและ LINE คิดเงินตามจำนวนที่ส่ง:
      - ✅ audio path **ทุกจุดที่ตอบ** (ผ่าน download + ASR มาแล้ว token เสี่ยงหมดอายุตั้งแต่ต้น)
      - ✅ text path เฉพาะฝั่ง Gemini (fallback chain `flash-lite` → `flash` = ยิงได้ 2 รอบ)
      - ❌ text path ฝั่ง keyword match — ตอบเร็วอยู่แล้ว ใช้ `replyMessages` ตามเดิม
      - ❌ ข้อความขอโทษใน catch ของ text branch — ใช้ `replyMessages` ตามเดิม
      > ถ้าอยากเปลี่ยนเป็นเปิดทุก path บอกได้ แก้จุดเดียวคือสลับ `replyMessages` → `replyOrPush`

### ✅ ตรวจรับ Phase 2

ทดสอบกับ DB จริง + dev server จริง ผ่าน `scripts/phase2-test.ts` และ `scripts/phase2-throttle-test.ts`

- [x] **2.11** ยิง `unfollow` event → DB เปลี่ยนเป็น `isFollowing = false` ✓
- [x] **2.12** ส่งข้อความหลังจากนั้น → self-heal กลับเป็น `isFollowing = true` ✓
- [x] **2.13** ยิง 5 ข้อความติดกันโดย `updatedAt` ยังสด → `getProfile` ถูกเรียก **0 ครั้ง** ✓
      (เดิมจะเป็น 5 ครั้ง + upsert 5 ครั้ง)
- [x] **2.13b** ย้อน `updatedAt` เป็น 72 ชม. แล้วยิง 1 ข้อความ → `getProfile` ถูกเรียก **1 ครั้ง** ✓
      (ยืนยันว่า throttle ไม่ได้ปิดตายจนโปรไฟล์ไม่เคยอัปเดตเลย)
- [x] **2.13c** ยิง `unfollow` ของ userId ที่ไม่มีใน DB → ตอบ 200 ไม่พัง แค่ log warning ✓
- [x] **2.14** commit Phase 2

> **ยังต้องยืนยันด้วย LINE จริง:** บล็อก/ปลดบล็อกบอทจากมือถือจริง และทดสอบ push fallback (H5)
> โดยส่งข้อความเสียงยาว ๆ จนกว่า reply token จะหมดอายุ

---

## Phase 3 — ข้อที่ต้องตัดสินใจ

> **ตัดสินใจแล้วเมื่อ 2026-08-16:** ทำ **H3** เท่านั้น · **H6 / H7 เลื่อนไปก่อน** (ยังไม่ deploy จริง)

### H3 — Idempotency / redelivery ✅ — *ข้อเดียวที่ต้อง migrate DB*

- [x] **3.1** **[ตัดสินใจแล้ว]** ใช้ตาราง `ProcessedEvent` ใน Prisma (ไม่ใช่ in-memory)
      เพราะทนต่อการ restart และใช้ได้แม้มีหลาย instance ตอน deploy จริง
- [x] **3.2** เพิ่ม model `ProcessedEvent` ใน `prisma/schema.prisma`
      ใช้ `webhookEventId` เป็น `@id` เลย → ได้ unique index ในตัว ไม่ต้องประกาศเพิ่ม
- [x] **3.3** รัน migration → `prisma/migrations/20260816071614_add_processed_event`
      (ผ่าน `DIRECT_URL` ตามที่ `prisma.config.ts` ตั้งไว้)
- [x] **3.4** อ่าน `event.deliveryContext.isRedelivery` และ header `X-Line-Retry-Key` แล้ว log ทั้งคู่
- [x] **3.5** สร้าง `services/idempotencyService.ts` → `claimEvent()` ข้าม event ที่เคยประมวลผลแล้ว
      ใช้ `createMany` + `skipDuplicates` เป็น atomic operation เดียว
      (ถ้าใช้ `findUnique` แล้วค่อย `create` จะมีช่องว่างให้ event ที่มาพร้อมกันแทรกได้)
- [x] **3.6** `cleanupProcessedEvents()` ล้างแถวเก่ากว่า 3 วัน มี throttle ในตัวชั่วโมงละครั้ง
      เรียกท้าย `after()` ของ route

> **ข้อออกแบบที่ควรรู้:** `claimEvent()` เป็นแบบ **fail-open** — ถ้า DB ล่มจะคืน `true`
> คือยอมให้ประมวลผลซ้ำ ดีกว่าบอทเงียบไปเฉย ๆ ถ้าอยากให้ fail-closed แทน บอกได้

#### ✅ ตรวจรับ H3 — ผ่าน 4/4 (`scripts/phase3-idempotency-test.ts`)

- [x] รอบแรก → บันทึกลง `ProcessedEvent` และประมวลผลจริง (`ChatHistory` = 2 แถว)
- [x] รอบสอง ยิง `webhookEventId` เดิม + `isRedelivery: true` + `X-Line-Retry-Key` → ตอบ 200 ปกติ
- [x] `ChatHistory` ยังเป็น 2 แถวเท่าเดิม = **Gemini ไม่ถูกเรียกซ้ำ โควตาไม่ไหม้**
- [x] `ProcessedEvent` มีแถวเดียว ไม่ซ้ำ
- [x] log ขึ้นครบ: `เป็นการส่งซ้ำจาก LINE (retry key: ...)` และ `ข้าม event ... (isRedelivery = true)`

---

### 🔒 H6 — ปิด dashboard ด้วย LINE Login (Better Auth) ✅

**ตัดสินใจ:** ใช้ Better Auth 1.6.29 + LINE Login (ไม่ใช่ shared secret)
เหตุผลที่ shared secret ใช้ไม่ได้: component ที่เรียก API (`TableKeyword.tsx`, `formKeyword.tsx`,
`FormRichmenu.tsx`) เป็น `"use client"` ยิง fetch จากเบราว์เซอร์ — secret จะต้องถูกฝังใน JS
ที่ส่งให้เบราว์เซอร์ = ใครเปิด DevTools ก็เห็น ป้องกันอะไรไม่ได้

- [x] **3.7** ลง `better-auth@1.6.29` + `@better-auth/prisma-adapter` (peer deps รองรับ Next 16 / Prisma 7 / React 19)
- [x] **3.8** `lib/auth.ts` — LINE provider (built-in) + allowlist `ADMIN_LINE_IDS`
- [x] **3.9** 4 model ใหม่ + migration `20260816113005_add_better_auth_admin`
- [x] **3.10** `app/api/auth/[...all]/route.ts` — callback ของ LINE Login
- [x] **3.11** `proxy.ts` — ด่านหน้า ดูคุกกี้แบบเร็ว ไม่แตะ DB
- [x] **3.12** `lib/adminAuth.ts` — ด่านจริง เช็ค session + allowlist ทุก request
- [x] **3.13** ใส่ `requireAdminApi()` ครบทั้ง 6 handler ใน 5 route + ปิด `dashboard/layout.tsx`
- [x] **3.14** หน้า `/login` พร้อมปุ่ม LINE + กัน open redirect ใน `?redirect=`

> **2 จุดที่ถ้าพลาดจะพังเงียบ ๆ — บันทึกไว้กันลืมตอนอัปเกรด:**
> 1. `modelName` ต้องเป็น **camelCase** (`adminUser` ไม่ใช่ `AdminUser`) เพราะ prisma adapter
>    เรียก `db[modelName]` ตรง ๆ ไม่แปลงตัวอักษร ส่วน Prisma client ใช้ accessor camelCase
> 2. ต้องตั้งชื่อ model ขึ้นต้นด้วย `Admin` เพราะ default ของ Better Auth คือ `user`
>    ซึ่งชนกับ `model User` เดิม (ผู้ติดตามบอทใน LINE) คนละความหมายกันสิ้นเชิง
>
> field ทั้งหมดคัดตาม `@better-auth/core/dist/db/get-tables.mjs` ของ 1.6.29
> **ถ้าอัปเกรด Better Auth ต้องเทียบไฟล์นั้นใหม่**
> (ไม่ได้ใช้ `@better-auth/cli generate` เพราะ CLI ค้างที่ 1.4.21 ตามหลัง library อยู่)

#### ✅ ตรวจรับ H6 — ผ่าน 15/15 (`scripts/auth-guard-test.mjs`)

- [x] 🔴 `POST /api/line-webhook` (signature ถูก) → **200 ไม่ใช่ 401** — webhook ไม่ถูก auth บล็อก
- [x] `POST /api/line-webhook` (signature ผิด) → 401 จาก `validateSignature` ตามเดิม
- [x] admin API ทั้ง 6 handler → 401 ทุกเส้น
- [x] `/dashboard` และ `/dashboard/keyword` → 307 ไป `/login?redirect=%2Fdashboard`
- [x] `/login`, `/form/userform`, `/`, `/api/auth/*` → 200 เข้าได้ตามเดิม

---

### 🔒 H7 — Server action เชื่อ `lineId` ที่ client ส่งมา ✅

- [x] **3.15** `lib/lineIdToken.ts` — verify กับ `https://api.line.me/oauth2/v2.1/verify`
      ส่ง `client_id` ไปเทียบด้วย **สำคัญมาก** ไม่งั้นใครก็เอา token จาก LIFF app อื่นมายิงใส่เราได้
- [x] **3.16** `saveUserNameAction(idToken, userName)` — **เอา `lineId` ออกจาก signature แล้ว**
      พร้อม `displayName` / `pictureUrl` / `email` ที่เดิมก็รับจาก client เหมือนกัน
      ตอนนี้เอาจาก token ที่ LINE รับรองทั้งหมด
- [x] **3.17** ฝั่ง LIFF เรียก `liff.getIDToken()` ตอนกดส่ง (ไม่เก็บค้างใน state จะได้ใบที่ยังไม่หมดอายุ)

#### ✅ ตรวจรับ H7 — ผ่าน 6/6 (`scripts/h7-idtoken-test.ts`)

- [x] `idToken` ว่าง → ปฏิเสธ
- [x] `idToken` ปลอม → LINE ปฏิเสธ → action ปฏิเสธ
- [x] ชื่อสั้นเกิน → ปฏิเสธก่อนถึง LINE
- [x] `saveUserNameAction.length === 2` — **ไม่มีช่องให้ส่ง `lineId` เข้ามาแล้ว**
- [x] `verifyLineIdToken('ปลอม')` → `null`
- [x] ไม่มีแถวไหนใน DB ถูกเขียนจาก request ปลอมเลย

> ถ้าเลือกทางเลือก (ค) ของ H6 จะใช้โค้ด verify ตัวเดียวกับ H7 ได้เลย ทำทีเดียวจบทั้งสองข้อ

---

## Phase 4 — Medium

- [x] **4.1** **M1** — เพิ่ม fallback message สำหรับ image / video / file / location / sticker
      แต่ละชนิดมีข้อความเฉพาะของตัวเอง (`UNSUPPORTED_MESSAGE_REPLY`) และมี default สำหรับชนิดอื่น
- [ ] **4.2** **M2** — เปิด `postback` handler *(ยังไม่ทำ — รอคำตอบว่าใช้ rich menu แบบ postback หรือไม่)*
- [ ] **4.3** **M2** — `join` / `leave` / `memberJoined` / `unsend` / `videoPlayComplete` *(ยังไม่ทำ — รอคำตอบเดียวกัน)*
- [x] **4.4** **M3** — cache กฎ CONTAINS ในหน่วยความจำ TTL 60 วิ
      พร้อม `invalidateReplyRuleCache()` ที่ต่อเข้า admin API แล้ว (POST/PUT/DELETE keywords)
      → แก้คีย์เวิร์ดผ่านหน้า dashboard เห็นผลทันที ไม่ต้องรอ TTL
- [x] **4.5a** **M5** — สร้าง `.env.example` + เพิ่ม `!.env.example` ใน `.gitignore`
      (เดิม `.env*` ครอบไปถึงเทมเพลตด้วย ทำให้ commit ไม่ได้)
- [ ] **4.5b** **M5** — เปลี่ยนชื่อ env เป็น `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN`
      *(ยังไม่ทำ — เป็น breaking change ต้องแก้ `.env` จริงและตัวตั้งค่าบน platform พร้อมกัน รอตัดสินใจ)*
- [x] **4.6** **M6** — เอา `(msg: any)` ออก ใช้ `messagingApi.Message` จริง
      (`sender` อยู่ใน `MessageBase` ของ SDK อยู่แล้ว จึงพิมพ์ type ได้ไม่ต้อง cast)
- [x] **4.7** **M7** — ย้าย sender ไป `config/senders.ts` (`SENDER_PROGRAM`, `SENDER_GREEN`, `withSender()`)
      ทั้ง 4 จุดเรียกใช้ constant เดียวกันแล้ว
- [x] **4.8** **M8** — แยกเป็นฟังก์ชัน `handleTextMessage` / `handleAudioMessage` แล้ว `return` หลังแต่ละสาขา
      ชัดกว่า `else if` และทำให้ `handleMessageEvent` อ่านออกใน 20 บรรทัด
- [x] **4.9** **M9** — ใส่ `webhookEventId` ลงใน log ทุกจุดผ่าน helper `tag(event)`
      → log ออกมาเป็น `[MessageHandler TEST-EVENT-0001] ...`
- [x] **4.10** **M10** — `data?.text?.trim()` + log response ดิบเมื่อไม่มีฟิลด์ `text`
- [x] **4.11** **M11** — ลบ dead code `if (!TYPHOON_API_KEY)` (เงื่อนไขเป็นจริงไม่ได้)
      และใส่ TODO ชี้ไปที่ข้อ 5.1-5.2 ไว้แทน

### 🎁 แถมนอกแผน (เจอระหว่างแก้)

- [x] **4.12** `app/api/keywords/[id]/route.ts` — `catch` ของ `PUT` **ว่างเปล่า** ไม่ได้ `return` อะไรเลย
      Next จะโยน "No response is returned from route handler" กลายเป็น 500 แบบไม่มีสาเหตุให้ดู
      แก้ให้ log + ตอบ 404 (P2025) / 400 (P2002) / 500 ตามชนิด error

### ✅ ตรวจรับ Phase 4

- [x] **4.13** ยิง event ชนิด sticker / image / location / video / file → **200 ทั้ง 5 ชนิด**
      และ log ขึ้น `ได้รับข้อความชนิด "..." ที่ยังไม่รองรับ` ครบทุกชนิด ✓
- [x] **4.14** log ทุกบรรทัดมี `webhookEventId` ติดไปด้วยแล้ว ✓
- [x] **4.15** ทดสอบ cache ผ่าน `scripts/phase4-cache-test.ts` — ผ่าน 3/3 ✓
      (อ่านครั้งแรกเจอ → ลบจาก DB ตรง ๆ แล้วยังเจอ = cache ทำงานจริง → `invalidate()` แล้วหายไป)
- [x] **4.16** รัน regression ทั้งชุดซ้ำ → **12/12 ผ่าน** response time ยังเป็น 8 ms
- [x] **4.17** `tsc --noEmit` และ `next build` ผ่าน
- [x] **4.18** commit Phase 4

---

## Phase 5 — ความปลอดภัยของ secret / เตรียม deploy

> 🔴 **ตรวจพบเมื่อ 2026-08-16:** repo `github.com/greengramhouse/lineme-next2026` เป็น **public**
> (`"visibility": "public"` จาก GitHub API แบบไม่ล็อกอิน) และไฟล์ `services/typhoon.ts` บน `main`
> **มี key อยู่จริง** — ยืนยันด้วยการดึง raw file มาแล้วเจอบรรทัดที่ขึ้นต้นด้วย `sk-`
>
> แผนเดิมเขียนข้อนี้ไว้ในหัวข้อ "ก่อน push ขึ้น public repo" — แต่มันเกิดไปแล้วตั้งแต่ commit `074df3c`

- [x] **5.1** ย้าย Typhoon API key ไปอ่านจาก `process.env.TYPHOON_API_KEY`
      สแกนทั้งโปรเจกต์ยืนยันแล้วว่าไม่มี `sk-` หลงเหลือในซอร์สอีก
- [x] **5.2** ออก key ใหม่แล้ว — ยืนยันว่าใช้ได้จริง (ยิง API ได้ `415 invalid audio format` ไม่ใช่ `401`
      คือผ่าน auth แล้ว ตกที่ไฟล์เสียงปลอมที่ใช้ทดสอบ)
- [ ] **5.2b** 🔴 **ยืนยันว่า revoke key เดิมแล้วจริง** — key เดิมยังดึงได้จาก GitHub ที่ commit `074df3c`
      (ตรวจแล้วเมื่อ 2026-08-16 ยังพบอยู่ 1 บรรทัด) ถ้ายังไม่ revoke ใครก็ยังใช้ได้อยู่
- [x] **5.2c** key ใหม่อยู่ใน `.env` แล้ว และไฟล์บน GitHub `main` ไม่มี `sk-` เหลืออยู่แล้ว ✓
- [ ] **5.2d** ตั้ง `TYPHOON_API_KEY` บน **Vercel** ด้วย — ไม่งั้น production จะตอบว่า
      "ระบบถอดเสียงยังไม่พร้อมใช้งาน" ทั้งที่ local ใช้ได้
- [x] **5.3** ตรวจซ้ำว่า `.env` ยังไม่ถูก track ใน git ✓ (`.gitignore` ครอบ `.env*` และยกเว้นแค่ `.env.example`)
- [ ] **5.4** ตั้ง env ทั้งหมดบน Vercel ก่อน deploy — **จำเป็น** เพราะ C5 fail fast
      เดิมใช้ `|| ""` จึง build ผ่านเสมอแม้ลืมตั้ง env ตอนนี้ถ้าไม่มี `CHANNEL_SECRET` /
      `CHANNEL_ACCESS_TOKEN` **build จะ fail** (deployment เดิมยังทำงานต่อ Vercel ไม่ลบให้)
- [ ] **5.5** ตรวจว่า `maxDuration = 60` ไม่เกินลิมิตของ plan ที่ใช้ — ถ้าเกิน deploy จะ error ลดเป็น 30 ได้
- [ ] **5.6** `build` script มีแค่ `prisma generate` ไม่มี `migrate deploy`
      migration `add_processed_event` รันไปที่ Supabase ตัวเดียวกันแล้ว จึงพร้อมใช้งาน
      แต่ครั้งหน้าที่มี migration ใหม่ต้องรันเอง หรือเพิ่ม `prisma migrate deploy` เข้า build script

### 🧩 แก้สัญญาของ ASR ไปด้วย (จำเป็น ไม่ใช่ของแถม)

เดิม `processTyphoonASR()` คืน `string` เสมอ แล้วฝั่งเรียกใช้เดาว่าล้มเหลวไหมด้วยการหา substring
`"ไม่สามารถถอดข้อความ"` / `"ข้อผิดพลาด"` ในข้อความ — ข้อความใหม่ตอน key หายไม่มีคำพวกนี้
ถ้าปล่อยไว้ระบบจะเข้าใจว่า **ถอดเสียงสำเร็จ** แล้วส่งประโยค "ระบบถอดเสียงยังไม่พร้อม" เข้า Gemini

- [x] **5.7** เปลี่ยนเป็น discriminated union `{ ok: true, text } | { ok: false, message }`
      ฝั่ง `messageHandler` เช็ค `if (!asr.ok)` แทนการหา substring

#### ✅ ตรวจรับ Phase 5 — ผ่าน 4/4 (`scripts/phase5-typhoon-env-test.ts`)

- [x] ไม่มี `TYPHOON_API_KEY` → `ok: false` + ข้อความบอกผู้ใช้ว่าระบบถอดเสียงไม่พร้อม
      (ไม่ throw ทั้งแอป — ข้อความ text ยังตอบได้ปกติ ต่างจาก `CHANNEL_*` ที่เป็นเรื่องความปลอดภัยจึง fail fast)
- [x] key ผิด → ยิง API จริงได้ `401 Invalid API Key` แล้วคืน `ok: false` ไม่ throw ออกมา
- [x] ไม่มี fallback ไปใช้ค่า hardcode หลงเหลือ
- [x] regression ทั้งชุดยังผ่าน: signature 12/12, phase2 3/3, phase3 4/4, phase4 3/3

---

## สคริปต์ทดสอบ (อยู่ใน `scripts/`)

เปิด dev server ที่พอร์ต 3999 ก่อน (`npx next dev -p 3999`) แล้วรัน:

| สคริปต์ | ครอบคลุม | คำสั่ง |
|---|---|---|
| `webhook-signature-test.mjs` | 401 / 400 / 200, response time, batch events, group event | `node scripts/webhook-signature-test.mjs` |
| `phase2-test.ts` | unfollow, self-heal, throttle (updatedAt สด) | `npx tsx --env-file=.env scripts/phase2-test.ts` |
| `phase2-throttle-test.ts` | throttle อีกด้าน (updatedAt เก่า 72 ชม.) | `npx tsx --env-file=.env scripts/phase2-throttle-test.ts` |
| `phase3-idempotency-test.ts` | ยิง event ซ้ำ (retry) ต้องประมวลผลครั้งเดียว | `npx tsx --env-file=.env scripts/phase3-idempotency-test.ts` |
| `phase4-cache-test.ts` | cache กฎ CONTAINS + invalidate (ไม่ต้องเปิด dev server) | `npx tsx --env-file=.env scripts/phase4-cache-test.ts` |

สคริปต์เซ็น HMAC ด้วย `CHANNEL_SECRET` จาก `.env` เอง และล้างข้อมูลทดสอบใน DB ให้หลังรันเสร็จ

---

## Checklist การทดสอบรวม (รันซ้ำได้ทุกครั้งที่แก้)

- [ ] ยิง webhook ปลอมด้วย signature ผิด → 401
- [ ] ยิงด้วย body ที่ไม่ใช่ JSON → 400 (ไม่ใช่ 500)
- [ ] กด "Verify" ใน LINE Developers Console (`events: []`) → 200
- [ ] response time จาก LINE Console → หลัก ms
- [ ] บอทในกลุ่ม + keyword ที่ตั้ง `showLoading: true` → ไม่ 500
- [ ] ส่ง 3 ข้อความรัว ๆ → ไม่ล้มทั้ง batch
- [ ] ส่งรูป / สติกเกอร์ → มี fallback ตอบ ไม่เงียบ
- [ ] ส่งข้อความเสียงยาว ๆ → ได้คำตอบกลับ ไม่ค้างที่ loading
- [ ] บล็อกบอท → `isFollowing = false`
