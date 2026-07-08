import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getDb, type ActRow, type EquipmentItem } from "@/lib/db";
import { fmtDate, fmtTimestamp } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  author?: string;
  from?: string;
  to?: string;
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, author, from, to } = await searchParams;
  const user = await getSessionUser();
  const isAdmin = user?.role === "admin";
  const db = getDb();

  const conditions: string[] = [];
  const args: (string | number)[] = [];
  if (!isAdmin) {
    // Обычный пользователь видит только свои акты
    conditions.push("acts.created_by = ?");
    args.push(user!.uid);
  } else if (author && Number(author)) {
    conditions.push("acts.created_by = ?");
    args.push(Number(author));
  }
  if (q) {
    conditions.push("(acts.client_name LIKE ? OR acts.act_number LIKE ?)");
    args.push(`%${q}%`, `%${q}%`);
  }
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    conditions.push("acts.act_date >= ?");
    args.push(from);
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    conditions.push("acts.act_date <= ?");
    args.push(to);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const acts = db
    .prepare(
      `SELECT acts.*, users.full_name AS author_name
       FROM acts JOIN users ON users.id = acts.created_by
       ${where}
       ORDER BY acts.id DESC
       LIMIT 500`
    )
    .all(...args) as ActRow[];

  const authors = isAdmin
    ? (db
        .prepare(
          `SELECT DISTINCT users.id, users.full_name
           FROM acts JOIN users ON users.id = acts.created_by
           ORDER BY users.full_name`
        )
        .all() as { id: number; full_name: string }[])
    : [];

  function equipmentSummary(json: string): string {
    try {
      const items = JSON.parse(json) as EquipmentItem[];
      const names = items.map((i) => i.name).join(", ");
      return names.length > 60 ? names.slice(0, 57) + "…" : names;
    } catch {
      return "—";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAdmin ? "История актов" : "Мои акты"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Всего показано: {acts.length}
          </p>
        </div>
      </div>

      <Card className="glass border-0">
        <CardContent className="pt-6">
          <form
            className={`grid gap-3 ${
              isAdmin
                ? "sm:grid-cols-[1fr_auto_auto_auto_auto]"
                : "sm:grid-cols-[1fr_auto_auto_auto]"
            }`}
          >
            <Input
              name="q"
              placeholder="Поиск: клиент или № акта"
              defaultValue={q || ""}
            />
            {isAdmin && (
              <select
                name="author"
                defaultValue={author || ""}
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
              >
                <option value="">Все сотрудники</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}
                  </option>
                ))}
              </select>
            )}
            <Input name="from" type="date" defaultValue={from || ""} />
            <Input name="to" type="date" defaultValue={to || ""} />
            <Button type="submit" variant="secondary">
              <Search className="size-4" />
              Найти
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass overflow-x-auto border-0">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>№ акта</TableHead>
              <TableHead>Дата акта</TableHead>
              <TableHead>Клиент</TableHead>
              <TableHead className="hidden md:table-cell">
                Оборудование
              </TableHead>
              <TableHead>Составил(а)</TableHead>
              <TableHead className="hidden sm:table-cell">Создан</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {acts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-10 text-center"
                >
                  Актов пока нет
                </TableCell>
              </TableRow>
            )}
            {acts.map((act) => (
              <TableRow key={act.id} className="relative">
                <TableCell className="font-medium">
                  <Link
                    href={`/acts/${act.id}`}
                    className="after:absolute after:inset-0"
                  >
                    {act.act_number}
                  </Link>
                </TableCell>
                <TableCell>{fmtDate(act.act_date)}</TableCell>
                <TableCell>{act.client_name}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {equipmentSummary(act.equipment)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{act.author_name}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell">
                  {fmtTimestamp(act.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
