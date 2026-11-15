import { ImageResponse } from "next/og";

export const alt = "AdvisorAI — AI agents for pros";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Shown when the link is pasted into WhatsApp, Telegram, Slack or LinkedIn,
// which until now rendered a bare URL with no title and no picture.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#111827" }}>
          AdvisorAI
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            lineHeight: 1.15,
            fontWeight: 600,
            color: "#111827",
            letterSpacing: "-0.02em",
          }}
        >
          Agents that take the work off your hands.
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#6b7280" }}>
          AI agents for pros · advisorai.help
        </div>
      </div>
    ),
    size
  );
}
