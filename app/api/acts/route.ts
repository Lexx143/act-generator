import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getDb,
  type ActExtra,
  type ActType,
  type EquipmentItem,
} from "@/lib/db";

function normalizeEquipment(
  raw: EquipmentItem[] | undefined,
  actType: ActType
): EquipmentItem[] {
  return (raw || [])
    .map((e) => {
      const item: EquipmentItem = {
        name: (e.name || "").trim(),
        serial: (e.serial || "").trim() || "-",
      };
      if (actType === "disposal") {
        item.barcode = (e.barcode || "").trim() || "-";
        item.inventory = (e.inventory || "").trim() || "-";
      }
      return item;
    })
    .filter((e) => e.name);
}

function parseBody(body: Record<string, unknown>) {
  const actType: ActType =
    body.act_type === "disposal" ? "disposal" : "expertise";
  const actNumber = String(body.act_number || "").trim();
  const actDate = String(body.act_date || "").trim();
  const clientName = String(body.client_name || "").trim();
  const conclusion = String(body.conclusion || "").trim();
  const defectDesc = String(body.defect_desc || "").trim();
  const signerName = String(body.signer_name || "").trim();
  const showSeal = body.show_seal !== false && body.show_seal !== 0;
  const showSignature =
    body.show_signature !== false && body.show_signature !== 0;
  const showSpecialist =
    body.show_specialist !== false && body.show_specialist !== 0;
  const extraRaw = (body.extra || {}) as ActExtra;
  const extra: ActExtra = {
    legal_form: String(extraRaw.legal_form || "").trim(),
    client_title: String(extraRaw.client_title || "").trim(),
    specialist_full: String(extraRaw.specialist_full || "").trim(),
    author_act_name: String(extraRaw.author_act_name || "").trim(),
    head_position: String(extraRaw.head_position || "").trim(),
    head_name: String(extraRaw.head_name || "").trim(),
    specialist_short: String(extraRaw.specialist_short || "").trim(),
  };
  const equipment = normalizeEquipment(
    body.equipment as EquipmentItem[] | undefined,
    actType
  );

  return {
    actType,
    actNumber,
    actDate,
    clientName,
    conclusion,
    defectDesc,
    signerName,
    showSeal,
    showSignature,
    showSpecialist,
    extra,
    equipment,
  };
}

function validate(fields: ReturnType<typeof parseBody>) {
  if (!fields.actNumber) return "Укажите номер акта";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.actDate)) return "Укажите дату акта";
  if (!fields.clientName) return "Укажите клиента";
  if (fields.equipment.length === 0)
    return "Добавьте хотя бы одну единицу оборудования";
  if (fields.actType !== "disposal" && !fields.conclusion) {
    return "Заполните заключение";
  }
  if (!fields.signerName) return "Укажите, кто выдал заключение";
  return null;
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const fields = parseBody(body);
  const err = validate(fields);
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  const db = getDb();
  try {
    const result = db
      .prepare(
        `INSERT INTO acts (
           act_number, act_date, client_name, equipment, defect_desc, conclusion,
           signer_name, act_type, show_seal, show_signature, show_specialist,
           extra, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        fields.actNumber,
        fields.actDate,
        fields.clientName,
        JSON.stringify(fields.equipment),
        fields.defectDesc,
        fields.conclusion,
        fields.signerName,
        fields.actType,
        fields.showSeal ? 1 : 0,
        fields.showSignature ? 1 : 0,
        fields.showSpecialist ? 1 : 0,
        JSON.stringify(fields.extra),
        user.uid
      );
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("UNIQUE")) {
      return NextResponse.json(
        { error: `Акт с номером «${fields.actNumber}» уже существует` },
        { status: 409 }
      );
    }
    console.error("acts POST:", e);
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}
