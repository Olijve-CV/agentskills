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
import {resolveTheme} from "./theme";
import type {CompositionProps, RenderProps, SceneData} from "./types";

export const Book2VideoComposition: React.FC<CompositionProps> = (props) => {
  const data = normalizeRenderProps(props);
  const theme = resolveTheme(data);
  const {fps} = useVideoConfig();
  const titleFrames = Math.round(data.titleCardSec * fps);
  let frameCursor = titleFrames;

  return (
    <AbsoluteFill
      style={{
        ...baseStyles.canvas,
        background: theme.canvasGradient,
        color: theme.textPrimary,
        fontFamily: theme.bodyFontFamily
      }}
    >
      <ThemeAtmosphere themeId={theme.id} theme={theme} />
      <TitleCard title={data.title} author={data.author} hook={data.scenes[0]?.subtitle ?? ""} theme={theme} />
      {data.bgm ? (
        <Audio src={data.bgm.url} loop volume={Math.min(0.32, Math.max(0.06, data.bgm.volume ?? 0.18))} />
      ) : null}
      {data.scenes.map((scene) => {
        const durationInFrames = Math.max(1, Math.round(scene.durationSec * fps));
        const from = frameCursor;
        frameCursor += durationInFrames;

        return (
          <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}>
            <SceneCard scene={scene} durationInFrames={durationInFrames} theme={theme} />
            <Audio src={scene.audioUrl} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const TitleCard: React.FC<{title: string; author: string; hook: string; theme: ReturnType<typeof resolveTheme>}> = ({
  title,
  author,
  hook,
  theme
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({
    frame,
    fps,
    config: {
      damping: 16,
      stiffness: 110,
      mass: 0.95
    }
  });
  const fade = interpolate(frame, [0, 10, 62, 84], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.ease
  });

  return (
    <AbsoluteFill
      style={{
        ...baseStyles.titleCard,
        opacity: fade
      }}
    >
      <div style={{...baseStyles.ring, borderColor: theme.ringColor}} />
      <div style={{...baseStyles.glow, background: theme.glowGradient}} />
      <div
        style={{
          ...baseStyles.titleWrap,
          background: theme.panelBackground,
          border: `1px solid ${theme.panelBorder}`,
          transform: `translateY(${(1 - reveal) * 72}px) scale(${0.92 + reveal * 0.08})`
        }}
      >
        <div style={{...baseStyles.kicker, color: theme.accentSoft, letterSpacing: theme.id === "social-history" ? "0.26em" : "0.34em"}}>
          {theme.kicker}
        </div>
        <div style={{...baseStyles.themeLabel, background: theme.chipBackground, color: theme.accent}}>
          {theme.label}
        </div>
        <div style={{...baseStyles.title, fontFamily: theme.titleFontFamily}}>{title}</div>
        <div style={{...baseStyles.author, color: theme.textSecondary}}>作者 {author}</div>
        <div style={{...baseStyles.hook, color: theme.textMuted}}>{hook}</div>
      </div>
    </AbsoluteFill>
  );
};

const SceneCard: React.FC<{
  scene: SceneData;
  durationInFrames: number;
  theme: ReturnType<typeof resolveTheme>;
}> = ({scene, durationInFrames, theme}) => {
  const frame = useCurrentFrame();
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
  const energyColor = getEnergyColor(scene.energy, theme);

  return (
    <AbsoluteFill
      style={{
        ...baseStyles.scene,
        opacity: sceneOpacity
      }}
    >
      {images.map((imageUrl, index) => (
        <Sequence key={`${scene.id}-${index}`} from={index * imageWindow} durationInFrames={imageWindow + 10}>
          <AnimatedImage src={imageUrl} index={index} theme={theme} />
        </Sequence>
      ))}
      <AbsoluteFill style={{...baseStyles.overlay, background: theme.overlayGradient}} />
      <div style={baseStyles.topRow}>
        <div
          style={{
            ...baseStyles.badge,
            color: energyColor,
            borderColor: `${energyColor}66`,
            background: theme.chipBackground
          }}
        >
          {scene.title}
        </div>
        <div style={{...baseStyles.cornerMeta, color: theme.textMuted}}>{theme.label}</div>
      </div>
      <div
        style={{
          ...baseStyles.bottomPanel,
          background: theme.panelBackground,
          border: `1px solid ${theme.panelBorder}`
        }}
      >
        <div style={{...baseStyles.subtitle, fontFamily: theme.titleFontFamily}}>{scene.subtitle}</div>
        <div style={{...baseStyles.meta, color: theme.textMuted}}>
          <span>{Math.round(scene.durationSec)}s</span>
          <span>{energyLabel(scene.energy)}</span>
        </div>
      </div>
      <VoicePulse energy={scene.energy} theme={theme} />
      <div style={{...baseStyles.progressRail, background: `${theme.textPrimary}24`}}>
        <div
          style={{
            ...baseStyles.progressFill,
            width: `${(frame / Math.max(1, durationInFrames)) * 100}%`,
            background: energyColor
          }}
        />
      </div>
      <FilmGrain opacity={theme.grainOpacity} />
    </AbsoluteFill>
  );
};

const AnimatedImage: React.FC<{
  src: string;
  index: number;
  theme: ReturnType<typeof resolveTheme>;
}> = ({src, index, theme}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 100], [1.02 + index * 0.01, 1.13 + index * 0.01], {
    extrapolateRight: "clamp"
  });
  const translateY = interpolate(frame, [0, 100], [index % 2 === 0 ? 0 : -22, index % 2 === 0 ? -32 : 14], {
    extrapolateRight: "clamp"
  });
  const translateX = interpolate(frame, [0, 100], [index % 2 === 0 ? -8 : 8, index % 2 === 0 ? 10 : -10], {
    extrapolateRight: "clamp"
  });
  const opacity = interpolate(frame, [0, 8, 86, 100], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
        opacity
      }}
    >
      {src ? (
        <Img
          src={src}
          style={{
            ...baseStyles.image,
            filter: theme.id === "social-history" ? "saturate(0.78) contrast(1.04)" : theme.id === "fiction-literature" ? "saturate(1.08)" : "none"
          }}
        />
      ) : (
        <AbsoluteFill style={{...baseStyles.imageFallback, background: theme.fallbackBackground}} />
      )}
    </AbsoluteFill>
  );
};

const VoicePulse: React.FC<{energy: SceneData["energy"]; theme: ReturnType<typeof resolveTheme>}> = ({energy, theme}) => {
  const frame = useCurrentFrame();
  const bars = energy === "high" ? 9 : energy === "medium" ? 7 : 5;
  const color = getEnergyColor(energy, theme);

  return (
    <div style={baseStyles.pulseWrap}>
      {Array.from({length: bars}).map((_, index) => {
        const height = 18 + Math.abs(Math.sin((frame + index * 3) / 5)) * (energy === "high" ? 46 : energy === "medium" ? 32 : 18);
        return (
          <div
            key={index}
            style={{
              ...baseStyles.pulseBar,
              height,
              background: color
            }}
          />
        );
      })}
    </div>
  );
};

const ThemeAtmosphere: React.FC<{themeId: string; theme: ReturnType<typeof resolveTheme>}> = ({themeId, theme}) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 46) * 24;

  if (themeId === "psychology-cognition") {
    return (
      <>
        <div style={{...baseStyles.orb, width: 540, height: 540, left: -120, top: 240 + drift, background: `${theme.accent}22`}} />
        <div style={{...baseStyles.orb, width: 380, height: 380, right: 60, top: 140 - drift, background: `${theme.accentStrong}20`}} />
      </>
    );
  }

  if (themeId === "social-history") {
    return (
      <>
        <div style={{...baseStyles.gridLine, top: 180, opacity: 0.18, background: `${theme.accent}55`}} />
        <div style={{...baseStyles.gridLine, top: 260, opacity: 0.12, background: `${theme.accent}44`}} />
        <div style={{...baseStyles.gridLineVertical, left: 130, opacity: 0.1, background: `${theme.accent}33`}} />
      </>
    );
  }

  if (themeId === "fiction-literature") {
    return (
      <>
        <div style={{...baseStyles.swoosh, background: `${theme.accent}20`, transform: `rotate(-14deg) translateX(${drift}px)`}} />
        <div style={{...baseStyles.swoosh, background: `${theme.accentStrong}16`, top: 980, left: -240, transform: `rotate(11deg) translateX(${-drift}px)`}} />
      </>
    );
  }

  if (themeId === "business-growth") {
    return (
      <>
        <div style={{...baseStyles.diagonal, borderColor: `${theme.accent}44`, transform: `translateX(${drift}px) rotate(-18deg)`}} />
        <div style={{...baseStyles.diagonal, borderColor: `${theme.accentStrong}33`, top: 780, transform: `translateX(${-drift}px) rotate(-18deg)`}} />
      </>
    );
  }

  return (
    <>
      <div style={{...baseStyles.orb, width: 460, height: 460, right: -110, top: 140, background: `${theme.accent}16`}} />
      <div style={{...baseStyles.orb, width: 320, height: 320, left: -80, top: 880, background: `${theme.accentStrong}12`}} />
    </>
  );
};

