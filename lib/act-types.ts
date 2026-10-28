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

/** Похоже на фамилию (в т.ч. -енко/-ов/-ский…) */
function isSurnameLike(s: string): boolean {
  return /(енко|ченко|цко|ко|ук|юк|их|ых|ов|ев|ёв|ин|ын|ский|цкий|ская|цкая|ой)$/i.test(
    s
  );
}

function initialOf(s: string): string {
  return `${s.charAt(0).toUpperCase()}.`;
}

/** Берём самое полное ФИО из кандидатов (больше слов = лучше для «И. О.»). */
export function pickFullestName(...candidates: Array<string | undefined | null>): string {
  return (
    candidates
      .map((n) => (n || "").trim().replace(/\s+/g, " "))
      .filter(Boolean)
      .sort((a, b) => b.split(" ").length - a.split(" ").length)[0] || ""
  );
}

/**
 * Сокращение для подписи: всегда «Фамилия И.» / «Фамилия И. О.»
 * «Шелестенко Никита Сергеевич» → «Шелестенко Н. С.»
 * «Никита Шелестенко» → «Шелестенко Н.»
 * «Золотько Александр Иванович» → «Золотько А. И.»
 * Уже «Шелестенко Н. С.» / «Шелестенко Н.» — оставляем.
 */
export function shortNameFromFull(full: string): string {
  const trimmed = full.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  // Уже «Фамилия И.» или «Фамилия И. О.»
  if (
    /^[A-Za-zА-ЯЁа-яё-]+\s+[A-Za-zА-ЯЁа-яё]\.(\s+[A-Za-zА-ЯЁа-яё]\.)?$/u.test(
      trimmed
    )
  ) {
    return trimmed;
  }

  const parts = trimmed.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0];

  let last = "";
  let first = "";
  let patronymic = "";

  if (parts.length >= 3) {
    // Фамилия Имя Отчество  ИЛИ  Имя Отчество Фамилия  ИЛИ  Имя Фамилия Отчество
    if (isSurnameLike(parts[0]) && !isSurnameLike(parts[1])) {
      last = parts[0];
      first = parts[1];
      patronymic = parts[2];
    } else if (isSurnameLike(parts[2])) {
      // Имя [Отчество] Фамилия
      first = parts[0];
      patronymic = parts.length > 3 || isSurnameLike(parts[1]) ? "" : parts[1];
      if (isSurnameLike(parts[1])) {
        last = parts[1];
        patronymic = parts[2];
      } else {
        last = parts[2];
        patronymic = parts[1];
      }
    } else {
      last = parts[0];
      first = parts[1];
      patronymic = parts[2];
    }
  } else {
    // 2 слова: Фамилия Имя  или  Имя Фамилия
    if (!isSurnameLike(parts[0]) && isSurnameLike(parts[1])) {
      first = parts[0];
      last = parts[1];
    } else {
      last = parts[0];
      first = parts[1];
    }
  }

  if (!last) return trimmed;
  if (!first) return last;
  if (patronymic) {
    return `${last} ${initialOf(first)} ${initialOf(patronymic)}`;
  }
  return `${last} ${initialOf(first)}`;
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

/** Несклоняемые/типичные фамилии на -енко/-ко/-ук… */
function isIndeclinableSurname(s: string): boolean {
  return /(енко|ченко|цко|ко|ук|юк|их|ых)$/i.test(s);
}

/**
 * «Курганский Никита» → «Курганским Никитой»
 * «Василенко Константин» → «Василенко Константином»
 * «Александр Золотько» → «Александром Золотько» (Имя + несклоняемая фамилия)
 */
export function toInstrumentalName(full: string): string {
  const trimmed = full.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const parts = trimmed.split(" ").filter(Boolean);
  if (parts.length === 1) return surnameToInstrumental(parts[0]);
  // Уже сокращённое «Василенко К.» — не склоняем
  if (/^[A-Za-zА-ЯЁа-яё]\.$/u.test(parts[1])) return trimmed;

  // Имя Фамилия, когда фамилия несклоняемая: «Александр Золотько»
  if (!isIndeclinableSurname(parts[0]) && isIndeclinableSurname(parts[1])) {
    return [firstNameToInstrumental(parts[0]), parts[1], ...parts.slice(2)].join(
      " "
    );
  }

  // Фамилия Имя (основной порядок)
  const last = surnameToInstrumental(parts[0]);
  const first = firstNameToInstrumental(parts[1]);
  return [last, first, ...parts.slice(2)].join(" ");
}

/**
 * Для фразы «акт составлен …»: если уже творительный — не трогаем,
 * иначе склоняем. «Александр Золотько» → «Александром Золотько».
 */
export function ensureInstrumentalName(full: string): string {
  const trimmed = full.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const parts = trimmed.split(" ").filter(Boolean);
  // Уже есть слово в творительном (Александром / Курганским / Никитой …)
  if (parts.some((p) => /(ом|ем|ым|им|ой|ей)$/i.test(p))) return trimmed;
  return toInstrumentalName(trimmed);
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
