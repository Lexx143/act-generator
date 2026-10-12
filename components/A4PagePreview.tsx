"use client";

import { type ReactNode } from "react";
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
  const layout = useLetterheadLayout();
  const pageCount = Math.max(1, layout?.ready ? layout.pageCount : 1);
  const pagePx = layout?.flowPx && pageCount ? layout.flowPx / pageCount : 0;
  const sheets: Sheet[] = [];
  for (let i = 0; i < pageCount; i++) {
    sheets.push({ key: `p-${i}`, offsetPx: pagePx * i });
  }
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

      <div className="a4-host">
        {/* Эталон: считает раскладку, при печати виден */}
        <div className="a4-host-source">{children}</div>

        {/* Те же листы на экране и в PDF: клип, без повторной вёрстки при печати */}
        <div
          className="a4-preview-stack"
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
