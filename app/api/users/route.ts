import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  let body: {
    login?: string;
    password?: string;
    full_name?: string;
    act_name?: string;
    role?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const login = (body.login || "").trim().toLowerCase();
  const password = body.password || "";
  const fullName = (body.full_name || "").trim();
  const actName = (body.act_name || "").trim();
  const role = body.role === "admin" ? "admin" : "specialist";

  if (!/^[a-z0-9._-]{3,32}$/.test(login)) {
    return NextResponse.json(
      { error: "Логин: 3–32 символа, латиница/цифры/._-" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Пароль минимум 8 символов" },
      { status: 400 }
    );
  }
  if (!fullName) {
    return NextResponse.json({ error: "Укажите ФИО" }, { status: 400 });
  }

  try {
    const result = getDb()
      .prepare(
        "INSERT INTO users (login, password_hash, full_name, act_name, role) VALUES (?, ?, ?, ?, ?)"
      )
      .run(login, bcrypt.hashSync(password, 10), fullName, actName, role);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("UNIQUE")) {
      return NextResponse.json(
        { error: `Логин «${login}» уже занят` },
        { status: 409 }
      );
    }
    console.error("users POST:", e);
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  let body: {
    id?: number;
    is_active?: boolean;
    password?: string;
    login?: string;
    full_name?: string;
    act_name?: string;
    role?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }
  if (id === admin.uid && body.is_active === false) {
    return NextResponse.json(
      { error: "Нельзя деактивировать самого себя" },
      { status: 400 }
    );
  }
  if (id === admin.uid && body.role === "specialist") {
    return NextResponse.json(
      { error: "Нельзя снять роль администратора с самого себя" },
      { status: 400 }
    );
  }

  const db = getDb();
  if (typeof body.is_active === "boolean") {
    db.prepare("UPDATE users SET is_active = ? WHERE id = ?").run(
      body.is_active ? 1 : 0,
      id
    );
  }
  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Пароль минимум 8 символов" },
        { status: 400 }
      );
    }
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      bcrypt.hashSync(body.password, 10),
      id
    );
  }
  if (body.login !== undefined) {
    const login = body.login.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(login)) {
      return NextResponse.json(
        { error: "Логин: 3–32 символа, латиница/цифры/._-" },
        { status: 400 }
      );
    }
    try {
      db.prepare("UPDATE users SET login = ? WHERE id = ?").run(login, id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("UNIQUE")) {
        return NextResponse.json(
          { error: `Логин «${login}» уже занят` },
          { status: 409 }
        );
      }
      throw e;
    }
  }
  if (body.full_name !== undefined) {
    const fullName = body.full_name.trim();
    if (!fullName) {
      return NextResponse.json({ error: "Укажите ФИО" }, { status: 400 });
    }
    db.prepare("UPDATE users SET full_name = ? WHERE id = ?").run(fullName, id);
  }
  if (body.act_name !== undefined) {
    db.prepare("UPDATE users SET act_name = ? WHERE id = ?").run(
      body.act_name.trim(),
      id
    );
  }
  if (body.role === "admin" || body.role === "specialist") {
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(body.role, id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  let body: { id?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }
  if (id === admin.uid) {
    return NextResponse.json(
      { error: "Нельзя удалить самого себя" },
      { status: 400 }
    );
  }

  const db = getDb();
  const actsCount = (
    db
      .prepare("SELECT COUNT(*) AS c FROM acts WHERE created_by = ?")
      .get(id) as { c: number }
  ).c;
  if (actsCount > 0) {
    return NextResponse.json(
      {
        error: `У сотрудника ${actsCount} акт(ов) — удалить нельзя, иначе потеряется история. Используйте «Отключить».`,
      },
      { status: 400 }
    );
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
