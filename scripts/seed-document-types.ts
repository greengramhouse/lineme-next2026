/**
 * ใส่ประเภทเอกสารตั้งต้น 3 แบบ — แอดมินแก้/เพิ่มเองได้จาก /dashboard/document
 * รันด้วย: npx tsx --env-file=.env scripts/seed-document-types.ts
 *
 * รันซ้ำได้ปลอดภัย — ข้ามประเภทที่มีอยู่แล้ว ไม่ทับของที่แอดมินแก้ไว้
 */
import { prisma } from "../lib/prisma";

const FORMAL_STYLE =
  "เขียนตามรูปแบบหนังสือราชการไทย ใช้ภาษาทางการ กระชับ สุภาพ " +
  "ขึ้นต้นด้วย เรื่อง / เรียน แล้วตามด้วยเนื้อความ และลงท้ายด้วยส่วนลงชื่อ";

const SEED = [
  {
    name: "หนังสือขออนุญาต",
    triggerKeyword: "ร่างหนังสือขออนุญาต",
    description: "เช่น ขออนุญาตพานักเรียนไปทัศนศึกษา ขออนุญาตใช้สถานที่",
    promptTemplate: FORMAL_STYLE,
    fields: [
      { label: "เรื่อง", question: "เรื่องอะไรคะ", hint: "ขออนุญาตพานักเรียนไปทัศนศึกษา" },
      { label: "เรียน", question: "เรียนถึงใครคะ", hint: "ผู้อำนวยการโรงเรียนชุมชนวัดไทยงาม" },
      { label: "เหตุผลและรายละเอียด", question: "เหตุผลและรายละเอียดคืออะไรคะ", hint: "เพื่อให้นักเรียนได้เรียนรู้นอกห้องเรียน จำนวน 45 คน" },
      { label: "วันเวลาที่เกี่ยวข้อง", question: "วันเวลาที่เกี่ยวข้องคือเมื่อไหร่คะ", hint: "วันที่ 5 มีนาคม 2569 เวลา 08.00-16.00 น." },
      { label: "ผู้ลงชื่อ", question: "ใครเป็นผู้ลงชื่อคะ (ชื่อและตำแหน่ง)", hint: "นางสาวสมศรี ใจดี ครูชำนาญการ" },
    ],
  },
  {
    name: "บันทึกข้อความ",
    triggerKeyword: "ร่างบันทึกข้อความ",
    description: "ใช้สื่อสารภายในโรงเรียน",
    promptTemplate:
      "เขียนตามรูปแบบบันทึกข้อความของราชการ มีหัวข้อ ส่วนราชการ / ที่ / วันที่ / เรื่อง / เรียน " +
      "แล้วตามด้วยเนื้อความ และส่วนลงชื่อ ใช้ภาษาทางการและกระชับ",
    fields: [
      { label: "เรื่อง", question: "เรื่องอะไรคะ", hint: "ขอเชิญประชุมคณะครู" },
      { label: "เรียน", question: "เรียนถึงใครคะ", hint: "คณะครูทุกท่าน" },
      { label: "ส่วนราชการ", question: "ส่วนราชการหรือกลุ่มงานไหนคะ", hint: "กลุ่มบริหารวิชาการ" },
      { label: "เนื้อความ", question: "เนื้อความที่ต้องการแจ้งคืออะไรคะ", hint: "ประชุมเตรียมงานกีฬาสี วันที่ 10 มีนาคม เวลา 15.30 น. ณ ห้องประชุม" },
      { label: "ผู้ลงชื่อ", question: "ใครเป็นผู้ลงชื่อคะ (ชื่อและตำแหน่ง)", hint: "นายสมชาย รักเรียน หัวหน้ากลุ่มบริหารวิชาการ" },
    ],
  },
  {
    name: "รายงานการประชุม",
    triggerKeyword: "ร่างรายงานการประชุม",
    description: "สรุปผลการประชุมเป็นเอกสารทางการ",
    promptTemplate:
      "เขียนตามรูปแบบรายงานการประชุม มีหัวข้อ ครั้งที่ / วันเวลาและสถานที่ / ผู้มาประชุม / " +
      "ระเบียบวาระ / มติที่ประชุม / ปิดประชุม และผู้จดรายงาน ใช้ภาษาทางการ",
    fields: [
      { label: "เรื่องที่ประชุม", question: "ประชุมเรื่องอะไรคะ", hint: "เตรียมความพร้อมงานกีฬาสี" },
      { label: "วันเวลาและสถานที่", question: "ประชุมวันไหน เวลาใด ที่ไหนคะ", hint: "วันที่ 10 มีนาคม 2569 เวลา 15.30 น. ณ ห้องประชุมโรงเรียน" },
      { label: "ผู้เข้าร่วมประชุม", question: "ใครเข้าร่วมประชุมบ้างคะ", hint: "ผู้อำนวยการ และคณะครู จำนวน 20 คน" },
      { label: "ประเด็นที่หารือ", question: "หารือเรื่องอะไรบ้างคะ", hint: "แบ่งสี จัดขบวนพาเหรด งบประมาณ" },
      { label: "มติที่ประชุม", question: "ที่ประชุมมีมติว่าอย่างไรคะ", hint: "เห็นชอบให้จัดวันที่ 20 มีนาคม และตั้งคณะกรรมการ 5 ฝ่าย" },
      { label: "ผู้จดรายงาน", question: "ใครเป็นผู้จดรายงานคะ (ชื่อและตำแหน่ง)", hint: "นางสาวสมศรี ใจดี ครูชำนาญการ" },
    ],
  },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const [index, doc] of SEED.entries()) {
    const existing = await prisma.documentType.findUnique({
      where: { triggerKeyword: doc.triggerKeyword },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      console.log(`ข้าม "${doc.name}" (มีอยู่แล้ว)`);
      continue;
    }

    await prisma.documentType.create({
      data: {
        name: doc.name,
        triggerKeyword: doc.triggerKeyword,
        description: doc.description,
        promptTemplate: doc.promptTemplate,
        sortOrder: index,
        fields: {
          create: doc.fields.map((f, i) => ({
            label: f.label,
            question: f.question,
            hint: f.hint,
            sortOrder: i,
          })),
        },
      },
    });

    created++;
    console.log(`เพิ่ม "${doc.name}" (${doc.fields.length} คำถาม)`);
  }

  console.log(`\nสรุป: เพิ่มใหม่ ${created}, ข้าม ${skipped}`);
  await prisma.$disconnect();
}

main();
