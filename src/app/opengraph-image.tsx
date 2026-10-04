import { ImageResponse } from "next/og";

export const alt = "Mehul Dadhich, AI/ML Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STAGES = ["Video", "YOLO", "Tracking", "LSTM", "VLM", "Alert"];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "72px 80px", background: "#0a0b10", color: "#f4efe3", fontFamily: "sans-serif",
          backgroundImage: "radial-gradient(circle at 85% 10%, rgba(233,196,106,0.18), transparent 45%), radial-gradient(circle at 10% 100%, rgba(201,184,255,0.12), transparent 40%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: "#aaa496", letterSpacing: 4 }}>
          <div style={{ width: 12, height: 12, borderRadius: 12, background: "#8fd19e" }} />
          AI / ML ENGINEER · DELHI, INDIA
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", position: "relative", fontSize: 128, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>
            MEHUL DADHICH
          </div>
          <div style={{ fontSize: 34, color: "#aaa496", maxWidth: 900 }}>
            Real-time computer vision and LLM agents, built into systems people rely on.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {STAGES.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  display: "flex", padding: "10px 18px", borderRadius: 10, fontSize: 24,
                  border: `2px solid ${i === STAGES.length - 1 ? "#ff6b5e" : "#e9c46a"}`,
                  color: i === STAGES.length - 1 ? "#ff6b5e" : "#e9c46a",
                }}
              >
                {s}
              </div>
              {i < STAGES.length - 1 ? <div style={{ width: 28, height: 2, background: "#3a3628" }} /> : null}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
