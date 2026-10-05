"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2, FileText } from "lucide-react";
import { COMPANY, LEGAL_FORMS } from "@/lib/company";
import {
  specialistForms,
  type ActExtra,
  type ActType,
  type EquipmentItem,
} from "@/lib/act-types";

type ActInitial = {
  act_number: string;
  act_date: string;
  client_name: string;
  equipment: EquipmentItem[];
  defect_desc: string;
  conclusion: string;
  signer_name: string;
  act_type?: ActType;
  show_seal?: boolean;
  show_signature?: boolean;
  extra?: ActExtra;
};

type Props = {
  suggestedNumber: string;
  defaultDate: string; // YYYY-MM-DD
  defaultSigner: string;
  /** ФИО в творительном из профиля — «Курганским Никитой» */
  defaultActName: string;
  /** Полное ФИО из профиля */
  defaultFullName: string;
  conclusionTemplate: string;
  actId?: number;
  initial?: ActInitial;
};

function emptyEquipment(): EquipmentItem {
  return { name: "", serial: "" };
}

function parseClientName(full: string): { form: string; title: string } {
  const trimmed = full.trim();
  for (const form of LEGAL_FORMS) {
    if (trimmed.startsWith(form + " ")) {
      return { form, title: trimmed.slice(form.length).trim() };
    }
  }
  return { form: "ТОО", title: trimmed };
}

