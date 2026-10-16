import { Fragment } from "react";
import { cn } from "@/lib/utils";

/** "25.2 ms" → number + unit. A unit that's a symbol (%) stays at full size. */
function Part({ text }: { text: string }) {
  const m = text.trim().match(/^([≤≥<>~]?\s?[\d.,/]+)\s*(.*)$/);
  if (!m) return <>{text.trim()}</>;
  const [, n, unit] = m;
  return (
    <>
      {n.replace(/\s/g, "")}
      {unit ? (
        unit === "%" ? unit : <span className="ml-[0.22em] text-[0.52em] font-normal tracking-normal text-soft">{unit}</span>
      ) : null}
    </>
  );
}

/**
 * Typesets a measured value: tight digits, units set small and quiet, and for a before → after delta
 * the arrow recedes and the result takes the accent. That's the one place vermilion means "measured".
 */
export function Metric({ value, className }: { value: string; className?: string }) {
  const sides = value.split("→");
  return (
    <span className={cn("num tracking-[-0.05em]", className)}>
      {sides.map((s, i) => (
        <Fragment key={i}>
          {i > 0 ? <span className="mx-[0.2em] text-[0.6em] text-soft"><span aria-hidden>→</span><span className="sr-only"> to </span></span> : null}
          <span className={i > 0 && i === sides.length - 1 ? "text-signal" : undefined}>
            <Part text={s} />
          </span>
        </Fragment>
      ))}
    </span>
  );
}
