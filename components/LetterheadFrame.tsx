"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Оболочка бланка A4: подписи всегда внизу последней страницы.
 * Короткий акт → 1 лист; длинный → 2–3 листа, футер внизу последнего.
 * Высота спейсера в mm — корректно и на экране (zoom), и при печати.
 */
export function LetterheadFrame({
  body,
  footer,
}: {
  body: ReactNode;
  footer: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [spacerMm, setSpacerMm] = useState(0);

  const recalc = useCallback(() => {
    const root = rootRef.current;
    const bodyEl = bodyRef.current;
    const footerEl = footerRef.current;
    if (!root || !bodyEl || !footerEl) return;

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

    const bodyH = bodyEl.offsetHeight;
    const footerH = footerEl.offsetHeight;
    if (footerH <= 0) return;

    const posInPage = bodyH % contentPageH;
    const spaceLeft = posInPage === 0 ? 0 : contentPageH - posInPage;

    let spacerPx: number;
    if (spaceLeft >= footerH) {
      spacerPx = spaceLeft - footerH;
    } else {
      spacerPx = spaceLeft + (contentPageH - footerH);
    }

    const nextMm = (spacerPx / pageH) * 297;
    setSpacerMm((prev) => (Math.abs(prev - nextMm) < 0.2 ? prev : nextMm));
  }, []);

  useLayoutEffect(() => {
    recalc();
    const root = rootRef.current;
    const bodyEl = bodyRef.current;
    if (!root || !bodyEl) return;

    const ro = new ResizeObserver(() => recalc());
    ro.observe(bodyEl);
    ro.observe(root);

    const onPrint = () => {
      requestAnimationFrame(() => recalc());
    };

    window.addEventListener("resize", recalc);
    window.addEventListener("beforeprint", onPrint);
    const imgs = root.querySelectorAll("img");
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", recalc);
    });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
      window.removeEventListener("beforeprint", onPrint);
    };
  }, [recalc]);

  return (
    <div ref={rootRef} className="letterhead relative">
      <div ref={bodyRef} className="letterhead-body">
        {body}
      </div>
      <div
        className="letterhead-spacer"
        aria-hidden
        style={{ height: `${Math.max(0, spacerMm)}mm`, flexShrink: 0 }}
      />
      <div ref={footerRef} className="letterhead-footer">
        {footer}
      </div>
    </div>
  );
}
