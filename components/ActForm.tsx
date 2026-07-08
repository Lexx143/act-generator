"use client";

import { useState } from "react";
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
import type { EquipmentItem } from "@/lib/db";

type ActInitial = {
  act_number: string;
  act_date: string;
  client_name: string;
  equipment: EquipmentItem[];
  defect_desc: string;
  conclusion: string;
  signer_name: string;
};

type Props = {
  suggestedNumber: string;
  defaultDate: string; // YYYY-MM-DD
  defaultSigner: string;
  conclusionTemplate: string;
  /** Режим редактирования: id акта и его текущие значения */
  actId?: number;
  initial?: ActInitial;
};

export function ActForm({
  suggestedNumber,
  defaultDate,
  defaultSigner,
  conclusionTemplate,
  actId,
  initial,
}: Props) {
  const router = useRouter();
  const [actNumber, setActNumber] = useState(
    initial?.act_number ?? suggestedNumber
  );
  const [actDate, setActDate] = useState(initial?.act_date ?? defaultDate);
  const [clientName, setClientName] = useState(initial?.client_name ?? "");
  const [equipment, setEquipment] = useState<EquipmentItem[]>(
    initial?.equipment?.length ? initial.equipment : [{ name: "", serial: "" }]
  );
  const [defectDesc, setDefectDesc] = useState(initial?.defect_desc ?? "");
  const [conclusion, setConclusion] = useState(initial?.conclusion ?? "");
  const [signerName, setSignerName] = useState(
    initial?.signer_name ?? defaultSigner
  );
  const [busy, setBusy] = useState(false);
  const isEdit = actId !== undefined;

  function setEq(i: number, field: keyof EquipmentItem, value: string) {
    setEquipment((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(isEdit ? `/api/acts/${actId}` : "/api/acts", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          act_number: actNumber,
          act_date: actDate,
          client_name: clientName,
          equipment,
          defect_desc: defectDesc,
          conclusion,
          signer_name: signerName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Не удалось сохранить акт");
        return;
      }
      toast.success(
        isEdit ? `Изменения в акте № ${actNumber} сохранены` : `Акт № ${actNumber} сохранён`
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
          <div className="space-y-2">
            <Label htmlFor="client">Клиент (заказчик)</Label>
            <Input
              id="client"
              placeholder="ТОО «SHENBER LINK»"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-0">
        <CardHeader>
          <CardTitle>Оборудование</CardTitle>
          <CardDescription>
            Техника, прошедшая осмотр — попадает в таблицу акта
          </CardDescription>
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
            onClick={() =>
              setEquipment((rows) => [...rows, { name: "", serial: "" }])
            }
          >
            <Plus className="size-4" />
            Добавить строку
          </Button>
        </CardContent>
      </Card>

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
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              required
            />
          </div>
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