export function ActForm({
  suggestedNumber,
  defaultDate,
  defaultSigner,
  defaultActName,
  defaultFullName,
  conclusionTemplate,
  actId,
  initial,
}: Props) {
  const router = useRouter();
  const [actType, setActType] = useState<ActType>(
    initial?.act_type ?? "expertise"
  );
  const [actNumber, setActNumber] = useState(
    initial?.act_number ?? suggestedNumber
  );
  const [actDate, setActDate] = useState(initial?.act_date ?? defaultDate);

  const initialClient = useMemo(
    () => parseClientName(initial?.client_name ?? ""),
    [initial?.client_name]
  );
  const [legalForm, setLegalForm] = useState(initialClient.form);
  const [clientTitle, setClientTitle] = useState(
    initial?.extra?.client_title ?? initialClient.title
  );

  const [equipment, setEquipment] = useState<EquipmentItem[]>(
    initial?.equipment?.length ? initial.equipment : [emptyEquipment()]
  );
  const [defectDesc, setDefectDesc] = useState(initial?.defect_desc ?? "");
  const [conclusion, setConclusion] = useState(initial?.conclusion ?? "");
  /** Экспертиза: «Заключение выдал» — полное ФИО, без сокращения */
  const [signerName, setSignerName] = useState(
    initial?.signer_name ?? defaultSigner
  );
  /** Утилизация: полное ФИО → сокращение на подписи */
  const [specialistName, setSpecialistName] = useState(
    initial?.extra?.specialist_full ||
      defaultFullName ||
      defaultSigner
  );
  const disposalForms = specialistForms(specialistName);

  const [headPosition, setHeadPosition] = useState(
    initial?.extra?.head_position ?? COMPANY.defaultHeadPosition
  );
  const [headName, setHeadName] = useState(
    initial?.extra?.head_name ?? COMPANY.defaultHeadName
  );
  // Утилизация: печать/подпись выкл. по умолчанию; экспертиза — вкл.
  const [showSeal, setShowSeal] = useState(
    initial?.show_seal ?? initial?.act_type !== "disposal"
  );
  const [showSignature, setShowSignature] = useState(
    initial?.show_signature ?? initial?.act_type !== "disposal"
  );
  const [busy, setBusy] = useState(false);
  const isEdit = actId !== undefined;
  const isDisposal = actType === "disposal";

  function switchType(next: ActType) {
    setActType(next);
    if (!isEdit) {
      const withMarks = next !== "disposal";
      setShowSeal(withMarks);
      setShowSignature(withMarks);
    }
  }

  function setEq(i: number, field: keyof EquipmentItem, value: string) {
    setEquipment((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const clientName = `${legalForm} ${clientTitle}`.trim();
      const f = specialistForms(specialistName || defaultFullName);
      // Текст «сервисным специалистом …» — из профиля (творительный) или авто
      const authorInText =
        defaultActName ||
        f.instrumental ||
        "";

      const res = await fetch(isEdit ? `/api/acts/${actId}` : "/api/acts", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          act_number: actNumber,
          act_date: actDate,
          client_name: clientName,
          equipment,
          defect_desc: isDisposal ? "" : defectDesc,
          conclusion: isDisposal ? "—" : conclusion,
          // Экспертиза — полное ФИО; утилизация — сокращение
          signer_name: isDisposal
            ? f.short
            : signerName.trim() || defaultSigner,
          act_type: actType,
          show_seal: showSeal,
          show_signature: showSignature,
          show_specialist: true,
          extra: {
            legal_form: legalForm,
            client_title: clientTitle,
            specialist_full: isDisposal ? f.full : "",
            author_act_name: authorInText,
            head_position: headPosition,
            head_name: headName,
            specialist_short: isDisposal ? f.short : "",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Не удалось сохранить акт");
        return;
      }
      toast.success(
        isEdit
          ? `Изменения в акте № ${actNumber} сохранены`
          : `Акт № ${actNumber} сохранён`
      );
      router.push(`/acts/${data.id}`);
      if (isEdit) router.refresh();
    } catch {
      toast.error("Сервер недоступен");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle>Тип акта</CardTitle>
          <CardDescription>
            Выберите бланк: техническая экспертиза или утилизация
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={actType === "expertise" ? "default" : "outline"}
            onClick={() => switchType("expertise")}
          >
            Тех. экспертиза
          </Button>
          <Button
            type="button"
            variant={actType === "disposal" ? "default" : "outline"}
            onClick={() => switchType("disposal")}
          >
            Утилизация
          </Button>
        </CardContent>
      </Card>

      <Card className="glass border-0">
        <CardHeader>
          <CardTitle>Реквизиты акта</CardTitle>
          <CardDescription>
            Номер предложен автоматически — при необходимости измените
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="number">Номер акта</Label>
            <Input
              id="number"
              value={actNumber}
              onChange={(e) => setActNumber(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Дата акта</Label>
            <Input
              id="date"
              type="date"
              value={actDate}
              onChange={(e) => setActDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label>Клиент (заказчик)</Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={legalForm}
                onChange={(e) => setLegalForm(e.target.value)}
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs sm:w-36"
                aria-label="Организационно-правовая форма"
              >
                {LEGAL_FORMS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <Input
                placeholder='Юридическая фирма «AEQUITAS»'
                value={clientTitle}
                onChange={(e) => setClientTitle(e.target.value)}
                required
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-0">
        <CardHeader>
          <CardTitle>Оборудование</CardTitle>
          <CardDescription>Техника — попадает в таблицу акта</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {equipment.map((row, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-black/5 p-3 sm:flex-row sm:items-end sm:border-0 sm:p-0"
            >
              <div className="flex-1 space-y-2">
                <Label className="sm:hidden">Наименование</Label>
                {i === 0 && (
                  <Label className="hidden sm:block">Наименование</Label>
                )}
                <Input
                  placeholder="Ноутбук Asus"
                  value={row.name}
                  onChange={(e) => setEq(i, "name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:w-2/5">
                <Label className="sm:hidden">Серийный / инвентарный №</Label>
                {i === 0 && (
                  <Label className="hidden sm:block">
                    Серийный / инвентарный №
                  </Label>
                )}
                <Input
                  placeholder="БК000264"
                  value={row.serial}
                  onChange={(e) => setEq(i, "serial", e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground shrink-0 self-end"
                disabled={equipment.length === 1}
                onClick={() =>
                  setEquipment((rows) => rows.filter((_, idx) => idx !== i))
                }
                aria-label="Удалить строку"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEquipment((rows) => [...rows, emptyEquipment()])}
          >
            <Plus className="size-4" />
            Добавить строку
          </Button>
        </CardContent>
      </Card>

      {!isDisposal && (
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle>Результаты экспертизы</CardTitle>
            <CardDescription>
              Оба текста попадают в раздел «Заключение» акта
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defect">Описание дефекта / состояния</Label>
              <Textarea
                id="defect"
                rows={5}
                placeholder="В ходе проведения технической экспертизы установлено, что…"
                value={defectDesc}
                onChange={(e) => setDefectDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="conclusion">Заключение</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-7"
                  onClick={() => setConclusion(conclusionTemplate)}
                >
                  Вставить шаблон
                </Button>
              </div>
              <Textarea
                id="conclusion"
                rows={7}
                placeholder="С учетом технического устаревания оборудования…"
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:max-w-xs">
              <Label htmlFor="signer">Заключение выдал</Label>
              <Input
                id="signer"
                placeholder="Василенко Константин"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>
      )}

      {isDisposal && (
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle>Подписи</CardTitle>
            <CardDescription>
              Специалист сокращается автоматически; руководитель — Лаура Н. по
              умолчанию
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="head-pos">Должность руководителя</Label>
              <Input
                id="head-pos"
                placeholder="Руководитель СЕЦ"
                value={headPosition}
                onChange={(e) => setHeadPosition(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="head-name">ФИО руководителя (сокр.)</Label>
              <Input
                id="head-name"
                placeholder="Лаура Н."
                value={headName}
                onChange={(e) => setHeadName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialist">Специалист</Label>
              <Input
                id="specialist"
                placeholder="Василенко Константин"
                value={specialistName}
                onChange={(e) => setSpecialistName(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                На бланке: {disposalForms.short || "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass border-0">
        <CardHeader>
          <CardTitle>Печать и подпись</CardTitle>
          <CardDescription>
            {isDisposal
              ? "У утилизации по умолчанию выключены — включите галочками при необходимости"
              : "Снимите галочку, если элемент не нужен на бланке"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--brand)]"
              checked={showSeal}
              onChange={(e) => setShowSeal(e.target.checked)}
            />
            Печать
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--brand)]"
              checked={showSignature}
              onChange={(e) => setShowSignature(e.target.checked)}
            />
            Подпись
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={busy}>
          <FileText className="size-4" />
          {busy
            ? "Сохраняем…"
            : isEdit
              ? "Сохранить изменения"
              : "Сформировать акт"}
        </Button>
      </div>
    </form>
  );
}
