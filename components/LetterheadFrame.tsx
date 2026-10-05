"use client";

import type { ReactNode } from "react";

/** Простая оболочка: короткий акт — подписи внизу листа; длинный — продолжение на след. странице без пустот. */
export function LetterheadFrame({
  body,
  footer,
}: {
  body: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="letterhead relative">
      <div className="letterhead-body">{body}</div>
      <div className="letterhead-footer">{footer}</div>
    </div>
  );
}
