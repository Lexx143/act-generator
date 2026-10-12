"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type LayoutState = {
  pageCount: number;
  gapPx: number;
  flowPx: number;
  /** Сдвиг абзаца на верх последнего листа, если иначе подпись остаётся одна. */
  closingShiftPx: number;
  /** Пустота над подписью, чтобы она встала в низ последнего листа. */
  footerGapPx: number;
  ready: boolean;
};

type LayoutApi = LayoutState & {
  setLayout: (next: Omit<LayoutState, "ready">) => void;
};

const LetterheadLayoutContext = createContext<LayoutApi | null>(null);

const defaultLayout: LayoutState = {
  pageCount: 1,
  gapPx: 0,
  flowPx: 0,
  closingShiftPx: 0,
  footerGapPx: 0,
  ready: false,
};

/** Допуск на субпиксели, чтобы не появлялся пустой лист. */
const OVERFLOW_PX = 2;

export function LetterheadLayoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [layout, setLayoutState] = useState<LayoutState>(defaultLayout);
  const setLayout = useCallback((next: Omit<LayoutState, "ready">) => {
    setLayoutState((prev) => {
      if (
        prev.pageCount === next.pageCount &&
        prev.gapPx === next.gapPx &&
        prev.flowPx === next.flowPx &&
        prev.closingShiftPx === next.closingShiftPx &&
        prev.footerGapPx === next.footerGapPx &&
        prev.ready
      ) {
        return prev;
      }
      return { ...next, ready: true };
    });
  }, []);

  const value = useMemo(
    () => ({ ...layout, setLayout }),
    [layout, setLayout],
  );

  return (
    <LetterheadLayoutContext.Provider value={value}>
      {children}
    </LetterheadLayoutContext.Provider>
  );
}

export function useLetterheadLayout() {
  return useContext(LetterheadLayoutContext);
}

type Props = {
  main: ReactNode;
  closingText?: ReactNode;
  footer: ReactNode;
};

function pageHeightPx(host: HTMLElement): number {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;height:297mm;width:0;";
  host.appendChild(probe);
  const pageH = probe.offsetHeight;
  host.removeChild(probe);
  return pageH;
}

/**
 * Шапка и таблица идут сверху. Абзац («Подтверждается» / «Заключение»)
 * продолжается сразу за таблицей. Если на последнем листе осталась бы
 * только подпись, абзац целиком переносится на верх этого листа.
 * Подпись («От ТОО» / «Заключение выдал») всегда внизу последнего листа.
 */
export function LetterheadFrame({ main, closingText, footer }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const layoutCtx = useLetterheadLayout();

  const [local, setLocal] = useState({
    pageCount: 1,
    gapPx: 0,
    flowPx: 0,
    closingShiftPx: 0,
    footerGapPx: 0,
  });

  const pageCount = Math.max(
    1,
    layoutCtx?.ready ? layoutCtx.pageCount : local.pageCount,
  );
  const closingShiftPx = layoutCtx?.ready
    ? layoutCtx.closingShiftPx
    : local.closingShiftPx;
  const footerGapPx = layoutCtx?.ready
    ? layoutCtx.footerGapPx
    : local.footerGapPx;

  const applyLayout = useCallback(
    (next: {
      pageCount: number;
      gapPx: number;
      flowPx: number;
      closingShiftPx: number;
      footerGapPx: number;
    }) => {
      if (layoutCtx) layoutCtx.setLayout(next);
      else setLocal(next);
    },
    [layoutCtx],
  );

  const recalc = useCallback(() => {
    const root = rootRef.current;
    const mainEl = mainRef.current;
    const footerEl = footerRef.current;
    if (!root || !mainEl || !footerEl) return;
    if (root.closest(".a4-sheet-clone") || root.closest(".a4-sheet-shift")) {
      return;
    }

    const pageH = pageHeightPx(root);
    if (!pageH) return;

    const mainH = mainEl.offsetHeight;
    const footerH = footerEl.offsetHeight;
    const closingEl = closingRef.current;
    const shiftNow = closingEl
      ? parseFloat(getComputedStyle(closingEl).paddingTop) || 0
      : 0;
    const closingH = closingEl
      ? Math.max(0, closingEl.offsetHeight - shiftNow)
      : 0;
    const sheet = root.querySelector(".letterhead") as HTMLElement | null;
    const style = getComputedStyle(sheet ?? root);
    const padTop = parseFloat(style.paddingTop) || 0;
    const padBottom = parseFloat(style.paddingBottom) || 0;
    const used = mainH + closingH + footerH + padTop + padBottom;

    let pages = Math.max(1, Math.ceil((used - OVERFLOW_PX) / pageH));
    if (pages * pageH < used - OVERFLOW_PX) pages += 1;

    let shift = 0;
    if (pages > 1 && closingH > 0) {
      const lastContentStart = (pages - 1) * pageH + padTop;
      const naturalTop = padTop + mainH;
      const naturalBottom = naturalTop + closingH;
      const footerTop = pages * pageH - padBottom - footerH;
      const roomOnLast = footerTop - lastContentStart;
      const startsBeforeLast = naturalTop < lastContentStart - OVERFLOW_PX;
      const fitsOnLast = closingH <= roomOnLast + OVERFLOW_PX;

      if (startsBeforeLast && fitsOnLast) {
        shift = lastContentStart - naturalTop;
      } else if (naturalBottom <= lastContentStart + OVERFLOW_PX) {
        shift = Math.max(0, footerTop - closingH - naturalTop);
      }
    }
    shift = Math.max(0, Math.round(shift));
    const footerGap = Math.max(
      0,
      Math.round(
        pages * pageH - padTop - padBottom - mainH - shift - closingH - footerH,
      ),
    );

    applyLayout({
      pageCount: pages,
      gapPx: footerGap,
      flowPx: pages * pageH,
      closingShiftPx: shift,
      footerGapPx: footerGap,
    });
    root.dataset.pages = String(pages);
  }, [applyLayout]);

  useLayoutEffect(() => {
    recalc();
    const root = rootRef.current;
    const mainEl = mainRef.current;
    if (!root || !mainEl) return;
    if (root.closest(".a4-sheet-clone") || root.closest(".a4-sheet-shift")) {
      return;
    }

    const ro = new ResizeObserver(() => recalc());
    ro.observe(mainEl);
    ro.observe(root);
    if (footerRef.current) ro.observe(footerRef.current);
    if (closingRef.current) ro.observe(closingRef.current);

    let alive = true;
    window.addEventListener("resize", recalc);
    window.addEventListener("beforeprint", recalc);
    document.fonts?.ready.then(() => {
      if (alive) recalc();
    });
    root.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", recalc);
    });

    return () => {
      alive = false;
      ro.disconnect();
      window.removeEventListener("resize", recalc);
      window.removeEventListener("beforeprint", recalc);
    };
  }, [recalc]);

  const flowStyle = {
    "--lh-flow-h": `${pageCount * 297}mm`,
  } as CSSProperties;

  return (
    <div ref={rootRef} className="letterhead-pages" data-pages={pageCount}>
      <div className="letterhead letterhead--flow" style={flowStyle}>
        <div ref={mainRef} className="letterhead-main">
          {main}
        </div>
        {closingText ? (
          <div
            ref={closingRef}
            className="letterhead-closing-text"
            style={
              closingShiftPx > 0 ? { paddingTop: closingShiftPx } : undefined
            }
          >
            {closingText}
          </div>
        ) : null}
        <div className="letterhead-gap" style={{ height: footerGapPx }} />
        <div ref={footerRef} className="letterhead-footer">
          {footer}
        </div>
      </div>
    </div>
  );
}
