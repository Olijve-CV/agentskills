import React from "react";
import {Composition, type CalculateMetadataFunction} from "remotion";
import {Book2VideoComposition} from "./Book2VideoComposition";
import type {CompositionProps, InputProps, RenderProps} from "./types";

const DEFAULT_FPS = 30;
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1920;

export const calculateMetadata: CalculateMetadataFunction<CompositionProps> = async ({
  props,
  abortSignal
}) => {
  const dataUrl = props.dataUrl;
  if (!dataUrl) {
    return {
      durationInFrames: 150 * DEFAULT_FPS
    };
  }

  const data = (await fetch(dataUrl, {signal: abortSignal}).then((response) => response.json())) as RenderProps;
  return {
    durationInFrames: Math.ceil(data.totalDurationSec * data.fps),
    width: data.width,
    height: data.height,
    fps: data.fps,
    defaultOutName: sanitizeFileName(`${data.title}-${data.author}`),
    props: data
  };
};

const defaultProps: InputProps = {
  dataUrl: ""
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Book2Video"
      component={Book2VideoComposition}
      durationInFrames={150 * DEFAULT_FPS}
      fps={DEFAULT_FPS}
      width={DEFAULT_WIDTH}
      height={DEFAULT_HEIGHT}
      defaultProps={defaultProps}
      calculateMetadata={calculateMetadata}
    />
  );
};

function sanitizeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-").slice(0, 80);
}
