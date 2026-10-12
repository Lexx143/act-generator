"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  LetterheadLayoutProvider,
  useLetterheadLayout,
} from "@/components/LetterheadFrame";

function sheetsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "лист";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "листа";
  return "листов";
}

type Sheet = {
  key: string;
  offsetPx: number;
};

function PreviewInner({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layout = useLetterheadLayout();
  const [sheets, setSheets] = useState<Sheet[]>([{ key: "0", offsetPx: 0 }]);

  const recalcSheets = useCallback(() => {
    const count = Math.max(1, layout?.ready ? layout.pageCount : 1);
    const pagePx =
      layout?.flowPx && count ? layout.flowPx / count : 0;
    const next: Sheet[] = [];
    for (let i = 0; i < count; i++) {
      next.push({ key: `p-${i}`, offsetPx: pagePx * i });
    }
    setSheets((prev) => {
      if (
        prev.length === next.length &&
        prev.every((s, i) => s.key === next[i].key && s.offsetPx === next[i].offsetPx)
      ) {
        return prev;
      }
      return next;
    });
  }, [layout]);

  useLayoutEffect(() => {
    recalcSheets();
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(() => recalcSheets());
    ro.observe(host);
    const pages = host.querySelector(".letterhead-pages");
    if (pages) {
      ro.observe(pages);
      pages.querySelectorAll(".letterhead").forEach((el) => ro.observe(el));
    }
    window.addEventListener("resize", recalcSheets);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalcSheets);
    };
  }, [recalcSheets, children]);

  const pageCount = sheets.length;
  const pending = !layout?.ready;

  return (
    <div className="space-y-4">
      <div
        className="no-print flex flex-wrap items-center justify-between gap-2 px-1"
        style={pending ? { visibility: "hidden" } : undefined}
      >
        <p className="text-muted-foreground text-sm">
          Предпросмотр печати A4:{" "}
          <span className="text-foreground font-semibold">
            {pageCount} {sheetsWord(pageCount)}
          </span>
          {" — "}
          так будет в PDF
        </p>
      </div>

      <div ref={hostRef} className="a4-host">
        {/* Эталон: считает раскладку, при печати виден */}
        <div className="a4-host-source">{children}</div>

        {/* Экран: листы клипуют клоны, раскладка из Context */}
        <div
          className="no-print a4-preview-stack"
          style={pending ? { visibility: "hidden" } : undefined}
        >
          {sheets.map((sheet, i) => (
            <div key={sheet.key} className="a4-sheet">
              <div className="a4-sheet-clip">
                <div
                  className="a4-sheet-shift a4-sheet-shift--flow"
                  style={
                    sheet.offsetPx
                      ? { marginTop: `-${sheet.offsetPx}px` }
                      : undefined
                  }
                >
                  <div className="a4-sheet-clone">{children}</div>
                </div>
              </div>
              <div className="a4-sheet-label">
                Лист {i + 1} из {pageCount}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function A4PagePreview({ children }: { children: ReactNode }) {
  return (
    <LetterheadLayoutProvider>
      <PreviewInner>{children}</PreviewInner>
    </LetterheadLayoutProvider>
  );
}
