import { ImageResponse } from "next/og";
import { orbitMarkDataUri } from "@/lib/brand-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// The browser-tab icon. public/favicon.ico held the old car mark and was
// removed with this: the site's mark is the orbit now, in the header, in
// the footer and here.
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
          borderRadius: 7,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={orbitMarkDataUri("#ffffff", 2.4)} width={22} height={22} alt="" />
      </div>
    ),
    size
  );
}
