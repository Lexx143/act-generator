import { getSessionUser } from "@/lib/auth";
import { getDb, nextActNumber, type UserRow } from "@/lib/db";
import { todayIso } from "@/lib/format";
import { CONCLUSION_TEMPLATE } from "@/lib/company";
import { ActForm } from "@/components/ActForm";

export const dynamic = "force-dynamic";

export default async function NewActPage() {
  const user = await getSessionUser();
  const dbUser = user
    ? (getDb()
        .prepare("SELECT act_name, full_name FROM users WHERE id = ?")
        .get(user.uid) as Pick<UserRow, "act_name" | "full_name"> | undefined)
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Новый акт</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Акт составляет: {user?.name}
        </p>
      </div>
      <ActForm
        suggestedNumber={nextActNumber()}
        defaultDate={todayIso()}
        defaultSigner={user?.name ?? ""}
        defaultActName={dbUser?.act_name || ""}
        defaultFullName={dbUser?.full_name || user?.name || ""}
        conclusionTemplate={CONCLUSION_TEMPLATE}
      />
    </div>
  );
}
