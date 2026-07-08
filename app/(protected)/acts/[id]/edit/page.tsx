import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb, nextActNumber, type ActRow, type EquipmentItem } from "@/lib/db";
import { todayIso } from "@/lib/format";
import { CONCLUSION_TEMPLATE } from "@/lib/company";
import { ActForm } from "@/components/ActForm";

export const dynamic = "force-dynamic";

export default async function EditActPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const act = getDb()
    .prepare("SELECT * FROM acts WHERE id = ?")
    .get(Number(id)) as ActRow | undefined;
  if (!act) notFound();

  const user = await getSessionUser();
  if (user?.role !== "admin" && act.created_by !== user?.uid) {
    notFound();
  }

  let equipment: EquipmentItem[] = [];
  try {
    equipment = JSON.parse(act.equipment);
  } catch {
    equipment = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Редактирование акта № {act.act_number}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Изменения попадут в печатную версию; дата и время правки фиксируются
        </p>
      </div>
      <ActForm
        actId={act.id}
        initial={{
          act_number: act.act_number,
          act_date: act.act_date,
          client_name: act.client_name,
          equipment,
          defect_desc: act.defect_desc,
          conclusion: act.conclusion,
          signer_name: act.signer_name,
        }}
        suggestedNumber={nextActNumber()}
        defaultDate={todayIso()}
        defaultSigner={user?.name ?? ""}
        conclusionTemplate={CONCLUSION_TEMPLATE}
      />
    </div>
  );
}