const FilmGrain: React.FC<{opacity: number}> = ({opacity}) => {
  const frame = useCurrentFrame();
  const offset = frame % 24;

  return (
    <AbsoluteFill
      style={{
        opacity,
        mixBlendMode: "screen",
        backgroundImage:
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.16) 0 1px, transparent 1px), radial-gradient(circle at 60% 70%, rgba(255,255,255,0.12) 0 1px, transparent 1px), radial-gradient(circle at 80% 35%, rgba(255,255,255,0.08) 0 1px, transparent 1px)",
        backgroundSize: "130px 130px, 170px 170px, 150px 150px",
        transform: `translate(${offset * 0.8}px, ${-offset * 0.6}px)`
      }}
    />
  );
};

function normalizeRenderProps(input: CompositionProps): RenderProps {
  return {
    title: input.title ?? "Book Video",
    author: input.author ?? "Unknown",
    sourceUrl: input.sourceUrl ?? "",
    bookCategory: input.bookCategory ?? "",
    genreTags: input.genreTags ?? [],
    themeMode: input.themeMode ?? "auto",
    fps: input.fps ?? 30,
    width: input.width ?? 1080,
    height: input.height ?? 1920,
    titleCardSec: input.titleCardSec ?? 2.8,
    totalDurationSec: input.totalDurationSec ?? 120,
    bgm: input.bgm ?? null,
    scenes: input.scenes ?? []
  };
}

