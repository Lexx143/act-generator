import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  getDb,
  parseActExtra,
  type ActRow,
  type ActType,
  type EquipmentItem,
} from "@/lib/db";
import { fmtTimestamp } from "@/lib/format";
import { ActLetterhead } from "@/components/ActLetterhead";
import { A4PagePreview } from "@/components/A4PagePreview";
import { PrintButton } from "@/components/PrintButton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ActPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const act = getDb()
    .prepare(
      `SELECT acts.*,
              users.full_name AS author_name,
              COALESCE(NULLIF(users.act_name, ''), users.full_name) AS author_act_name
       FROM acts JOIN users ON users.id = acts.created_by
       WHERE acts.id = ?`
    )
    .get(Number(id)) as
    | (ActRow & { author_act_name?: string })
    | undefined;

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

  const actType: ActType =
    act.act_type === "disposal" ? "disposal" : "expertise";
  const extra = parseActExtra(act.extra);
  const title =
    actType === "disposal" ? "Акт утилизации" : "Акт тех. экспертизы";

  const letterhead = (
    <ActLetterhead
      actNumber={act.act_number}
      actDate={act.act_date}
      clientName={act.client_name}
      equipment={equipment}
      defectDesc={act.defect_desc}
      conclusion={act.conclusion}
      signerName={act.signer_name}
      authorName={
        extra.author_act_name || act.author_act_name || act.author_name!
      }
      actType={actType}
      showSeal={act.show_seal !== 0}
      showSignature={act.show_signature !== 0}
      showSpecialist={act.show_specialist !== 0}
      extra={extra}
    />
  );

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/history" />}
          >
            <ArrowLeft className="size-4" />К истории
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {title} № {act.act_number}
            </h1>
            <p className="text-muted-foreground text-xs">
              Создал(а) {act.author_name} · {fmtTimestamp(act.created_at)}
              {act.updated_at &&
                ` · изменён ${fmtTimestamp(act.updated_at)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/acts/${act.id}/edit`} />}
          >
            <Pencil className="size-4" />
            Редактировать
          </Button>
          <PrintButton />
        </div>
      </div>

      <div className="letterhead-viewport -mx-4 overflow-x-auto px-4 pb-8">
        <div className="mx-auto w-fit">
          <A4PagePreview>{letterhead}</A4PagePreview>
        </div>
      </div>
    </div>
  );
}
