"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Props = {
  /** Шапка + таблица (+ заключение для экспертизы) */
  main: ReactNode;
  /** Текст подтверждения утилизации — уезжает вместе с подписями */
  closingText?: ReactNode;
  /** Блок подписей */
  footer: ReactNode;
};

/**
 * Короткий акт: всё на 1 листе, подписи внизу.
 * Длинная таблица (утилизация): на первых листах только таблица;
 * текст подтверждения + подписи — вместе на последнем листе, подписи внизу.
 */
export function LetterheadFrame({ main, closingText, footer }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const [breakBeforeClosing, setBreakBeforeClosing] = useState(false);
  const [spacerMm, setSpacerMm] = useState(0);

  const recalc = useCallback(() => {
    const root = rootRef.current;
    const mainEl = mainRef.current;
    const textEl = textRef.current;
    const footerEl = footerRef.current;
    if (!root || !mainEl || !footerEl) return;

    const probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;height:297mm;width:0;";
    root.appendChild(probe);
    const pageH = probe.offsetHeight;
    root.removeChild(probe);
    if (!pageH) return;

    const style = getComputedStyle(root);
    const padTop = parseFloat(style.paddingTop) || 0;
    const padBottom = parseFloat(style.paddingBottom) || 0;
    const contentPageH = pageH - padTop - padBottom;
    if (contentPageH <= 0) return;

    const mainH = mainEl.offsetHeight;
    const textH = textEl?.offsetHeight ?? 0;
    const footerH = footerEl.offsetHeight;
    const closingBlockH = textH + footerH;

    // Есть ли место на первом/текущем листе после таблицы для текста+подписей целиком?
    const fitsTogether = mainH + closingBlockH <= contentPageH + 1;

    if (!closingText || fitsTogether) {
      // Один лист (или экспертиза): подписи к низу листа
      setBreakBeforeClosing(false);
      const used = mainH + textH + footerH;
      const spacerPx = Math.max(0, contentPageH - used);
      setSpacerMm((spacerPx / pageH) * 297);
      return;
    }

    // Таблица большая — текст+подписи на отдельный последний лист, подписи внизу
    setBreakBeforeClosing(true);
    const spacerPx = Math.max(0, contentPageH - textH - footerH);
    setSpacerMm((spacerPx / pageH) * 297);
  }, [closingText]);

  useLayoutEffect(() => {
    recalc();
    const root = rootRef.current;
    const mainEl = mainRef.current;
    if (!root || !mainEl) return;

    const ro = new ResizeObserver(() => recalc());
    ro.observe(mainEl);
    ro.observe(root);
    if (textRef.current) ro.observe(textRef.current);
    if (footerRef.current) ro.observe(footerRef.current);

    window.addEventListener("resize", recalc);
    window.addEventListener("beforeprint", recalc);
    const imgs = root.querySelectorAll("img");
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", recalc);
    });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
      window.removeEventListener("beforeprint", recalc);
    };
  }, [recalc]);

  return (
    <div ref={rootRef} className="letterhead relative">
      <div ref={mainRef} className="letterhead-main">
        {main}
      </div>

      <div
        ref={closingRef}
        className={
          breakBeforeClosing
            ? "letterhead-closing letterhead-closing--new-page"
            : "letterhead-closing"
        }
      >
        {closingText ? (
          <div ref={textRef} className="letterhead-closing-text">
            {closingText}
          </div>
        ) : (
          <div ref={textRef} />
        )}
        <div
          className="letterhead-spacer"
          aria-hidden
          style={{ height: `${Math.max(0, spacerMm)}mm`, flexShrink: 0 }}
        />
        <div ref={footerRef} className="letterhead-footer">
          {footer}
        </div>
      </div>
    </div>
  );
}
