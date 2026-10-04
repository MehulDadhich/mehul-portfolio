import type { ReactNode } from "react";
import { Reveal } from "./reveal";
import { SplitHeading } from "./split-heading";

export function SectionHeading({
  index,
  eyebrow,
  title,
  lede,
  detect,
}: {
  index: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  detect?: string;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Reveal className="eyebrow flex items-center gap-3">
        <span className="text-signal">{index}</span>
        <span className="h-px w-8 bg-line-strong" aria-hidden />
        <span>{eyebrow}</span>
      </Reveal>
      <SplitHeading detect={detect} className="display text-[clamp(2.25rem,5.2vw,4.25rem)] font-semibold text-fg">
        {title}
      </SplitHeading>
      {lede ? (
        <Reveal delay={0.15}>
          <p className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-soft">{lede}</p>
        </Reveal>
      ) : null}
    </div>
  );
}
