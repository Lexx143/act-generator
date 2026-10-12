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
 * Текст (шапка, таблица, «Подтверждается» / «Заключение») идёт сверху вниз,
 * как в обычном редакторе: перенос на следующий лист сам, без склейки с подписью.
 * Внизу последнего листа — только подпись («От ТОО» / «Заключение выдал»).
 */
export function LetterheadFrame({ main, closingText, footer }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const layoutCtx = useLetterheadLayout();

  const [local, setLocal] = useState({
    pageCount: 1,
    gapPx: 0,
    flowPx: 0,
  });

  const pageCount = Math.max(
    1,
    layoutCtx?.ready ? layoutCtx.pageCount : local.pageCount,
  );

  const applyLayout = useCallback(
    (next: { pageCount: number; gapPx: number; flowPx: number }) => {
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

    const mainH = mainEl.scrollHeight || mainEl.offsetHeight;
    const footerH = footerEl.scrollHeight || footerEl.offsetHeight;
    const sheet = root.querySelector(".letterhead") as HTMLElement | null;
    const style = getComputedStyle(sheet ?? root);
    const padTop = parseFloat(style.paddingTop) || 0;
    const padBottom = parseFloat(style.paddingBottom) || 0;
    const used = mainH + footerH + padTop + padBottom;

    let pages = Math.max(1, Math.ceil((used - OVERFLOW_PX) / pageH));
    let gap = pages * pageH - used;
    if (gap < 0) {
      pages += 1;
      gap = pages * pageH - used;
    }

    applyLayout({
      pageCount: pages,
      gapPx: 0,
      flowPx: pages * pageH,
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

    window.addEventListener("resize", recalc);
    window.addEventListener("beforeprint", recalc);
    root.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", recalc);
    });

    return () => {
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
          {closingText ? (
            <div className="letterhead-closing-text">{closingText}</div>
          ) : null}
        </div>
        <div ref={footerRef} className="letterhead-footer">
          {footer}
        </div>
      </div>
    </div>
  );
}
