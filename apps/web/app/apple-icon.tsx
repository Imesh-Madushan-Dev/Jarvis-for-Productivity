import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS ignores SVG manifest icons, so this generates the PNG it wants.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
        }}
      >
        <svg
          width="104"
          height="104"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e8e34a"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12.5 L9.5 18 L20 6.5" />
        </svg>
      </div>
    ),
    size,
  );
}
