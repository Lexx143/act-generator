export type ActType = "expertise" | "disposal";

export type ActExtra = {
  legal_form?: string;
  client_title?: string;
  /** Полное ФИО специалиста — «Василенко Константин» */
  specialist_full?: string;
  /** ФИО специалиста в творительном падеже — «Курганским Никитой» */
  author_act_name?: string;
  head_position?: string;
  head_name?: string;
  specialist_short?: string;
};

export type EquipmentItem = {
  name: string;
  serial: string;
  barcode?: string;
  inventory?: string;
};

/**
 * «Василенко Константин» → «Василенко К.»
 * Уже сокращённое («Василенко К.» / «Лаура Н.») оставляем как есть.
 */
export function shortNameFromFull(full: string): string {
  const trimmed = full.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  // Уже вида «Фамилия И.» или «Имя Ф.»
  if (/^.+\s+[A-Za-zА-ЯЁа-яё]\.$/u.test(trimmed)) return trimmed;
  const parts = trimmed.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0];
  // Фамилия Имя [Отчество] → Фамилия И.
  const last = parts[0];
  const first = parts[1];
  return `${last} ${first.charAt(0).toUpperCase()}.`;
}

/** Фамилия → творительный падеж (мужской, эвристика) */
function surnameToInstrumental(s: string): string {
  const lower = s.toLowerCase();
  // Украинские/несклоняемые: -енко, -ко, -ук, -юк, -их, -ых
  if (/(енко|ченко|цко|ко|ук|юк|их|ых)$/i.test(lower)) return s;
  if (/(ский|цкий)$/i.test(s)) return s.slice(0, -2) + "им";
  if (/(ской|цкой)$/i.test(s)) return s.slice(0, -2) + "им";
  if (/(ый|ий)$/i.test(s)) return s.slice(0, -2) + "ым";
  if (/ой$/i.test(s)) return s.slice(0, -2) + "ым";
  if (/(ов|ев|ёв|ин|ын)$/i.test(s)) return s + "ым";
  if (/а$/i.test(s)) return s.slice(0, -1) + "ой";
  if (/я$/i.test(s)) return s.slice(0, -1) + "ей";
  return s;
}

/** Имя → творительный падеж (эвристика) */
function firstNameToInstrumental(s: string): string {
  // Уже сокращение «К.»
  if (/^[A-Za-zА-ЯЁа-яё]\.$/u.test(s)) return s;
  if (/а$/i.test(s)) return s.slice(0, -1) + "ой"; // Никита→Никитой, Лаура→Лаурой
  if (/я$/i.test(s)) return s.slice(0, -1) + "ей"; // Илья→Ильей
  if (/й$/i.test(s)) return s.slice(0, -1) + "ем"; // Андрей→Андреем
  if (/ь$/i.test(s)) return s.slice(0, -1) + "ем"; // Игорь→Игорем
  // Константин → Константином
  return s + "ом";
}

/**
 * «Курганский Никита» → «Курганским Никитой»
 * «Василенко Константин» → «Василенко Константином»
 * Уже в творительном (заканчивается на -ым/-им/-ой и т.п. и второе слово тоже) — как есть.
 */
export function toInstrumentalName(full: string): string {
  const trimmed = full.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const parts = trimmed.split(" ").filter(Boolean);
  if (parts.length === 1) return surnameToInstrumental(parts[0]);
  // Уже сокращённое «Василенко К.» — не склоняем
  if (/^[A-Za-zА-ЯЁа-яё]\.$/u.test(parts[1])) return trimmed;
  const last = surnameToInstrumental(parts[0]);
  const first = firstNameToInstrumental(parts[1]);
  return [last, first, ...parts.slice(2)].join(" ");
}

/** Полное ФИО → формы для бланка */
export function specialistForms(full: string): {
  full: string;
  instrumental: string;
  short: string;
} {
  const fullName = full.trim().replace(/\s+/g, " ");
  return {
    full: fullName,
    instrumental: toInstrumentalName(fullName),
    short: shortNameFromFull(fullName),
  };
}

export function parseActExtra(raw: string | null | undefined): ActExtra {
  try {
    return JSON.parse(raw || "{}") as ActExtra;
  } catch {
    return {};
  }
}
