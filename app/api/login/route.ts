import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, type UserRow } from "@/lib/db";
import { SESSION_COOKIE, SESSION_HOURS, signSession } from "@/lib/session";

// Троттлинг: 5 неудачных попыток с IP → блок на 10 минут.
const attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  const entry = attempts.get(ip);
  if (entry && entry.lockedUntil > Date.now()) {
    return NextResponse.json(
      { error: "Слишком много попыток. Повторите через 10 минут." },
      { status: 429 }
    );
  }

  let body: { login?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const login = (body.login || "").trim().toLowerCase();
  const password = body.password || "";
  if (!login || !password) {
    return NextResponse.json(
      { error: "Введите логин и пароль" },
      { status: 400 }
    );
  }

  const user = getDb()
    .prepare("SELECT * FROM users WHERE login = ?")
    .get(login) as UserRow | undefined;

  const ok =
    user && user.is_active === 1 && bcrypt.compareSync(password, user.password_hash);

  if (!ok) {
    const cur = attempts.get(ip) ?? { count: 0, lockedUntil: 0 };
    cur.count += 1;
    if (cur.count >= MAX_ATTEMPTS) {
      cur.lockedUntil = Date.now() + LOCK_MS;
      cur.count = 0;
    }
    attempts.set(ip, cur);
    return NextResponse.json(
      { error: "Неверный логин или пароль" },
      { status: 401 }
    );
  }

  attempts.delete(ip);
  const token = await signSession({
    uid: user.id,
    login: user.login,
    name: user.full_name,
    role: user.role,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
