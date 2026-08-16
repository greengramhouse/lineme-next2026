"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface SchoolInfoItem {
  id: string;
  topic: string;
  content: string;
  isActive: boolean;
}

interface PersonaData {
  persona: string;
  scope: string;
  rules: string;
}

type Toast = { text: string; type: "success" | "error" } | null;

export default function BotConfigEditor({
  initialPersona,
  initialSchoolInfo,
}: {
  initialPersona: PersonaData;
  initialSchoolInfo: SchoolInfoItem[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<"knowledge" | "persona">("knowledge");
  const [toast, setToast] = useState<Toast>(null);

  function notify(text: string, type: "success" | "error") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-sm ring-1 ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-rose-200"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200">
        {(
          [
            ["knowledge", `ข้อมูลโรงเรียน (${initialSchoolInfo.length})`],
            ["persona", "บุคลิกและกฎ"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === key
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "knowledge" ? (
        <KnowledgeTab
          items={initialSchoolInfo}
          notify={notify}
          refresh={refresh}
        />
      ) : (
        <PersonaTab initial={initialPersona} notify={notify} refresh={refresh} />
      )}
    </div>
  );
}

/* ────────────────────────── ข้อมูลโรงเรียน ────────────────────────── */

function KnowledgeTab({
  items,
  notify,
  refresh,
}: {
  items: SchoolInfoItem[];
  notify: (t: string, ty: "success" | "error") => void;
  refresh: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function send(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "ทำรายการไม่สำเร็จ");
    return data;
  }

  async function toggleActive(item: SchoolInfoItem) {
    setBusy(item.id);
    try {
      await send(`/api/bot/school-info/${item.id}`, "PUT", {
        isActive: !item.isActive,
      });
      notify(
        `${item.isActive ? "ปิด" : "เปิด"}หัวข้อ "${item.topic}" แล้ว`,
        "success"
      );
      refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ", "error");
    } finally {
      setBusy(null);
    }
  }

  async function remove(item: SchoolInfoItem) {
    setBusy(item.id);
    try {
      await send(`/api/bot/school-info/${item.id}`, "DELETE");
      notify(`ลบหัวข้อ "${item.topic}" แล้ว`, "success");
      refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "ลบไม่สำเร็จ", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          แต่ละหัวข้อคือความรู้ 1 เรื่องที่น้องกรีนใช้ตอบ — ปิดไว้ชั่วคราวได้โดยไม่ต้องลบ
        </p>
        <button
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
          className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          + เพิ่มหัวข้อ
        </button>
      </div>

      {adding && (
        <EntryForm
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            refresh();
          }}
          notify={notify}
        />
      )}

      <div className="space-y-3">
        {items.map((item) =>
          editingId === item.id ? (
            <EntryForm
              key={item.id}
              item={item}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                refresh();
              }}
              notify={notify}
            />
          ) : (
            <div
              key={item.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                item.isActive
                  ? "border-slate-200"
                  : "border-slate-200 bg-slate-50 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-900">
                      {item.topic}
                    </h3>
                    {!item.isActive && (
                      <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        ปิดอยู่
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                    {item.content}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <IconButton
                    label={item.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    disabled={busy === item.id}
                    onClick={() => toggleActive(item)}
                    tone="slate"
                  />
                  <IconButton
                    label="แก้ไข"
                    disabled={busy === item.id}
                    onClick={() => {
                      setEditingId(item.id);
                      setAdding(false);
                    }}
                    tone="indigo"
                  />
                  <IconButton
                    label="ลบ"
                    disabled={busy === item.id}
                    onClick={() => remove(item)}
                    tone="rose"
                  />
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone: "slate" | "indigo" | "rose";
}) {
  const tones = {
    slate: "text-slate-600 hover:bg-slate-100",
    indigo: "text-indigo-600 hover:bg-indigo-50",
    rose: "text-rose-600 hover:bg-rose-50",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-40 ${tones[tone]}`}
    >
      {label}
    </button>
  );
}

function EntryForm({
  item,
  onCancel,
  onSaved,
  notify,
}: {
  item?: SchoolInfoItem;
  onCancel: () => void;
  onSaved: () => void;
  notify: (t: string, ty: "success" | "error") => void;
}) {
  const [topic, setTopic] = useState(item?.topic ?? "");
  const [content, setContent] = useState(item?.content ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!topic.trim() || !content.trim()) {
      notify("กรุณากรอกทั้งหัวข้อและเนื้อหา", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        item ? `/api/bot/school-info/${item.id}` : "/api/bot/school-info",
        {
          method: item ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: topic.trim(), content: content.trim() }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");

      notify(item ? "แก้ไขหัวข้อแล้ว" : "เพิ่มหัวข้อแล้ว", "success");
      onSaved();
    } catch (e) {
      notify(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-5">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            หัวข้อ
          </label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="เช่น ติดต่อ / ฉุกเฉิน"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            เนื้อหา
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="ข้อมูลที่น้องกรีนจะใช้ตอบคำถามเรื่องนี้"
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <div className="flex justify-end gap-2">
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
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── บุคลิกและกฎ ────────────────────────── */

function PersonaTab({
  initial,
  notify,
  refresh,
}: {
  initial: PersonaData;
  notify: (t: string, ty: "success" | "error") => void;
  refresh: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const dirty =
    form.persona !== initial.persona ||
    form.scope !== initial.scope ||
    form.rules !== initial.rules;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/bot/persona", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");

      notify("บันทึกบุคลิกและกฎแล้ว", "success");
      refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ", "error");
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    {
      key: "persona" as const,
      label: "บุคลิกและสไตล์การพูด",
      hint: "ชื่อ นิสัย วิธีลงท้ายประโยค การใช้ emoji",
    },
    {
      key: "scope" as const,
      label: "ขอบเขตการทำงาน",
      hint: "เรื่องอะไรที่น้องกรีนตอบได้ และให้ตอบยังไงเมื่อไม่รู้",
    },
    {
      key: "rules" as const,
      label: "ข้อห้ามเด็ดขาด",
      hint: "กฎกันน้องกรีนตอบมั่วหรือหลุดบทบาท — แก้ด้วยความระวัง",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
        ส่วนนี้เป็นโครงบุคลิกของน้องกรีน ปกติแทบไม่ต้องแก้ —
        ถ้าจะเปลี่ยนแค่ข้อมูลโรงเรียน (เบอร์โทร เวลาเรียน) ให้ไปที่แท็บ &quot;ข้อมูลโรงเรียน&quot;
      </div>

      {fields.map((f) => (
        <div key={f.key}>
          <label className="mb-1 block text-sm font-semibold text-slate-800">
            {f.label}
          </label>
          <p className="mb-2 text-xs text-slate-500">{f.hint}</p>
          <textarea
            value={form[f.key]}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            rows={f.key === "persona" ? 8 : 7}
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      ))}

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : dirty ? "บันทึกการเปลี่ยนแปลง" : "ยังไม่มีการแก้ไข"}
        </button>
      </div>
    </div>
  );
}
