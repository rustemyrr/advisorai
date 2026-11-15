import { ImageResponse } from "next/og";
import { orbitMarkDataUri } from "@/lib/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Shown when the site is saved to an iOS home screen. There was no
// apple-touch-icon at all before, so iOS used a screenshot of the page.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111827",
          // No rounding here on purpose: iOS applies its own mask to a home
          // screen icon, and our own corners would leave transparent notches
          // outside it.
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={orbitMarkDataUri("#ffffff", 1.8)} width={110} height={110} alt="" />
      </div>
    ),
    size
  );
}
