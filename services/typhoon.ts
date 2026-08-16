export async function processTyphoonASR(audioBuffer: Buffer): Promise<string> {
  try {
    console.log(
      "เริ่มถอดเสียงด้วย Typhoon ASR...",
      audioBuffer.length,
      "bytes",
    );
    // ⚠️ TODO: key นี้ hardcode อยู่ในซอร์สและติดอยู่ใน git history แล้ว (commit 074df3c)
    // ต้องย้ายไป env + revoke key เดิม ก่อน push ขึ้น public repo — ดู docs/spec.md ข้อ 5.1-5.2
    const TYPHOON_API_KEY = "sk-EnfaxzlAMqYMQpNUK0reJC2t72ko2h6Y5J41oik130AjPqp6";

    const TYPHOON_AUDIO_URL =
      "https://api.opentyphoon.ai/v1/audio/transcriptions";

    // 🛠️ ตรวจสอบชื่อ Model ล่าสุดของ Typhoon ASR (ปกติจะใช้ชื่อ typhoon-audio หรืออิงตาม Docs)
    const TYPHOON_MODEL = "typhoon-asr-realtime";

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
      return "ไม่สามารถถอดข้อความจากเสียงได้ค่ะ";
    }

    return text;
  } catch (error) {
    console.error("Typhoon ASR Request Error:", error);
    return "ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบถอดเสียง (ASR)";
  }
}