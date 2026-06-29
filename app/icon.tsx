import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Logo Tymios (engrenage + cadran doré) embarqué en SVG.
const GOLD = "#CDB06A";
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <circle cx="24" cy="24" r="19" fill="none" stroke="${GOLD}" stroke-width="6" stroke-dasharray="3.1 3.4"/>
  <circle cx="24" cy="24" r="14.5" fill="#0b1120" stroke="${GOLD}" stroke-width="2"/>
  <g stroke="${GOLD}" stroke-width="2" stroke-linecap="round">
    <line x1="24" y1="24" x2="24" y2="16.5"/>
    <line x1="24" y1="24" x2="29.5" y2="24"/>
  </g>
  <circle cx="24" cy="24" r="1.8" fill="${GOLD}"/>
</svg>`;

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e1422",
          borderRadius: 7,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={28}
          height={28}
          src={`data:image/svg+xml;utf8,${encodeURIComponent(mark)}`}
          alt=""
        />
      </div>
    ),
    { ...size },
  );
}
