export async function processTyphoonASR(audioBuffer: Buffer): Promise<string> {
  try {
    console.log(
      "เริ่มถอดเสียงด้วย Typhoon ASR...",
      audioBuffer.length,
      "bytes",
    );
    const TYPHOON_API_KEY =  "sk-EnfaxzlAMqYMQpNUK0reJC2t72ko2h6Y5J41oik130AjPqp6";
    if (!TYPHOON_API_KEY) {
      return "ระบบยังไม่ได้ตั้งค่า TYPHOON_API_KEY ค่ะ";
    }

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
    return data.text.trim() || "ไม่สามารถถอดข้อความจากเสียงได้ค่ะ";
  } catch (error) {
    console.error("Typhoon ASR Request Error:", error);
    return "ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบถอดเสียง (ASR)";
  }
}