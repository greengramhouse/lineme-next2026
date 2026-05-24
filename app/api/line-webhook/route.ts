// src/app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateSignature, webhook } from "@line/bot-sdk";
import { channelSecret } from "@/config/line-config";
import { handleLineEvent } from "@/handlers";

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get("x-line-signature") || "";

  if (!validateSignature(bodyText, channelSecret, signature)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = JSON.parse(bodyText) as webhook.CallbackRequest;
  
// ถ้าอยากให้ทำงานแบบ sequential แบบเดิม (ทีละ event) ก็ใช้ for loop แทน Promise.all   
//   for (const event of body.events) {
//   // ระบบจะรอให้ event ที่ 1 ทำงานเสร็จสมบูรณ์ก่อน ค่อยไปทำ event ที่ 2
//   await handleLineEvent(event); 
// }
  // โยน Event ไปให้ Handler จัดการ
  await Promise.all(body.events.map(handleLineEvent));

  return NextResponse.json({ status: "success" });
}