"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { jumpToY, setWheelNav } from "@/components/providers/smooth-scroll";
import { WheelContext, useWheelActive, wheelState, type Hold, type Track, type WheelApi } from "./wheel-context";

export type WheelPanel = { id: string; label: string; content: ReactNode };

/** Sections sit around a globe that spins on its vertical axis; after the last section the first is waiting around the back. */
const MIN_SCALE = 0.5; // how small a section shrinks into a frame while the wheel turns
const START_PAUSE = 0.08; // screens of scroll a section rests after it lands, before its content moves
const END_PAUSE = 0.12; // and before the wheel turns away from it
const TRACK_END_PAUSE = 0.4; // longer for sections whose animation should be seen finishing
const TURN = 1; // screens of scroll per turn

type HoldLayout = { hold: Hold; panel: number; scrollStart: number; length: number };
type Seg = { d0: number; d1: number; y0: number; y1: number };
type PanelLayout = { start: number; dwell: number; overflow: number; segs: Seg[]; content: HTMLElement };
type TrackLayout = { track: Track; panel: number; top: number; height: number; gain: number };
type Layout = { panels: PanelLayout[]; holds: HoldLayout[]; tracks: TrackLayout[]; vh: number; total: number; radius: number; step: number };

function offsetWithin(el: HTMLElement, ancestor: HTMLElement) {
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== ancestor) {
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return n === ancestor ? y : el.getBoundingClientRect().top - ancestor.getBoundingClientRect().top;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Raw progress of a tracked element when its panel's content is scrolled by `contentY`. */
function trackProgress(t: { track: Track; top: number; height: number }, contentY: number, vh: number) {
  const top = t.top - contentY;
  const from = t.track.start * vh, to = t.track.end * vh - t.height;
  return (from - top) / Math.max(1, from - to);
}
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * The site as a wheel of sections (desktop). Scrolling first scrolls the current section's own content;
 * at its end the section shrinks into a frame, the wheel turns clockwise and the next section rotates up
 * and grows to fill the screen. Sections can hold the wheel while their own scroll animation plays.
 * Phones and reduced motion get the plain vertical page.
 */
export function SectionWheel({ panels }: { panels: WheelPanel[] }) {
  const active = useWheelActive();
  const root = useRef<HTMLDivElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const panelEls = useRef<(HTMLDivElement | null)[]>([]);
  const contentEls = useRef<(HTMLDivElement | null)[]>([]);
  const labelEls = useRef<(HTMLDivElement | null)[]>([]);
  const holds = useRef(new Set<Hold>());
  const tracks = useRef(new Set<Track>());
  const layout = useRef<Layout | null>(null);
  const dirty = useRef(true);

  const api = useMemo<WheelApi>(() => ({
    addHold: (h) => {
      holds.current.add(h);
      dirty.current = true;
      return () => { holds.current.delete(h); dirty.current = true; };
    },
    addTrack: (t) => {
      tracks.current.add(t);
      dirty.current = true;
      return () => { tracks.current.delete(t); dirty.current = true; };
    },
    holdScrollY: (el, p) => {
      const h = layout.current?.holds.find((x) => x.hold.el === el);
      return h ? h.scrollStart + clamp01(p) * h.length : null;
    },
  }), []);

  useEffect(() => {
    if (!active) return;
    const rootEl = root.current!;
    const wheelEl = wheel.current!;
    const panelList = panelEls.current;
    const contentList = contentEls.current;
    const n = panels.length;

    const measure = (): Layout => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const step = 360 / n;
      // the globe's radius: neighbouring sections meet edge to edge around it
      const radius = (vw / 2) / Math.tan(((step / 2) * Math.PI) / 180);
      const out: Layout = { panels: [], holds: [], tracks: [], vh, total: 0, radius, step };
      let page = 0;
      for (let i = 0; i < n; i++) {
        const panel = panelEls.current[i]!;
        const content = contentEls.current[i]!;
        const overflow = Math.max(0, content.offsetHeight - vh);
        const mine = [...holds.current]
          .filter((h) => panel.contains(h.el))
          .map((h) => ({ h, at: Math.min(overflow, offsetWithin(h.el, content)) }))
          .sort((a, b) => a.at - b.at);
        const segs: Seg[] = [];
        let d = 0, y = 0;
        const move = (to: number) => { if (to > y) { segs.push({ d0: d, d1: d + (to - y), y0: y, y1: to }); d += to - y; y = to; } };
        const rest = (len: number) => { segs.push({ d0: d, d1: d + len, y0: y, y1: y }); d += len; };
        if (i > 0) rest(START_PAUSE * vh);
        for (const { h, at } of mine) {
          move(at);
          const length = h.lengthVh * vh;
          out.holds.push({ hold: h, panel: i, scrollStart: page + d, length });
          rest(length);
        }
        move(overflow);
        // a section with a scroll-linked animation (Journey's timeline) rests longer so it can finish
        const tracked = [...tracks.current].some((t) => panel.contains(t.el));
        rest((tracked ? TRACK_END_PAUSE : END_PAUSE) * vh);
        out.panels.push({ start: page, dwell: d, overflow, segs, content });
        // every section turns on to the next, and the last one turns back round to the first
        page += d + TURN * vh;
      }
      out.total = page;
      for (const t of tracks.current) {
        const i = panelEls.current.findIndex((p) => p?.contains(t.el));
        if (i < 0) continue;
        const tl: TrackLayout = { track: t, panel: i, top: offsetWithin(t.el, contentEls.current[i]!), height: t.el.offsetHeight, gain: 1 };
        // if the section stops scrolling before the element reaches its end line, finish when the section does
        const atEnd = trackProgress(tl, out.panels[i].overflow, vh);
        if (atEnd > 0.05 && atEnd < 1) tl.gain = 1 / atEnd;
        out.tracks.push(tl);
      }
      return out;
    };

    const yAt = (p: PanelLayout, d: number) => {
      for (const s of p.segs) if (d <= s.d1) return s.y0 + (s.y1 - s.y0) * clamp01((d - s.d0) / Math.max(1, s.d1 - s.d0));
      return p.overflow;
    };

    let lastY = -1;
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (dirty.current) {
        dirty.current = false;
        layout.current = measure();
        rootEl.style.height = `${layout.current.total + layout.current.vh}px`;
        lastY = -1;
      }
      const L = layout.current!;
      const y = Math.min(L.total, Math.max(0, window.scrollY));
      if (y === lastY) return;
      lastY = y;

      // where are we: dwelling in section `cur`, or turning from `cur` to `cur + 1`
      let cur = 0;
      while (cur < n - 1 && y >= L.panels[cur + 1].start) cur++;
      const P = L.panels[cur];
      const turning = y > P.start + P.dwell;
      const u = turning ? clamp01((y - P.start - P.dwell) / (TURN * L.vh)) : 0;
      const theta = cur + (turning ? easeInOut(u) : 0);
      const scale = turning ? 1 - (1 - MIN_SCALE) * Math.pow(Math.sin(Math.PI * u), 0.6) : 1;
      const framed = (1 - scale) / (1 - MIN_SCALE);

      wheel.current!.style.transform = `scale(${scale})`;
      const ys: number[] = [];
      for (let j = 0; j < n; j++) {
        const el = panelEls.current[j]!;
        // sections after the current one wait on the right; the globe spins them round to the front
        let a = (j - theta) * L.step;
        a = ((((a + 180) % 360) + 360) % 360) - 180;
        // while the last section turns away, the landing page comes round fresh, as it was at the very top
        const wrapping = cur === n - 1 && j === 0;
        const contentY = wrapping ? 0 : j < cur ? L.panels[j].overflow : j > cur ? 0 : turning ? P.overflow : yAt(P, y - P.start);
        ys.push(contentY);
        el.style.transform = `translateZ(${-L.radius}px) rotateY(${a}deg) translateZ(${L.radius}px)`;
        // neighbours only show while the wheel turns; at rest their corners would peek in at the edges
        el.style.visibility = j === cur || (framed > 0.01 && Math.abs(a) < 80) ? "visible" : "hidden";
        el.style.pointerEvents = j === cur && framed < 0.05 ? "auto" : "none";
        el.style.setProperty("--frame", framed.toFixed(3));
        contentEls.current[j]!.style.transform = `translate3d(0, ${-contentY}px, 0)`;
        const label = labelEls.current[j];
        if (label) label.style.opacity = framed.toFixed(3);
      }
      for (const h of L.holds) h.hold.onProgress(cur === n - 1 && h.panel === 0 ? 0 : clamp01((y - h.scrollStart) / h.length));
      for (const t of L.tracks) t.track.onProgress(clamp01(trackProgress(t, ys[t.panel], L.vh) * t.gain));
      wheelState.angle = (theta * L.step * Math.PI) / 180;
      // a full turn ends exactly where the page began: carry on from the top (looks identical, so it's seamless)
      if (y >= L.total - 1 && L.total > 0) jumpToY(0);
      wheelState.progress = L.total ? y / L.total : 0;
    };

    // content heights change as fonts load, cards expand and images decode
    const ro = new ResizeObserver(() => { dirty.current = true; });
    contentEls.current.forEach((c) => c && ro.observe(c));
    const onResize = () => { dirty.current = true; };
    window.addEventListener("resize", onResize);
    // scrolling up from the very top turns the globe backwards to the last section
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && window.scrollY <= 1 && layout.current) jumpToY(layout.current.total - 2);
    };
    window.addEventListener("wheel", onWheel, { passive: true });

    setWheelNav((id) => {
      const target = document.getElementById(id);
      const i = panelEls.current.findIndex((p) => p?.contains(target));
      const L = layout.current;
      if (i < 0 || !L) return null;
      return L.panels[i].start + (i > 0 ? START_PAUSE * L.vh : 0);
    });

    dirty.current = true;
    raf = requestAnimationFrame(frame);
    wheelState.active = true;

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", onWheel);
      setWheelNav(null);
      wheelState.active = false;
      rootEl.style.height = "";
      wheelEl.style.transform = "";
      panelList.forEach((p) => p && ["transform", "visibility", "pointer-events", "--frame"].forEach((k) => p.style.removeProperty(k)));
      contentList.forEach((c) => c && c.style.removeProperty("transform"));
    };
  }, [active, panels.length]);

  return (
    <WheelContext.Provider value={api}>
      <div ref={root} data-wheel={active ? "on" : "off"} className="relative">
        <div className={active ? "sticky top-0 h-[100svh] overflow-hidden [perspective:2400px]" : undefined}>
          <div ref={wheel} className={active ? "absolute inset-0 origin-center [transform-style:preserve-3d]" : undefined}>
            {panels.map((p, i) => (
              <div
                key={p.id}
                ref={(el) => { panelEls.current[i] = el; }}
                data-panel={i}
                className={active ? "wheel-panel absolute inset-0 overflow-hidden [backface-visibility:hidden]" : undefined}
              >
                <div ref={(el) => { contentEls.current[i] = el; }} className={active ? "absolute inset-x-0 top-0" : undefined}>
                  {p.content}
                </div>
                {active ? (
                  <div
                    ref={(el) => { labelEls.current[i] = el; }}
                    className="pointer-events-none absolute bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-signal/50 bg-ink/90 px-6 py-3 font-mono text-2xl text-fg opacity-0 shadow-[0_10px_40px_-10px_rgb(0_0_0/0.8)]"
                    aria-hidden
                  >
                    <span className="text-signal">{String(i + 1).padStart(2, "0")}</span>
                    <span className="tracking-[0.2em] uppercase">{p.label}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </WheelContext.Provider>
  );
}