function getEnergyColor(energy: SceneData["energy"], theme: ReturnType<typeof resolveTheme>) {
  switch (energy) {
    case "high":
      return theme.accentStrong;
    case "low":
      return theme.accentSoft;
    default:
      return theme.accent;
  }
}

function energyLabel(energy: SceneData["energy"]) {
  switch (energy) {
    case "high":
      return "高能";
    case "low":
      return "沉静";
    default:
      return "平衡";
  }
}

const baseStyles: Record<string, React.CSSProperties> = {
  canvas: {
    overflow: "hidden"
  },
  titleCard: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden"
  },
  ring: {
    position: "absolute",
    width: 880,
    height: 880,
    borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.12)"
  },
  glow: {
    position: "absolute",
    width: 760,
    height: 760,
    borderRadius: 9999
  },
  titleWrap: {
    width: 840,
    padding: "68px 72px 72px",
    borderRadius: 44,
    boxShadow: "0 42px 130px rgba(0,0,0,0.36)",
    backdropFilter: "blur(18px)"
  },
  kicker: {
    fontSize: 24,
    marginBottom: 24,
    textTransform: "uppercase"
  },
  themeLabel: {
    display: "inline-flex",
    alignSelf: "flex-start",
    padding: "10px 20px",
    borderRadius: 9999,
    marginBottom: 30,
    fontSize: 24,
    fontWeight: 700
  },
  title: {
    fontSize: 80,
    lineHeight: 1.12,
    fontWeight: 700,
    letterSpacing: "-0.04em"
  },
  author: {
    marginTop: 22,
    fontSize: 34
  },
  hook: {
    marginTop: 42,
    fontSize: 31,
    lineHeight: 1.45
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
  overlay: {},
  topRow: {
    position: "absolute",
    top: 82,
    left: 64,
    right: 64,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  badge: {
    padding: "14px 24px",
    borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.2)",
    fontSize: 28,
    fontWeight: 700,
    backdropFilter: "blur(14px)"
  },
  cornerMeta: {
    fontSize: 22,
    letterSpacing: "0.12em"
  },
  bottomPanel: {
    position: "absolute",
    left: 58,
    right: 58,
    bottom: 124,
    padding: "34px 36px",
    borderRadius: 34,
    backdropFilter: "blur(22px)"
  },
  subtitle: {
    fontSize: 50,
    lineHeight: 1.28,
    fontWeight: 700,
    letterSpacing: "-0.03em"
  },
  meta: {
    marginTop: 18,
    display: "flex",
    gap: 20,
    fontSize: 24
  },
  pulseWrap: {
    position: "absolute",
    left: 60,
    bottom: 60,
    display: "flex",
    alignItems: "flex-end",
    gap: 8
  },
  pulseBar: {
    width: 10,
    borderRadius: 9999,
    opacity: 0.92
  },
  progressRail: {
    position: "absolute",
    left: 60,
    right: 60,
    top: 58,
    height: 6,
    borderRadius: 9999,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 9999
  },
  orb: {
    position: "absolute",
    borderRadius: 9999,
    filter: "blur(24px)"
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1
  },
  gridLineVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1
  },
  swoosh: {
    position: "absolute",
    width: 1480,
    height: 260,
    left: -180,
    top: 210,
    borderRadius: 9999,
    filter: "blur(36px)"
  },
  diagonal: {
    position: "absolute",
    width: 1040,
    height: 240,
    left: -160,
    top: 220,
    borderTop: "1px solid rgba(255,255,255,0.2)",
    borderBottom: "1px solid rgba(255,255,255,0.12)"
  }
};
