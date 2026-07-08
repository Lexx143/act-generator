/** ISO-дата (YYYY-MM-DD) → «DD.MM.YYYY» */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

/** UTC-таймстемп SQLite («YYYY-MM-DD HH:MM:SS») → локальное время Алматы */
export function fmtTimestamp(utc: string): string {
  const date = new Date(utc.replace(" ", "T") + "Z");
  return date.toLocaleString("ru-RU", {
    timeZone: "Asia/Almaty",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Сегодняшняя дата в Алматы в формате YYYY-MM-DD (для <input type=date>) */
export function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Almaty" });
}
