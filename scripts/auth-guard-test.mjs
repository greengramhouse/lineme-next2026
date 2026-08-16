/**
 * ทดสอบด่าน auth ของ dashboard (H6)
 * รันด้วย: node scripts/auth-guard-test.mjs   (ต้องเปิด dev server ที่พอร์ต 3999)
 */
import crypto from "node:crypto";
import fs from "node:fs";

const env = fs.readFileSync("./.env", "utf8");
const secret = env.match(/^CHANNEL_SECRET\s*=\s*"?([^"\r\n]+)"?/m)?.[1];
// ระบุพอร์ตได้: node scripts/auth-guard-test.mjs 3999
const BASE = `http://localhost:${process.argv[2] ?? 3000}`;

const results = [];
function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function hit(path, init = {}) {
  const res = await fetch(BASE + path, { redirect: "manual", ...init });
  return { status: res.status, location: res.headers.get("location") };
}

// รอ server ตื่น
for (let i = 0; i < 60; i++) {
  try { await fetch(BASE + "/login"); break; } catch { await new Promise(r => setTimeout(r, 1000)); }
}

console.log("=== 🔴 สำคัญที่สุด: webhook ต้องไม่ถูก auth บล็อก ===");
const body = JSON.stringify({ destination: "Uxxx", events: [] });
const sig = crypto.createHmac("sha256", secret).update(body).digest("base64");
const webhook = await hit("/api/line-webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-line-signature": sig },
  body,
});
check("POST /api/line-webhook (signature ถูก) → 200 ไม่ใช่ 401", webhook.status === 200, `HTTP ${webhook.status}`);

const webhookBad = await hit("/api/line-webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-line-signature": "wrong" },
  body,
});
check("POST /api/line-webhook (signature ผิด) → 401 จาก validateSignature ตามเดิม", webhookBad.status === 401, `HTTP ${webhookBad.status}`);

console.log("\n=== เส้นที่ต้องถูกป้องกัน ===");
for (const [path, method] of [
  ["/api/keywords", "POST"],
  ["/api/keywords/abc", "PUT"],
  ["/api/keywords/abc", "DELETE"],
  ["/api/richmenu", "POST"],
  ["/api/richmenu/abc", "DELETE"],
  ["/api/richmenu/link", "POST"],
]) {
  const r = await hit(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword: "x", matchType: "EXACT", payload: {}, lineId: "U1" }),
  });
  check(`${method} ${path} → 401`, r.status === 401, `HTTP ${r.status}`);
}

console.log("\n=== หน้าเว็บ ===");
const dash = await hit("/dashboard");
check("GET /dashboard → redirect ไป /login", dash.status === 307 || dash.status === 302, `HTTP ${dash.status} → ${dash.location ?? "-"}`);
check("   redirect พก ?redirect= กลับมาด้วย", (dash.location ?? "").includes("redirect=%2Fdashboard"), dash.location ?? "-");

const dashKeyword = await hit("/dashboard/keyword");
check("GET /dashboard/keyword → redirect ไป /login", dashKeyword.status === 307 || dashKeyword.status === 302, `HTTP ${dashKeyword.status}`);

const login = await hit("/login");
check("GET /login → 200 (เข้าได้โดยไม่ต้อง login)", login.status === 200, `HTTP ${login.status}`);

console.log("\n=== เส้นที่ต้องเปิดไว้ตามเดิม ===");
const liff = await hit("/form/userform");
check("GET /form/userform → 200 (หน้า LIFF ของผู้ใช้ทั่วไป)", liff.status === 200, `HTTP ${liff.status}`);

const home = await hit("/");
check("GET / → 200", home.status === 200, `HTTP ${home.status}`);

const authApi = await hit("/api/auth/get-session");
check("GET /api/auth/* → ไม่ถูกบล็อก (ไม่งั้นล็อกอินไม่ได้เลย)", authApi.status !== 401, `HTTP ${authApi.status}`);

console.log(`\nสรุป: ${results.filter(Boolean).length}/${results.length} ผ่าน`);
