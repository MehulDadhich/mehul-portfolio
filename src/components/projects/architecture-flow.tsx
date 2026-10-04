import type { Stage } from "@/lib/content";
import { cn } from "@/lib/utils";

/** Compact left-to-right pipeline. Lights up in sequence when its card is hovered. */
export function ArchitectureMini({ stages }: { stages: Stage[] }) {
  return (
    <div className="relative">
      <div className="absolute inset-x-3 top-1/2 hidden h-px -translate-y-1/2 bg-line-strong sm:block" aria-hidden />
      <span
        className="absolute left-3 top-1/2 hidden size-1.5 sm:block -translate-y-1/2 rounded-full bg-signal opacity-0 shadow-[0_0_10px_var(--signal)] group-hover/card:animate-[packet_2.6s_linear_infinite] group-focus-within/card:animate-[packet_2.6s_linear_infinite]"
        aria-hidden
      />
      <ol className="relative flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:justify-between">
        {stages.map((s, i) => (
          <li
            key={s.id}
            className="rounded-md border sm:min-w-0 sm:truncate border-line bg-ink px-2 py-1.5 font-mono text-[10.5px] text-soft group-hover/card:animate-[arch-light_2.6s_linear_infinite] group-focus-within/card:animate-[arch-light_2.6s_linear_infinite]"
            style={{ animationDelay: `${(i / stages.length) * 2.6}s` }}
          >
            {s.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Full architecture, one stage per row, used in the Explore view. */
export function ArchitectureFull({ stages, className }: { stages: Stage[]; className?: string }) {
  return (
    <ol className={cn("relative flex flex-col", className)}>
      {stages.map((s, i) => (
        <li key={s.id} className="relative grid grid-cols-[2rem_1fr] gap-4 pb-6 last:pb-0">
          {i < stages.length - 1 ? (
            <span className="absolute left-[0.95rem] top-8 bottom-0 w-px bg-gradient-to-b from-signal/50 to-line" aria-hidden />
          ) : null}
          <span className="relative z-10 grid size-8 place-items-center rounded-full border border-line-strong bg-ink font-mono text-[11px] text-signal">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="flex min-w-0 flex-col gap-1 pt-1">
            <span className="font-medium text-fg">{s.label}</span>
            <span className="text-[0.92rem] leading-relaxed text-soft">{s.detail}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
