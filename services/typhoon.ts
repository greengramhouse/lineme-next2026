const TYPHOON_AUDIO_URL = "https://api.opentyphoon.ai/v1/audio/transcriptions";

// 🛠️ ตรวจสอบชื่อ Model ล่าสุดของ Typhoon ASR (ปกติจะใช้ชื่อ typhoon-audio หรืออิงตาม Docs)
const TYPHOON_MODEL = "typhoon-asr-realtime";

/**
 * ผลลัพธ์ของ ASR
 *
 * เดิมฟังก์ชันคืน string เสมอ แล้วฝั่งเรียกใช้ต้องเดาว่าล้มเหลวไหมด้วยการหา
 * substring "ไม่สามารถถอดข้อความ" / "ข้อผิดพลาด" ในข้อความ — เปราะมาก
 * แค่แก้ข้อความให้สุภาพขึ้นก็ทำให้ระบบเข้าใจผิดว่าถอดเสียงสำเร็จได้ทันที
 */
export type ASRResult =
  | { ok: true; text: string }
  | { ok: false; message: string };

export async function processTyphoonASR(
  audioBuffer: Buffer
): Promise<ASRResult> {
  // ไม่ throw ตอน import แบบ line-config เพราะ ASR เป็นฟีเจอร์เสริม
  // ถ้า key หายแล้วทำให้ทั้งแอปพัง = ตอบข้อความธรรมดาก็ไม่ได้ไปด้วย ซึ่งแย่กว่า
  // (ต่างจาก CHANNEL_SECRET ที่ถ้าหายแล้วปล่อยผ่านจะกลายเป็นช่องโหว่ความปลอดภัย)
  const TYPHOON_API_KEY = process.env.TYPHOON_API_KEY;
  if (!TYPHOON_API_KEY) {
    console.error("[Typhoon ASR] ไม่พบ env TYPHOON_API_KEY — ข้ามการถอดเสียง");
    return {
      ok: false,
      message: "ขออภัยค่ะ ระบบถอดเสียงยังไม่พร้อมใช้งาน พิมพ์มาคุยแทนน้องกรีนก่อนน้า 🙏",
    };
  }

  try {
    console.log(
      "เริ่มถอดเสียงด้วย Typhoon ASR...",
      audioBuffer.length,
      "bytes",
    );

    const formData = new FormData();
    // ไฟล์เสียงจาก LINE มักจะเป็น .m4a หรือ aac
    // 1. หุ้ม Buffer ด้วย Uint8Array ให้ตรงตามมาตรฐาน Web API
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], {
      type: "audio/mp3",
    });

    // 🛠️ แก้ไข: แกล้งเปลี่ยนชื่อไฟล์ตอนส่งเป็น audio.mp3
    formData.append("file", audioBlob as any, "audio.mp3");
    formData.append("model", TYPHOON_MODEL);
    formData.append("language", "th"); // สามารถระบุภาษาได้ถ้าต้องการให้แม่นยำขึ้น

    const response = await fetch(TYPHOON_AUDIO_URL, {
      method: "POST",
      headers: {
        // ⚠️ ไม่ต้องกำหนด Content-Type เพราะ fetch จะจัดการ boundary ของ multipart ให้เอง
        Authorization: `Bearer ${TYPHOON_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ASR API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // ใช้ ?. เพราะถ้า API เปลี่ยน schema แล้วไม่มีฟิลด์ text จะ throw TypeError
    // ตกไปเข้า catch แล้วกลายเป็นข้อความ error ทั่วไป ทำให้ debug ยาก
    const text = data?.text?.trim();
    if (!text) {
      console.error("[Typhoon ASR] response ไม่มีฟิลด์ text:", JSON.stringify(data)?.slice(0, 500));
      return { ok: false, message: "ไม่สามารถถอดข้อความจากเสียงได้ค่ะ" };
    }

    return { ok: true, text };
  } catch (error) {
    console.error("Typhoon ASR Request Error:", error);
    return {
      ok: false,
      message: "ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบถอดเสียง (ASR)",
    };
  }
}