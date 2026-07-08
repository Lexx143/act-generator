import { cookies } from "next/headers";
import { getDb, type UserRow } from "@/lib/db";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/session";

/** Проверяет cookie-сессию и что пользователь всё ещё существует и активен. */
export async function getSessionUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(session.uid) as UserRow | undefined;
  if (!user || !user.is_active) return null;
  return {
    uid: user.id,
    login: user.login,
    name: user.full_name,
    role: user.role,
  };
}
