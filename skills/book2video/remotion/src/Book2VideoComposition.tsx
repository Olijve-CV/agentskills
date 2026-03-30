import React from "react";
import {Audio} from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import type {CompositionProps, RenderProps, SceneData} from "./types";

export const Book2VideoComposition: React.FC<CompositionProps> = (props) => {
  const data = normalizeRenderProps(props);
  const {fps} = useVideoConfig();
  const titleFrames = Math.round(data.titleCardSec * fps);
  let frameCursor = titleFrames;

  return (
    <AbsoluteFill style={styles.canvas}>
      <TitleCard title={data.title} author={data.author} hook={data.scenes[0]?.subtitle ?? ""} />
      {data.bgm ? (
        <Audio src={data.bgm.url} loop volume={Math.min(0.35, Math.max(0.06, data.bgm.volume ?? 0.18))} />
      ) : null}
      {data.scenes.map((scene) => {
        const durationInFrames = Math.max(1, Math.round(scene.durationSec * fps));
        const from = frameCursor;
        frameCursor += durationInFrames;

        return (
          <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}>
            <SceneCard scene={scene} durationInFrames={durationInFrames} />
            <Audio src={scene.audioUrl} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const TitleCard: React.FC<{title: string; author: string; hook: string}> = ({title, author, hook}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({
    frame,
    fps,
    config: {
      damping: 15,
      stiffness: 120,
      mass: 0.9
    }
  });
  const fade = interpolate(frame, [0, 10, 55, 78], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.ease
  });

  return (
    <AbsoluteFill
      style={{
        ...styles.titleCard,
        opacity: fade
      }}
    >
      <div style={styles.ring} />
      <div style={styles.glow} />
      <div
        style={{
          ...styles.titleWrap,
          transform: `translateY(${(1 - reveal) * 70}px) scale(${0.92 + reveal * 0.08})`
        }}
      >
        <div style={styles.kicker}>BOOK TALK</div>
        <div style={styles.title}>{title}</div>
        <div style={styles.author}>作者 {author}</div>
        <div style={styles.hook}>{hook}</div>
      </div>
    </AbsoluteFill>
  );
};

const SceneCard: React.FC<{scene: SceneData; durationInFrames: number}> = ({scene, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const images = scene.imageUrls.length > 0 ? scene.imageUrls : [""];
  const imageWindow = Math.max(1, Math.floor(durationInFrames / images.length));
  const fadeIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const fadeOut = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const sceneOpacity = fadeIn * fadeOut;
  const badgeColor = getEnergyColor(scene.energy);

  return (
    <AbsoluteFill
      style={{
        ...styles.scene,
        opacity: sceneOpacity
      }}
    >
      {images.map((imageUrl, index) => (
        <Sequence key={`${scene.id}-${index}`} from={index * imageWindow} durationInFrames={imageWindow + 8}>
          <AnimatedImage src={imageUrl} index={index} />
        </Sequence>
      ))}
      <AbsoluteFill style={styles.overlay} />
      <div style={styles.topRow}>
        <div style={{...styles.badge, borderColor: badgeColor, color: badgeColor}}>{scene.title}</div>
      </div>
      <div style={styles.bottomPanel}>
        <div style={styles.subtitle}>{scene.subtitle}</div>
        <div style={styles.meta}>
          <span>{Math.round(scene.durationSec)}s</span>
          <span>{scene.energy.toUpperCase()}</span>
        </div>
      </div>
      <VoicePulse energy={scene.energy} />
      <div style={styles.progressRail}>
        <div
          style={{
            ...styles.progressFill,
            width: `${(frame / Math.max(1, durationInFrames)) * 100}%`,
            background: badgeColor
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const AnimatedImage: React.FC<{src: string; index: number}> = ({src, index}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 90], [1.02 + index * 0.01, 1.12 + index * 0.01], {
    extrapolateRight: "clamp"
  });
  const translateY = interpolate(frame, [0, 90], [index % 2 === 0 ? 0 : -25, index % 2 === 0 ? -35 : 10], {
    extrapolateRight: "clamp"
  });
  const opacity = interpolate(frame, [0, 8, 82, 98], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale}) translateY(${translateY}px)`,
        opacity
      }}
    >
      {src ? <Img src={src} style={styles.image} /> : <AbsoluteFill style={styles.imageFallback} />}
    </AbsoluteFill>
  );
};

const VoicePulse: React.FC<{energy: SceneData["energy"]}> = ({energy}) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame / 4);
  const bars = energy === "high" ? 9 : energy === "medium" ? 7 : 5;
  const color = getEnergyColor(energy);

  return (
    <div style={styles.pulseWrap}>
      {Array.from({length: bars}).map((_, index) => {
        const height = 18 + Math.abs(Math.sin((frame + index * 3) / 5 + pulse)) * (energy === "high" ? 46 : energy === "medium" ? 34 : 20);
        return (
          <div
            key={index}
            style={{
              ...styles.pulseBar,
              height,
              background: color
            }}
          />
        );
      })}
    </div>
  );
};

function normalizeRenderProps(input: CompositionProps): RenderProps {
  return {
    title: input.title ?? "Book Video",
    author: input.author ?? "Unknown",
    sourceUrl: input.sourceUrl ?? "",
    fps: input.fps ?? 30,
    width: input.width ?? 1080,
    height: input.height ?? 1920,
    titleCardSec: input.titleCardSec ?? 2.8,
    totalDurationSec: input.totalDurationSec ?? 120,
    bgm: input.bgm ?? null,
    scenes: input.scenes ?? []
  };
}

function getEnergyColor(energy: SceneData["energy"]) {
  switch (energy) {
    case "high":
      return "#ffb347";
    case "low":
      return "#a7c5eb";
    default:
      return "#ffd9a0";
  }
}

const styles: Record<string, React.CSSProperties> = {
  canvas: {
    background: "linear-gradient(180deg, #0f141b 0%, #1e2937 50%, #0b0f14 100%)",
    color: "#f7f5ef",
    fontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif'
  },
  titleCard: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden"
  },
  ring: {
    position: "absolute",
    width: 860,
    height: 860,
    borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.12)"
  },
  glow: {
    position: "absolute",
    width: 720,
    height: 720,
    borderRadius: 9999,
    background: "radial-gradient(circle, rgba(255,179,71,0.32) 0%, rgba(255,179,71,0.08) 45%, rgba(0,0,0,0) 72%)"
  },
  titleWrap: {
    width: 820,
    padding: "72px 70px",
    borderRadius: 46,
    background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 40px 120px rgba(0,0,0,0.35)",
    backdropFilter: "blur(18px)"
  },
  kicker: {
    fontSize: 26,
    letterSpacing: "0.36em",
    color: "#ffcf91",
    marginBottom: 26
  },
  title: {
    fontSize: 82,
    lineHeight: 1.14,
    fontWeight: 700,
    letterSpacing: "-0.04em"
  },
  author: {
    marginTop: 22,
    fontSize: 34,
    color: "#f5dfb0"
  },
  hook: {
    marginTop: 46,
    fontSize: 32,
    lineHeight: 1.45,
    color: "#d6dde8"
  },
  scene: {
    overflow: "hidden"
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  imageFallback: {
    background: "linear-gradient(180deg, #253040 0%, #111821 100%)"
  },
  overlay: {
    background: "linear-gradient(180deg, rgba(7,10,14,0.2) 0%, rgba(7,10,14,0.25) 40%, rgba(7,10,14,0.78) 100%)"
  },
  topRow: {
    position: "absolute",
    top: 88,
    left: 72,
    right: 72,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  badge: {
    padding: "14px 24px",
    borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.24)",
    background: "rgba(7,10,14,0.22)",
    fontSize: 28,
    fontWeight: 600,
    backdropFilter: "blur(14px)"
  },
  bottomPanel: {
    position: "absolute",
    left: 64,
    right: 64,
    bottom: 128,
    padding: "34px 36px",
    borderRadius: 36,
    background: "linear-gradient(180deg, rgba(6,9,12,0.28) 0%, rgba(6,9,12,0.56) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(22px)"
  },
  subtitle: {
    fontSize: 50,
    lineHeight: 1.28,
    fontWeight: 700,
    letterSpacing: "-0.03em"
  },
  meta: {
    marginTop: 20,
    display: "flex",
    gap: 22,
    fontSize: 24,
    color: "rgba(255,255,255,0.7)"
  },
  pulseWrap: {
    position: "absolute",
    left: 64,
    bottom: 60,
    display: "flex",
    alignItems: "flex-end",
    gap: 8
  },
  pulseBar: {
    width: 10,
    borderRadius: 9999,
    opacity: 0.9
  },
  progressRail: {
    position: "absolute",
    left: 64,
    right: 64,
    top: 64,
    height: 6,
    borderRadius: 9999,
    background: "rgba(255,255,255,0.14)",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 9999
  }
};
