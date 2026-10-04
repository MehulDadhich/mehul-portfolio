"use client";

import { useEffect, useState } from "react";

/*
  Six tiny, mostly-CSS visuals, one per capability frame. Each is an illustration of a
  real behaviour from Mehul's projects (no fake screenshots). CSS animations keep them
  on the compositor; the only timer is the CCTV clock.
*/

export function VisionVisual() {
  return (
    <div className="relative size-full overflow-hidden bg-[#0a0e13]">
      <div className="absolute inset-x-0 top-[58%] h-px bg-white/10" />
      <div className="absolute inset-x-0 top-[78%] h-px border-t border-dashed border-white/10" />
      <span className="absolute left-[10%] top-[54%] h-[22%] w-[26%] rounded-[3px] bg-[#2a3846]" />
      <span className="absolute left-[54%] top-[34%] h-[28%] w-[30%] rounded-[3px] bg-[#334558]" />
      <span className="absolute left-[33%] top-[11%] h-[22%] w-[17%] rounded-[3px] bg-[#25313d]" />
      <span
        className="absolute left-0 top-0 border-[1.5px] border-signal animate-[box-hop_6s_cubic-bezier(.7,0,.2,1)_infinite]"
        aria-hidden
      >
        <span className="absolute -left-[1.5px] bottom-full whitespace-nowrap bg-signal px-1 py-[1px] font-mono text-[9px] font-semibold leading-none text-[#031014]">
          car 0.91 · #14
        </span>
      </span>
    </div>
  );
}

export function GenAIVisual() {
  return (
    <div className="flex size-full flex-col justify-center gap-2 bg-[#0b0c14] p-[8%] font-mono text-[10px] leading-snug">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="aspect-video w-1/4 rounded-[2px] bg-gradient-to-br from-[#2a3346] to-[#1a2030]" />
        ))}
        <span className="self-center pl-1 text-dim">frames t-2 … t</span>
      </div>
      <p className="text-soft"><span className="text-reason">prompt</span> Is there an accident in these frames? Answer yes or no.</p>
      <p className="text-fg">
        <span className="text-reason">vlm</span> yes
        <span className="ml-1 inline-block h-[1em] w-[0.5em] translate-y-[2px] bg-reason animate-[blink_1s_steps(1)_infinite]" />
      </p>
    </div>
  );
}

export function NLPVisual() {
  const fields = [
    { k: "category", v: "work", word: "report", c: "text-model", u: "decoration-model/70" },
    { k: "due", v: "Fri", word: "friday", c: "text-signal", u: "decoration-signal/70" },
    { k: "priority", v: "high", word: "urgent", c: "text-alert", u: "decoration-alert/70" },
  ];
  return (
    <div className="flex size-full flex-col justify-center gap-3 bg-[#0b0d13] p-[8%]">
      <p className="font-sans text-[13px] leading-snug text-soft">
        “submit the <span className={`underline underline-offset-4 ${fields[0].c} ${fields[0].u}`}>report</span> by{" "}
        <span className={`underline underline-offset-4 ${fields[1].c} ${fields[1].u}`}>friday</span>, it&apos;s{" "}
        <span className={`underline underline-offset-4 ${fields[2].c} ${fields[2].u}`}>urgent</span>”
      </p>
      <div className="flex flex-col gap-1 font-mono text-[10px]">
        {fields.map((f, i) => (
          <div
            key={f.k}
            className="flex gap-2 opacity-0 animate-[nlp-tag_4.8s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.6}s` }}
          >
            <span className="w-14 text-dim">{f.k}</span>
            <span className={f.c}>{f.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BackendVisual() {
  const lines = [
    ["POST", "/incidents", "201", "text-ok"],
    ["WS", "/ws/incidents", "push", "text-signal"],
    ["GET", "/cameras/07/status", "200", "text-ok"],
    ["INSERT", "incident", "pg", "text-model"],
    ["GET", "/alerts?open=1", "200", "text-ok"],
    ["WS", "/ws/incidents", "push", "text-signal"],
  ];
  const all = [...lines, ...lines];
  return (
    <div className="relative size-full overflow-hidden bg-[#0a0d11] px-[7%] font-mono text-[10px]">
      <div className="animate-[log-roll_9s_linear_infinite]">
        {all.map(([m, p, s, c], i) => (
          <div key={i} className="flex h-[22px] items-center gap-2 border-b border-white/[0.04]">
            <span className="w-11 shrink-0 text-dim">{m}</span>
            <span className="truncate text-soft">{p}</span>
            <span className={`ml-auto ${c}`}>{s}</span>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a0d11] via-transparent to-[#0a0d11]" />
    </div>
  );
}

export function AgentVisual() {
  const nodes = ["interpret", "state", "tool", "act"];
  return (
    <div className="flex size-full items-center justify-center bg-[#0b0c13] px-[6%]">
      <div className="flex w-full items-center">
        {nodes.map((n, i) => (
          <div key={n} className="flex flex-1 items-center last:flex-none">
            <span
              className="rounded-[4px] border border-white/10 bg-white/[0.03] px-1.5 py-1 font-mono text-[9.5px] text-soft animate-[agent-step_4s_steps(1)_infinite]"
              style={{ animationDelay: `${i}s` }}
            >
              {n}
            </span>
            {i < nodes.length - 1 ? <span className="mx-1 h-px flex-1 bg-white/15" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RealWorldVisual() {
  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setClock(new Date().toTimeString().slice(0, 8));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="relative size-full overflow-hidden bg-[#0c1014]">
      <div className="absolute inset-x-0 top-[45%] h-[45%] bg-[#141b21]" />
      <div className="absolute inset-x-0 top-[67%] border-t border-dashed border-white/15" />
      <span className="absolute left-[46%] top-[52%] h-[18%] w-[22%] rounded-[3px] bg-[#34404a]" />
      <span className="absolute left-[44%] top-[48%] h-[26%] w-[26%] border-[1.5px] border-alert animate-[blink_1.2s_steps(1)_infinite]">
        <span className="absolute -left-[1.5px] bottom-full whitespace-nowrap bg-alert px-1 py-[1px] font-mono text-[9px] font-semibold leading-none text-[#1a0503]">
          stopped vehicle
        </span>
      </span>
      <div className="absolute inset-x-0 top-0 flex justify-between bg-black/40 px-2 py-1 font-mono text-[9px] text-soft">
        <span>CAM 07 · RTSP</span>
        <span suppressHydrationWarning>{clock}</span>
      </div>
      <div className="absolute bottom-1.5 left-2 flex items-center gap-1 font-mono text-[9px] text-soft">
        <span className="size-1.5 rounded-full bg-alert animate-[pulse-dot_1.4s_ease-in-out_infinite]" /> REC
      </div>
    </div>
  );
}
