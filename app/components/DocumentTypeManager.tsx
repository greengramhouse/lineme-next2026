"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface Field {
  id?: string;
  label: string;
  question: string;
  hint: string | null;
  isRequired: boolean;
}

interface DocType {
  id: string;
  name: string;
  triggerKeyword: string;
  description: string | null;
  promptTemplate: string;
  isActive: boolean;
  fields: Field[];
}

const BLANK: Omit<DocType, "id"> = {
  name: "",
  triggerKeyword: "",
  description: "",
  promptTemplate:
    "เขียนตามรูปแบบหนังสือราชการไทย ใช้ภาษาทางการ กระชับ สุภาพ",
  isActive: true,
  fields: [{ label: "", question: "", hint: "", isRequired: true }],
};

export default function DocumentTypeManager({
  initialTypes,
}: {
  initialTypes: DocType[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<DocType | Omit<DocType, "id"> | null>(null);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function notify(text: string, type: "success" | "error") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }

  const refresh = () => startTransition(() => router.refresh());

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "ทำรายการไม่สำเร็จ");
    return data;
  }

  async function toggle(t: DocType) {
    setBusy(t.id);
    try {
      await call(`/api/document-types/${t.id}`, "PUT", { isActive: !t.isActive });
      notify(`${t.isActive ? "ปิด" : "เปิด"} "${t.name}" แล้ว`, "success");
      refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ", "error");
    } finally {
      setBusy(null);
    }
  }

  async function remove(t: DocType) {
    setBusy(t.id);
    try {
      await call(`/api/document-types/${t.id}`, "DELETE");
      notify(`ลบ "${t.name}" แล้ว`, "success");
      refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "ลบไม่สำเร็จ", "error");
    } finally {
      setBusy(null);
    }
  }

  if (editing) {
    return (
      <Editor
        value={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
        }}
        notify={notify}
        call={call}
      />
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ring-1 ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-rose-200"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setEditing({ ...BLANK })}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
        >
          + เพิ่มประเภทเอกสาร
        </button>
      </div>

      {initialTypes.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">
          ยังไม่มีประเภทเอกสาร — กด &quot;เพิ่มประเภทเอกสาร&quot; เพื่อเริ่ม
        </p>
      )}

      {initialTypes.map((t) => (
        <div
          key={t.id}
          className={`rounded-2xl border bg-white p-5 shadow-sm ${
            t.isActive ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-70"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-900">{t.name}</h3>
                <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {t.triggerKeyword}
                </code>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                  {t.fields.length} คำถาม
                </span>
                {!t.isActive && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    ปิดอยู่
                  </span>
                )}
              </div>
              {t.description && (
                <p className="mt-1 text-sm text-slate-500">{t.description}</p>
              )}
              <ol className="mt-3 space-y-1 text-sm text-slate-600">
                {t.fields.map((f, i) => (
                  <li key={f.id ?? i}>
                    <span className="text-slate-400">{i + 1}.</span>{" "}
                    <span className="font-medium text-slate-700">{f.label}</span>
                    <span className="text-slate-400"> — {f.question}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={() => toggle(t)}
                disabled={busy === t.id}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
              >
                {t.isActive ? "ปิด" : "เปิด"}
              </button>
              <button
                onClick={() => setEditing(t)}
                disabled={busy === t.id}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-40"
              >
                แก้ไข
              </button>
              <button
                onClick={() => remove(t)}
                disabled={busy === t.id}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Editor({
  value,
  onCancel,
  onSaved,
  notify,
  call,
}: {
  value: DocType | Omit<DocType, "id">;
  onCancel: () => void;
  onSaved: () => void;
  notify: (t: string, ty: "success" | "error") => void;
  call: (url: string, method: string, body?: unknown) => Promise<any>;
}) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);
  const isNew = !("id" in value);

  function setField(i: number, patch: Partial<Field>) {
    const fields = [...form.fields];
    fields[i] = { ...fields[i], ...patch };
    setForm({ ...form, fields });
  }

  function addField() {
    setForm({
      ...form,
      fields: [...form.fields, { label: "", question: "", hint: "", isRequired: true }],
    });
  }

  function removeField(i: number) {
    if (form.fields.length === 1) {
      notify("ต้องมีคำถามอย่างน้อย 1 ข้อ", "error");
      return;
    }
    setForm({ ...form, fields: form.fields.filter((_, j) => j !== i) });
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= form.fields.length) return;
    const fields = [...form.fields];
    [fields[i], fields[j]] = [fields[j], fields[i]];
    setForm({ ...form, fields });
  }

  async function save() {
    setSaving(true);
    try {
      const url = isNew
        ? "/api/document-types"
        : `/api/document-types/${(value as DocType).id}`;
      await call(url, isNew ? "POST" : "PUT", form);
      notify(isNew ? "เพิ่มประเภทเอกสารแล้ว" : "บันทึกแล้ว", "success");
      onSaved();
    } catch (e) {
      notify(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ", "error");
    } finally {
      setSaving(false);
    }
  }

  const input =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30";

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">
        {isNew ? "เพิ่มประเภทเอกสาร" : `แก้ไข: ${(value as DocType).name}`}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            ชื่อประเภทเอกสาร
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="หนังสือขออนุญาต"
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            คำเริ่มต้นที่ครูพิมพ์
          </label>
          <input
            value={form.triggerKeyword}
            onChange={(e) => setForm({ ...form, triggerKeyword: e.target.value })}
            placeholder="ร่างหนังสือขออนุญาต"
            className={input}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            ต้องไม่ซ้ำกับคีย์เวิร์ดตอบกลับอัตโนมัติที่มีอยู่
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          คำอธิบายสั้น ๆ (ไม่บังคับ)
        </label>
        <input
          value={form.description ?? ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="เช่น ขออนุญาตพานักเรียนไปทัศนศึกษา"
          className={input}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          คำสั่งรูปแบบเอกสาร (ส่งให้ Gemini)
        </label>
        <textarea
          value={form.promptTemplate}
          onChange={(e) => setForm({ ...form, promptTemplate: e.target.value })}
          rows={3}
          className={`${input} resize-y font-mono text-[13px] leading-relaxed`}
        />
        <p className="mt-1 text-[11px] text-slate-500">
          บอกว่าอยากได้เอกสารรูปแบบไหน ระบบจะแนบคำตอบของครูไปให้เอง
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-800">
            คำถามที่บอทจะถาม ({form.fields.length} ข้อ)
          </label>
          <button
            onClick={addField}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
          >
            + เพิ่มคำถาม
          </button>
        </div>

        <div className="space-y-3">
          {form.fields.map((f, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">ข้อ {i + 1}</span>
                <div className="flex gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 disabled:opacity-30">↑</button>
                  <button onClick={() => move(i, 1)} disabled={i === form.fields.length - 1}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 disabled:opacity-30">↓</button>
                  <button onClick={() => removeField(i)}
                    className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">ลบ</button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={f.label}
                  onChange={(e) => setField(i, { label: e.target.value })}
                  placeholder="ชื่อช่อง เช่น เรื่อง"
                  className={input}
                />
                <input
                  value={f.question}
                  onChange={(e) => setField(i, { question: e.target.value })}
                  placeholder="ประโยคที่บอทถาม เช่น เรื่องอะไรคะ"
                  className={input}
                />
              </div>
              <input
                value={f.hint ?? ""}
                onChange={(e) => setField(i, { hint: e.target.value })}
                placeholder="ตัวอย่างคำตอบ (ไม่บังคับ) — ช่วยให้ครูตอบได้ตรง"
                className={`${input} mt-2`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
        >
          ยกเลิก
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-sky-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </div>
  );
}
