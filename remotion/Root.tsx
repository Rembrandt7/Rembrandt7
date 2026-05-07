import React from "react";
import { Composition } from "remotion";
import { MyVideoTemplate } from "./MyVideoTemplate";
import { BouncingBallTemplate } from "./BouncingBallTemplate";

export type TemplateProps = {
  titleText: string;
  subtitleText?: string;
  logoUrl?: string;
  themeColor?: string;
};

const defaultProps: TemplateProps = {
  titleText: "Welcome to Remotion",
  subtitleText: "Rendered via Global API",
  themeColor: "#3b82f6",
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GlobalVideoTemplate"
        component={MyVideoTemplate}
        durationInFrames={150} // 150 frames @ 30fps = 5 seconds
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
      <Composition
        id="BouncingBall"
        component={BouncingBallTemplate}
        durationInFrames={300} // 10s rebote continuo
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
