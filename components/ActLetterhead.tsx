/* eslint-disable @next/next/no-img-element */
import { COMPANY } from "@/lib/company";
import { fmtDate } from "@/lib/format";
import type { EquipmentItem } from "@/lib/db";

type Props = {
  actNumber: string;
  actDate: string; // YYYY-MM-DD
  clientName: string;
  equipment: EquipmentItem[];
  defectDesc: string;
  conclusion: string;
  signerName: string;
  authorName: string;
};

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="text-justify">
            {p}
          </p>
        ))}
    </>
  );
}

/**
 * Печатный бланк «Акт технической экспертизы» — копия фирменного бланка
 * ТОО «IT Support Group». Изображения печати и подписи: public/letterhead/.
 */
export function ActLetterhead(act: Props) {
  return (
    <div className="letterhead relative flex flex-col">
      {/* Шапка: логотип + слоган */}
      <div className="flex items-center gap-[7mm]">
        <img
          src="/letterhead/logo.png"
          alt=""
          style={{ width: "27mm", height: "auto" }}
        />
        <div style={{ fontSize: "13pt", lineHeight: 1.35 }}>
          {COMPANY.sloganLine1}
          <br />
          {COMPANY.sloganLine2}
        </div>
      </div>

      {/* Заголовок и дата */}
      <div
        className="text-center"
        style={{ fontSize: "18pt", marginTop: "9mm" }}
      >
        {COMPANY.actTitle} №&nbsp;{act.actNumber}
      </div>
      <div className="text-right" style={{ marginTop: "6mm" }}>
        {fmtDate(act.actDate)}г.
      </div>

      {/* Вводный абзац */}
      <p
        className="text-justify"
        style={{ marginTop: "5mm", textIndent: "12mm" }}
      >
        Настоящий акт составлен сервисным специалистом {COMPANY.name}{" "}
        {act.authorName} по заявке {act.clientName} о проведении осмотра
        технического состояния следующей техники:
      </p>

      {/* Таблица оборудования */}
      <table
        className="w-full border-collapse"
        style={{ marginTop: "6mm", fontSize: "12.5pt" }}
      >
        <thead>
          <tr>
            <th className="border border-black px-2 py-3 font-bold" style={{ width: "9%" }}>
              №
            </th>
            <th className="border border-black px-2 py-3 font-bold" style={{ width: "50%" }}>
              Наименование оборудования
            </th>
            <th className="border border-black px-2 py-3 font-bold">
              Серийный / инвентарный номер
            </th>
          </tr>
        </thead>
        <tbody>
          {act.equipment.map((item, i) => (
            <tr key={i}>
              <td className="border border-black px-2 py-3 text-center">
                {i + 1}
              </td>
              <td className="border border-black px-2 py-3 text-center">
                {item.name}
              </td>
              <td className="border border-black px-2 py-3 text-center">
                {item.serial || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Заключение */}
      <div style={{ marginTop: "7mm" }}>
        <p className="font-bold">Заключение:</p>
        {act.defectDesc && <Paragraphs text={act.defectDesc} />}
        <Paragraphs text={act.conclusion} />
      </div>

      {/* Подпись и печать */}
      <div
        className="relative self-end break-inside-avoid"
        style={{ marginTop: "16mm", width: "95mm", minHeight: "42mm" }}
      >
        <p className="font-bold">Заключение выдал:</p>
        <p style={{ marginTop: "4mm" }}>
          {act.signerName}
          <span
            className="inline-block border-b border-black align-baseline"
            style={{ width: "42mm" }}
          />
        </p>
        <img
          src="/letterhead/signature.png"
          alt=""
          className="absolute"
          style={{
            width: "40mm",
            right: "6mm",
            top: "1mm",
            transform: "rotate(-4deg)",
          }}
        />
        <img
          src="/letterhead/seal.png"
          alt=""
          className="absolute"
          style={{
            width: "46mm",
            right: "14mm",
            top: "-2mm",
            opacity: 0.94,
          }}
        />
      </div>
    </div>
  );
}
