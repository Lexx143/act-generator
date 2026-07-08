import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb, type ActRow, type EquipmentItem } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const actId = Number(id);
  const act = getDb()
    .prepare("SELECT * FROM acts WHERE id = ?")
    .get(actId) as ActRow | undefined;
  if (!act) {
    return NextResponse.json({ error: "Акт не найден" }, { status: 404 });
  }
  // Править может автор акта или администратор
  if (user.role !== "admin" && act.created_by !== user.uid) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  let body: {
    act_number?: string;
    act_date?: string;
    client_name?: string;
    equipment?: EquipmentItem[];
    defect_desc?: string;
    conclusion?: string;
    signer_name?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const actNumber = (body.act_number || "").trim();
  const actDate = (body.act_date || "").trim();
  const clientName = (body.client_name || "").trim();
  const conclusion = (body.conclusion || "").trim();
  const defectDesc = (body.defect_desc || "").trim();
  const signerName = (body.signer_name || "").trim();
  const equipment = (body.equipment || [])
    .map((e) => ({
      name: (e.name || "").trim(),
      serial: (e.serial || "").trim() || "-",
    }))
    .filter((e) => e.name);

  if (!actNumber) {
    return NextResponse.json({ error: "Укажите номер акта" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(actDate)) {
    return NextResponse.json({ error: "Укажите дату акта" }, { status: 400 });
  }
  if (!clientName) {
    return NextResponse.json({ error: "Укажите клиента" }, { status: 400 });
  }
  if (equipment.length === 0) {
    return NextResponse.json(
      { error: "Добавьте хотя бы одну единицу оборудования" },
      { status: 400 }
    );
  }
  if (!conclusion) {
    return NextResponse.json({ error: "Заполните заключение" }, { status: 400 });
  }
  if (!signerName) {
    return NextResponse.json(
      { error: "Укажите, кто выдал заключение" },
      { status: 400 }
    );
  }

  try {
    getDb()
      .prepare(
        `UPDATE acts SET
           act_number = ?, act_date = ?, client_name = ?, equipment = ?,
           defect_desc = ?, conclusion = ?, signer_name = ?,
           updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(
        actNumber,
        actDate,
        clientName,
        JSON.stringify(equipment),
        defectDesc,
        conclusion,
        signerName,
        actId
      );
    return NextResponse.json({ id: actId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("UNIQUE")) {
      return NextResponse.json(
        { error: `Акт с номером «${actNumber}» уже существует` },
        { status: 409 }
      );
    }
    console.error("acts PATCH:", e);
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}
