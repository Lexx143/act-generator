"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

function sheetsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "лист";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "листа";
  return "листов";
}

/**
 * Предпросмотр как на бумаге A4: отдельные листы, номер страницы, сколько листов будет в PDF.
 */
export function A4PagePreview({ children }: { children: ReactNode }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);

  const recalc = useCallback(() => {
    const root = measureRef.current;
    if (!root) return;
    const letterhead = root.querySelector(".letterhead") as HTMLElement | null;
    if (!letterhead) return;

    const probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;height:297mm;width:0;";
    letterhead.appendChild(probe);
    const pageH = probe.offsetHeight;
    letterhead.removeChild(probe);
    if (!pageH) return;

    const h = letterhead.scrollHeight || letterhead.offsetHeight;
    const n = Math.max(1, Math.ceil(h / pageH - 0.001));
    setPageCount(n);
  }, []);

  useLayoutEffect(() => {
    recalc();
    const root = measureRef.current;
    if (!root) return;
    const letterhead = root.querySelector(".letterhead");
    const ro = new ResizeObserver(() => recalc());
    if (letterhead) ro.observe(letterhead);
    window.addEventListener("resize", recalc);
    const imgs = root.querySelectorAll("img");
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", recalc);
    });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, [recalc]);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-muted-foreground text-sm">
          Предпросмотр печати A4:{" "}
          <span className="text-foreground font-semibold">
            {pageCount} {sheetsWord(pageCount)}
          </span>
          {" — "}
          так будет в PDF
        </p>
      </div>

      {/* Невидимый эталон для замера высоты (без zoom/клипов) */}
      <div
        ref={measureRef}
        className="no-print a4-measure"
        aria-hidden
      >
        {children}
      </div>

      {/* Экран: стопка листов A4 */}
      <div className="no-print a4-preview-stack">
        {Array.from({ length: pageCount }, (_, i) => (
          <div key={i} className="a4-sheet">
            <div className="a4-sheet-clip">
              <div
                className="a4-sheet-shift"
                style={{ marginTop: i === 0 ? 0 : `-${i * 297}mm` }}
              >
                {children}
              </div>
            </div>
            <div className="a4-sheet-label">
              Лист {i + 1} из {pageCount}
            </div>
          </div>
        ))}
      </div>

      {/* Печать: один непрерывный бланк */}
      <div className="a4-print-source">{children}</div>
    </div>
  );
}
