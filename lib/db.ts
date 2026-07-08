import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  login         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  act_name      TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'specialist' CHECK (role IN ('admin','specialist')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS acts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  act_number    TEXT NOT NULL UNIQUE,
  act_date      TEXT NOT NULL,
  client_name   TEXT NOT NULL,
  equipment     TEXT NOT NULL,
  defect_desc   TEXT NOT NULL DEFAULT '',
  conclusion    TEXT NOT NULL,
  signer_name   TEXT NOT NULL,
  created_by    INTEGER NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_acts_created_by ON acts(created_by);
CREATE INDEX IF NOT EXISTS idx_acts_created_at ON acts(created_at);
`;

export type UserRow = {
  id: number;
  login: string;
  password_hash: string;
  full_name: string;
  act_name: string;
  role: "admin" | "specialist";
  is_active: number;
  created_at: string;
};

export type ActRow = {
  id: number;
  act_number: string;
  act_date: string;
  client_name: string;
  equipment: string;
  defect_desc: string;
  conclusion: string;
  signer_name: string;
  created_by: number;
  created_at: string;
  updated_at: string | null;
  author_name?: string;
};

export type EquipmentItem = { name: string; serial: string };

declare global {
  // eslint-disable-next-line no-var
  var __defectActsDb: Database.Database | undefined;
}

function seedAdminIfEmpty(db: Database.Database) {
  const count = (
    db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }
  ).c;
  if (count > 0) return;
  const password =
    process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(6).toString("hex");
  db.prepare(
    "INSERT INTO users (login, password_hash, full_name, role) VALUES (?, ?, ?, 'admin')"
  ).run("admin", bcrypt.hashSync(password, 10), "Администратор");
  // Пароль печатается один раз при первом старте — далее сменить через админку.
  console.log("=".repeat(60));
  console.log(`Создан пользователь admin, пароль: ${password}`);
  console.log("=".repeat(60));
}

export function getDb(): Database.Database {
  if (global.__defectActsDb) return global.__defectActsDb;
  const dbPath =
    process.env.DB_PATH || path.join(process.cwd(), "data", "acts.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  // Миграции для БД, созданных ранними версиями
  const userCols = db.prepare("PRAGMA table_info(users)").all() as {
    name: string;
  }[];
  if (!userCols.some((c) => c.name === "act_name")) {
    db.exec("ALTER TABLE users ADD COLUMN act_name TEXT NOT NULL DEFAULT ''");
  }
  const actCols = db.prepare("PRAGMA table_info(acts)").all() as {
    name: string;
  }[];
  if (!actCols.some((c) => c.name === "updated_at")) {
    db.exec("ALTER TABLE acts ADD COLUMN updated_at TEXT");
  }
  seedAdminIfEmpty(db);
  global.__defectActsDb = db;
  return db;
}

export function nextActNumber(): string {
  const db = getDb();
  const row = db
    .prepare("SELECT COALESCE(MAX(id), 0) + 1 AS n FROM acts")
    .get() as { n: number };
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${String(row.n).padStart(4, "0")}-${mm}/${now.getFullYear()}`;
}
