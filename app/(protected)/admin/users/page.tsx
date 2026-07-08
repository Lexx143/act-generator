import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { UsersAdmin, type UserItem } from "@/components/UsersAdmin";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/");

  const users = getDb()
    .prepare(
      `SELECT users.id, users.login, users.full_name, users.act_name, users.role, users.is_active,
              COUNT(acts.id) AS acts_count
       FROM users LEFT JOIN acts ON acts.created_by = users.id
       GROUP BY users.id
       ORDER BY users.id`
    )
    .all() as UserItem[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Сотрудники</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Доступ к генератору актов
        </p>
      </div>
      <UsersAdmin users={users} selfId={user.uid} />
    </div>
  );
}
