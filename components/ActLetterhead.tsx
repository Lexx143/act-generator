/* eslint-disable @next/next/no-img-element */
import { COMPANY, DISPOSAL_BODY } from "@/lib/company";
import { fmtDate } from "@/lib/format";
import {
  shortNameFromFull,
  type ActExtra,
  type ActType,
  type EquipmentItem,
} from "@/lib/act-types";
import { LetterheadFrame } from "@/components/LetterheadFrame";

type Props = {
  actNumber: string;
  actDate: string; // YYYY-MM-DD
  clientName: string;
  equipment: EquipmentItem[];
  defectDesc: string;
  conclusion: string;
  signerName: string;
  authorName: string;
  actType?: ActType;
  showSeal?: boolean;
  showSignature?: boolean;
  showSpecialist?: boolean;
  extra?: ActExtra;
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

function EquipmentTable({ equipment }: { equipment: EquipmentItem[] }) {
  return (
    <table
      className="w-full border-collapse"
      style={{ marginTop: "5mm", fontSize: "12pt" }}
    >
      <thead>
        <tr>
          <th
            className="border border-black px-2 py-2 font-bold"
            style={{ width: "9%" }}
          >
            №
          </th>
          <th
            className="border border-black px-2 py-2 font-bold"
            style={{ width: "50%" }}
          >
            Наименование оборудования
          </th>
          <th className="border border-black px-2 py-2 font-bold">
            Серийный / инвентарный номер
          </th>
        </tr>
      </thead>
      <tbody>
        {equipment.map((item, i) => (
          <tr key={i}>
            <td className="border border-black px-2 py-2 text-center">
              {i + 1}
            </td>
            <td className="border border-black px-2 py-2 text-center">
              {item.name}
            </td>
            <td className="border border-black px-2 py-2 text-center">
              {item.serial || "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Печатный бланк акта — фирменный бланк ТОО «IT Support Group».
 * Утилизация — по шаблону Word «Утилизация ИРМ».
 */
export function ActLetterhead(act: Props) {
  const isDisposal = act.actType === "disposal";
  const title = isDisposal ? COMPANY.disposalTitle : COMPANY.actTitle;
  const showSeal = act.showSeal !== false;
  const showSignature = act.showSignature !== false;
  const showSpecialist = act.showSpecialist !== false;
  const extra = act.extra || {};

  const authorInText = (extra.author_act_name || act.authorName || "").trim();
  const skipAuthor =
    !authorInText || authorInText.toLowerCase() === "администратор";
  const introSpecialist = showSpecialist
    ? skipAuthor
      ? `сервисным специалистом ${COMPANY.name}`
      : `сервисным специалистом ${COMPANY.name} ${authorInText}`
    : COMPANY.name;

  const purpose = isDisposal
    ? "о проведении утилизации следующей техники"
    : "о проведении осмотра технического состояния следующей техники";

  const specialistShort = shortNameFromFull(
    extra.specialist_short || extra.specialist_full || act.signerName
  );
  const headPosition = extra.head_position || COMPANY.defaultHeadPosition;
  const headName = extra.head_name || COMPANY.defaultHeadName;

  const main = (
    <>
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

      <div
        className="text-center"
        style={{ fontSize: "17pt", marginTop: "7mm" }}
      >
        {isDisposal ? (
          title
        ) : (
          <>
            {title} №&nbsp;{act.actNumber}
          </>
        )}
      </div>
      <div className="text-right" style={{ marginTop: "4mm" }}>
        {fmtDate(act.actDate)}г.
      </div>

      <p
        className="text-justify"
        style={{ marginTop: "4mm", textIndent: "12mm" }}
      >
        Настоящий акт составлен {introSpecialist} по заявке {act.clientName}{" "}
        {purpose}:
      </p>

      <EquipmentTable equipment={act.equipment} />

      {!isDisposal && (
        <div style={{ marginTop: "5mm" }}>
          <p className="font-bold">Заключение:</p>
          {act.defectDesc && <Paragraphs text={act.defectDesc} />}
          <Paragraphs text={act.conclusion} />
        </div>
      )}
    </>
  );

  const closingText = isDisposal ? (
    <p
      className="text-justify"
      style={{ marginTop: "5mm", textIndent: "12mm" }}
    >
      {DISPOSAL_BODY}
    </p>
  ) : undefined;

  const footer = isDisposal ? (
    <div
      className="relative grid grid-cols-2 gap-[8mm]"
      style={{ fontSize: "12pt" }}
    >
      <div>
        <p>От {COMPANY.name}</p>
        <p style={{ marginTop: "4mm" }}>{headPosition}:</p>
        <p style={{ marginTop: "2mm" }}>
          {headName}
          <span
            className="inline-block border-b border-black align-baseline"
            style={{ width: "32mm", marginLeft: "2mm" }}
          />
        </p>
        <p style={{ marginTop: "5mm" }}>Сервисный специалист:</p>
        <p style={{ marginTop: "2mm" }}>
          {specialistShort}
          <span
            className="inline-block border-b border-black align-baseline"
            style={{ width: "32mm", marginLeft: "2mm" }}
          />
        </p>
      </div>

      <div>
        <p>От {act.clientName}</p>
        <p style={{ marginTop: "4mm" }}>
          Должность:{" "}
          <span
            className="inline-block border-b border-black align-baseline"
            style={{ width: "42mm" }}
          />
        </p>
        <p style={{ marginTop: "5mm" }}>
          ФИО:{" "}
          <span
            className="inline-block border-b border-black align-baseline"
            style={{ width: "50mm" }}
          />
        </p>
        <p style={{ marginTop: "5mm" }}>
          Подпись:{" "}
          <span
            className="inline-block border-b border-black align-baseline"
            style={{ width: "36mm" }}
          />
        </p>
      </div>

      {showSignature && (
        <img
          src="/letterhead/signature.png"
          alt=""
          className="absolute"
          style={{
            width: "36mm",
            left: "18mm",
            top: "8mm",
            transform: "rotate(-4deg)",
          }}
        />
      )}
      {showSeal && (
        <img
          src="/letterhead/seal.png"
          alt=""
          className="absolute"
          style={{
            width: "42mm",
            left: "8mm",
            top: "10mm",
            opacity: 0.94,
          }}
        />
      )}
    </div>
  ) : (
    <div
      className="relative ml-auto"
      style={{ width: "95mm", minHeight: "38mm" }}
    >
      <p className="font-bold">Заключение выдал:</p>
      <p style={{ marginTop: "3mm" }}>
        {act.signerName}
        <span
          className="inline-block border-b border-black align-baseline"
          style={{ width: "42mm" }}
        />
      </p>
      {showSignature && (
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
      )}
      {showSeal && (
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
      )}
    </div>
  );

  return (
    <LetterheadFrame main={main} closingText={closingText} footer={footer} />
  );
}
