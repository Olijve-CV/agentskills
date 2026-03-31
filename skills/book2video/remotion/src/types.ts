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
  bookCategory?: string;
  genreTags?: string[];
  themeMode?: "auto" | "business-growth" | "psychology-cognition" | "social-history" | "fiction-literature" | "universal";
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
