"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, ChevronDown, SendHorizontal, X } from "lucide-react";
import { answer, type Memory, type Reply } from "@/lib/assistant/engine";
import type { Link } from "@/lib/assistant/knowledge";
import { scrollToId } from "@/components/providers/smooth-scroll";
import { cn } from "@/lib/utils";
import { ArcOrb } from "./arc-orb";

const OPEN_EVENT = "md:open-assistant";
export function openAssistant() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type BotMsg = { id: number; role: "bot"; reply: Reply; steps: number; words: number; showTrace: boolean };
type Msg = { id: number; role: "user"; text: string } | BotMsg;

const STEP_MS = 260;
const WORD_MS = 22;

/** Renders **bold** segments and blank-line paragraphs. */
function rich(text: string): ReactNode[] {
  return text.split("\n\n").map((para, pi) => (
    <p key={pi} className={pi ? "mt-2.5" : undefined}>
      {para.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-fg">{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  ));
}

const wordsOf = (t: string) => t.split(/(\s+)/);

/**
 * Arc: Mehul's portfolio assistant. Visitors ask in their own words; Arc replays the pipeline
 * steps it actually ran (parse → intent → retrieve → answer), then streams the answer.
 * Everything runs locally through src/lib/assistant. No API calls, no model downloads.
 */
export function Assistant() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pulse, setPulse] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const memory = useRef<Memory>({});
  const history = useRef<string[]>([]);
  const historyIdx = useRef(-1);
  const nextId = useRef(1);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      // Ctrl/Cmd + K toggles Arc from anywhere on the page
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener(OPEN_EVENT, onOpen); window.removeEventListener("keydown", onKey); };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  // Replay the newest reply: reveal its pipeline steps one by one, then stream the words.
  const last = msgs[msgs.length - 1];
  const active = last?.role === "bot" ? last : undefined;
  const totalWords = active ? wordsOf(active.reply.text).length : 0;
  const thinking = !!active && active.steps < active.reply.steps.length;
  const streaming = !!active && !thinking && active.words < totalWords;
  useEffect(() => {
    if (!active || (!thinking && !streaming)) return;
    const id = setTimeout(() => {
      setMsgs((m) =>
        m.map((x) =>
          x.id === active.id && x.role === "bot"
            ? thinking ? { ...x, steps: x.steps + 1 } : { ...x, words: Math.min(totalWords, x.words + 2) }
            : x
        )
      );
    }, thinking ? STEP_MS : WORD_MS);
    return () => clearTimeout(id);
  }, [active, thinking, streaming, totalWords]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, open]);

  const ask = (q: string) => {
    const text = q.trim().slice(0, 300);
    if (!text || thinking || streaming) return;
    const reply = answer(text, memory.current);
    history.current = [text, ...history.current].slice(0, 20);
    historyIdx.current = -1;
    const done = reduce ?? false;
    const userMsg: Msg = { id: nextId.current++, role: "user", text };
    const botMsg: Msg = { id: nextId.current++, role: "bot", reply, steps: done ? reply.steps.length : 0, words: done ? wordsOf(reply.text).length : 0, showTrace: false };
    setMsgs((m) => [...m, userMsg, botMsg].slice(-30));
    setInput("");
  };

  const follow = (l: Link) => {
    if (l.section) {
      scrollToId(l.section);
      if (window.matchMedia("(max-width: 640px)").matches) setOpen(false);
    } else if (l.href) {
      const a = document.createElement("a");
      a.href = l.href;
      if (l.href.endsWith(".pdf")) a.download = "";
      else { a.target = "_blank"; a.rel = "noreferrer"; }
      a.click();
    }
  };

  const toggleTrace = (id: number) =>
    setMsgs((m) => m.map((x) => (x.id === id && x.role === "bot" ? { ...x, showTrace: !x.showTrace } : x)));

  const orbState = thinking ? "thinking" : input ? "listening" : "idle";
  const empty = msgs.length === 0;

  return (
    <>
      {/* launcher */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="md-assistant"
        aria-label={open ? "Close Arc" : "Ask Arc (Ctrl + K)"}
        data-cursor={open ? "close arc" : "ask arc · ctrl k"}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.4, duration: 0.6 }}
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 z-50 flex items-center gap-2.5 rounded-full border border-line-strong bg-panel/90 py-1.5 pl-1.5 pr-4 text-[13px] font-medium text-fg shadow-[0_18px_40px_-18px_rgb(0_0_0/0.8)] backdrop-blur-md transition-colors hover:border-signal sm:right-6"
      >
        <span className="relative grid size-8 place-items-center overflow-hidden rounded-full bg-ink">
          {open ? <X className="size-4 text-signal" aria-hidden /> : <ArcOrb size={32} state="idle" />}
        </span>
        <span className="hidden sm:inline">{open ? "Close" : "Ask Arc"}</span>
        {!open ? <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-dim sm:inline">Ctrl K</kbd> : null}
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.section
            id="md-assistant"
            role="dialog"
            aria-label="Arc, Mehul's portfolio assistant"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "100% 100%" }}
            className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-50 flex h-[min(600px,calc(100svh-7rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-line-strong bg-panel/95 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] backdrop-blur-xl sm:right-6 sm:w-[410px]"
          >
            {/* header */}
            <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <ArcOrb size={34} state={orbState} pulse={pulse} />
                <div className="flex flex-col leading-tight">
                  <span className="font-display text-[15px] font-semibold tracking-tight text-fg [font-stretch:110%]">Arc</span>
                  <span className="font-mono text-[10.5px] text-dim">
                    {thinking ? "thinking…" : streaming ? "answering…" : "Mehul's assistant · runs in your browser"}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close Arc" className="grid size-8 place-items-center rounded-md text-soft transition-colors hover:bg-ink-2 hover:text-fg">
                <X className="size-4" aria-hidden />
              </button>
            </header>

            {/* conversation */}
            <div ref={scroller} data-lenis-prevent className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4" aria-live="polite">
              {empty ? (
                <div className="m-auto flex max-w-[30ch] flex-col items-center gap-4 text-center">
                  <ArcOrb size={150} state={orbState} pulse={pulse} />
                  <div className="flex flex-col gap-2">
                    <p className="font-display text-2xl font-semibold tracking-tight text-fg [font-stretch:112%]">Hi, I&apos;m Arc.</p>
                    <p className="text-[14px] leading-relaxed text-soft">
                      Ask me anything about Mehul: his work, his projects, what he knows, or how to reach him.
                    </p>
                  </div>
                  <p className="font-mono text-[10.5px] text-dim">no external AI · answers only from this site</p>
                </div>
              ) : null}

              {msgs.map((m) =>
                m.role === "user" ? (
                  <motion.div
                    key={m.id}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-signal/15 px-3.5 py-2 text-[14px] leading-relaxed text-fg"
                  >
                    {m.text}
                  </motion.div>
                ) : (
                  <BotBubble key={m.id} m={m} onFollow={follow} onToggleTrace={() => toggleTrace(m.id)} />
                )
              )}
            </div>

            {/* input */}
            <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex items-center gap-2 border-t border-line p-3">
              <label htmlFor="md-assistant-input" className="sr-only">Ask Arc a question</label>
              <input
                id="md-assistant-input"
                ref={inputRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); setPulse((p) => p + 1); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" && history.current.length) {
                    e.preventDefault();
                    historyIdx.current = Math.min(history.current.length - 1, historyIdx.current + 1);
                    setInput(history.current[historyIdx.current]);
                  } else if (e.key === "ArrowDown" && historyIdx.current >= 0) {
                    e.preventDefault();
                    historyIdx.current -= 1;
                    setInput(historyIdx.current >= 0 ? history.current[historyIdx.current] : "");
                  }
                }}
                maxLength={300}
                autoComplete="off"
                placeholder="Ask Arc anything about Mehul…"
                className={cn("h-10 flex-1 rounded-lg border border-line bg-ink-2 px-3 text-[14px] text-fg outline-none placeholder:text-dim focus:border-signal/60")}
              />
              <button type="submit" disabled={!input.trim() || thinking || streaming} aria-label="Send" className="grid size-10 place-items-center rounded-lg bg-signal text-on-signal transition-opacity disabled:opacity-40">
                <SendHorizontal className="size-4" aria-hidden />
              </button>
            </form>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function BotBubble({ m, onFollow, onToggleTrace }: { m: BotMsg; onFollow: (l: Link) => void; onToggleTrace: () => void }) {
  const words = wordsOf(m.reply.text);
  const thinking = m.steps < m.reply.steps.length;
  const done = !thinking && m.words >= words.length;
  const visibleSteps = m.reply.steps.slice(0, m.steps);

  return (
    <div className="flex max-w-[94%] flex-col gap-2 self-start">
      {/* pipeline replay: live while thinking, collapsible afterwards */}
      {thinking || m.showTrace ? (
        <ol className="flex flex-col gap-1 rounded-xl border border-line/70 bg-ink/60 px-3 py-2 font-mono text-[10.5px] leading-relaxed text-dim">
          {visibleSteps.map((st, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
              <span className={i === visibleSteps.length - 1 && thinking ? "text-signal" : "text-ok"}>{i === visibleSteps.length - 1 && thinking ? "›" : "✓"}</span>
              <span className="break-all">{st}</span>
            </motion.li>
          ))}
          {thinking ? <li className="ml-4 inline-block h-[1em] w-[0.45em] bg-signal/70 animate-[blink_1s_steps(1)_infinite]" /> : null}
        </ol>
      ) : null}

      {!thinking ? (
        <div className="rounded-2xl rounded-bl-md border border-line bg-ink-2 px-3.5 py-2.5 text-[14px] leading-relaxed text-soft">
          {rich(words.slice(0, m.words).join(""))}
          {!done ? <span className="ml-0.5 inline-block h-[1em] w-[0.45em] translate-y-[2px] bg-signal animate-[blink_1s_steps(1)_infinite]" /> : null}
        </div>
      ) : null}

      {done ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {m.reply.links.map((l) => (
            <button key={l.label} type="button" onClick={() => onFollow(l)} className="flex items-center gap-1 rounded-full border border-signal/40 px-2.5 py-1 text-[12px] text-signal transition-colors hover:bg-signal/10">
              {l.label}
              <ArrowUpRight className="size-3" aria-hidden />
            </button>
          ))}
          <button type="button" onClick={onToggleTrace} aria-expanded={m.showTrace} className="ml-auto flex items-center gap-1 font-mono text-[10px] text-dim transition-colors hover:text-soft">
            {m.showTrace ? "hide" : "how I found this"}
            <ChevronDown className={cn("size-3 transition-transform", m.showTrace && "rotate-180")} aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
