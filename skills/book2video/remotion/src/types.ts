export type InputProps = {
  dataUrl?: string;
};

export type SceneData = {
  id: string;
  title: string;
  subtitle: string;
  narration: string;
  energy: "low" | "medium" | "high";
  durationSec: number;
  audioUrl: string;
  imageUrls: string[];
};

export type RenderProps = {
  title: string;
  author: string;
  sourceUrl: string;
  fps: number;
  width: number;
  height: number;
  titleCardSec: number;
  totalDurationSec: number;
  bgm: {
    url: string;
    volume: number;
  } | null;
  scenes: SceneData[];
};

export type CompositionProps = InputProps & Partial<RenderProps>;
