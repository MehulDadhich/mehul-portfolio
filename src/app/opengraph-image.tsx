import { ImageResponse } from "next/og";

export const alt = "Mehul Dadhich, AI/ML Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The hero's key figures, as the share card's results row. */
const FIGURES = [
  { before: "", after: "25.2 ms", label: "Tier-1 latency p50" },
  { before: "", after: "3.6 s", label: "median time to alert" },
  { before: "51 s", after: "6 s", label: "agent cold start" },
  { before: "71%", after: "90%", label: "fact recall, QLoRA" },
];

/** Share card on the site's dark stage: ivory type, one vermilion accent. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "64px 80px", background: "#0c0c0b", color: "#efece4", fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 22, color: "#a39f94", letterSpacing: 3, borderTop: "2px solid #efece4", paddingTop: 18 }}>
          <div style={{ display: "flex" }}>MEHUL DADHICH · AI / ML ENGINEER</div>
          <div style={{ display: "flex" }}>DELHI, INDIA</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 104, lineHeight: 1, letterSpacing: -3 }}>
          <div style={{ display: "flex" }}>I build AI systems and take them</div>
          <div style={{ display: "flex", color: "#ff5b2e", fontStyle: "italic" }}>past the notebook.</div>
        </div>
        <div style={{ display: "flex", borderTop: "1px solid #46443e", paddingTop: 22 }}>
          {FIGURES.map((f) => (
            <div key={f.label} style={{ display: "flex", flexDirection: "column", width: "25%", gap: 6 }}>
              <div style={{ display: "flex", fontFamily: "monospace", fontSize: 40, letterSpacing: -2 }}>
                {f.before ? <span style={{ color: "#efece4" }}>{f.before} → </span> : null}
                <span style={{ color: f.before ? "#ff5b2e" : "#efece4" }}>{f.after}</span>
              </div>
              <div style={{ display: "flex", fontFamily: "sans-serif", fontSize: 20, color: "#a39f94" }}>{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
