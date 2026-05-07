import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { TemplateProps } from "./Root";

export const MyVideoTemplate: React.FC<TemplateProps> = ({
  titleText,
  subtitleText,
  themeColor = "#3b82f6",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const contentAppearance = spring({
    fps,
    frame: frame - 10,
    config: { damping: 12 },
  });

  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: "#111827", // Dark elegant background
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  };

  const titleStyle: React.CSSProperties = {
    color: themeColor,
    fontSize: "80px",
    fontWeight: "bold",
    transform: `scale(${contentAppearance})`,
    opacity,
    marginBottom: "20px",
  };

  const subtitleStyle: React.CSSProperties = {
    color: "#e5e7eb",
    fontSize: "40px",
    opacity: Math.min(1, Math.max(0, (frame - 20) / 10)),
  };

  return (
    <AbsoluteFill style={backgroundStyle}>
      <h1 style={titleStyle}>{titleText}</h1>
      {subtitleText && <h2 style={subtitleStyle}>{subtitleText}</h2>}
    </AbsoluteFill>
  );
};
