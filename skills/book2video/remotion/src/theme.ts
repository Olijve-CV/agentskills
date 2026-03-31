import type {RenderProps} from "./types";

export type ThemeId =
  | "business-growth"
  | "psychology-cognition"
  | "social-history"
  | "fiction-literature"
  | "universal";

export type ThemeSpec = {
  id: ThemeId;
  label: string;
  kicker: string;
  titleFontFamily: string;
  bodyFontFamily: string;
  canvasGradient: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  panelBackground: string;
  panelBorder: string;
  overlayGradient: string;
  ringColor: string;
  glowGradient: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  chipBackground: string;
  fallbackBackground: string;
  grainOpacity: number;
};

const THEMES: Record<ThemeId, ThemeSpec> = {
  "business-growth": {
    id: "business-growth",
    label: "商业成长",
    kicker: "GROWTH NOTES",
    titleFontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
    bodyFontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
    canvasGradient: "linear-gradient(180deg, #0b1016 0%, #172131 48%, #090d12 100%)",
    accent: "#ffb454",
    accentSoft: "#ffd8a3",
    accentStrong: "#ff8c2e",
    panelBackground: "linear-gradient(180deg, rgba(9,13,18,0.24) 0%, rgba(9,13,18,0.66) 100%)",
    panelBorder: "rgba(255,180,84,0.22)",
    overlayGradient: "linear-gradient(180deg, rgba(7,10,14,0.12) 0%, rgba(7,10,14,0.24) 38%, rgba(7,10,14,0.82) 100%)",
    ringColor: "rgba(255,180,84,0.2)",
    glowGradient: "radial-gradient(circle, rgba(255,180,84,0.26) 0%, rgba(255,180,84,0.08) 42%, rgba(0,0,0,0) 74%)",
    textPrimary: "#faf6ef",
    textSecondary: "#f7d9a8",
    textMuted: "rgba(244,236,224,0.72)",
    chipBackground: "rgba(255,180,84,0.12)",
    fallbackBackground: "linear-gradient(180deg, #182334 0%, #0d141f 100%)",
    grainOpacity: 0.06
  },
  "psychology-cognition": {
    id: "psychology-cognition",
    label: "心理认知",
    kicker: "MIND MAP",
    titleFontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
    bodyFontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
    canvasGradient: "linear-gradient(180deg, #09151b 0%, #102830 44%, #071015 100%)",
    accent: "#7ee7d8",
    accentSoft: "#d2fff8",
    accentStrong: "#3cbfaf",
    panelBackground: "linear-gradient(180deg, rgba(6,17,20,0.24) 0%, rgba(6,17,20,0.64) 100%)",
    panelBorder: "rgba(126,231,216,0.2)",
    overlayGradient: "linear-gradient(180deg, rgba(5,12,14,0.16) 0%, rgba(5,12,14,0.28) 42%, rgba(5,12,14,0.8) 100%)",
    ringColor: "rgba(126,231,216,0.18)",
    glowGradient: "radial-gradient(circle, rgba(126,231,216,0.22) 0%, rgba(126,231,216,0.08) 45%, rgba(0,0,0,0) 76%)",
    textPrimary: "#eefcf7",
    textSecondary: "#b9fff0",
    textMuted: "rgba(226,247,242,0.72)",
    chipBackground: "rgba(126,231,216,0.11)",
    fallbackBackground: "linear-gradient(180deg, #17343a 0%, #0a181b 100%)",
    grainOpacity: 0.05
  },
  "social-history": {
    id: "social-history",
    label: "社会历史",
    kicker: "ARCHIVE CUT",
    titleFontFamily: '"STSong","SimSun","Songti SC","Noto Serif SC",serif',
    bodyFontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
    canvasGradient: "linear-gradient(180deg, #140f10 0%, #332326 45%, #0d090a 100%)",
    accent: "#d8b07d",
    accentSoft: "#f0ddbf",
    accentStrong: "#b27943",
    panelBackground: "linear-gradient(180deg, rgba(20,14,12,0.26) 0%, rgba(20,14,12,0.72) 100%)",
    panelBorder: "rgba(216,176,125,0.2)",
    overlayGradient: "linear-gradient(180deg, rgba(14,10,8,0.08) 0%, rgba(14,10,8,0.2) 36%, rgba(14,10,8,0.84) 100%)",
    ringColor: "rgba(216,176,125,0.16)",
    glowGradient: "radial-gradient(circle, rgba(216,176,125,0.18) 0%, rgba(216,176,125,0.06) 44%, rgba(0,0,0,0) 76%)",
    textPrimary: "#fbf4e8",
    textSecondary: "#efd0a8",
    textMuted: "rgba(247,239,230,0.72)",
    chipBackground: "rgba(216,176,125,0.12)",
    fallbackBackground: "linear-gradient(180deg, #332723 0%, #17100e 100%)",
    grainOpacity: 0.1
  },
  "fiction-literature": {
    id: "fiction-literature",
    label: "小说文学",
    kicker: "STORY ARC",
    titleFontFamily: '"Georgia","Times New Roman","STSong","Songti SC","Noto Serif SC",serif',
    bodyFontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
    canvasGradient: "linear-gradient(180deg, #150e1d 0%, #241534 40%, #0d0913 100%)",
    accent: "#cda6ff",
    accentSoft: "#eddcff",
    accentStrong: "#9b67e8",
    panelBackground: "linear-gradient(180deg, rgba(17,9,24,0.2) 0%, rgba(17,9,24,0.68) 100%)",
    panelBorder: "rgba(205,166,255,0.24)",
    overlayGradient: "linear-gradient(180deg, rgba(8,5,11,0.14) 0%, rgba(8,5,11,0.26) 38%, rgba(8,5,11,0.82) 100%)",
    ringColor: "rgba(205,166,255,0.18)",
    glowGradient: "radial-gradient(circle, rgba(205,166,255,0.24) 0%, rgba(205,166,255,0.08) 44%, rgba(0,0,0,0) 76%)",
    textPrimary: "#f9f2ff",
    textSecondary: "#e7d0ff",
    textMuted: "rgba(237,227,247,0.74)",
    chipBackground: "rgba(205,166,255,0.11)",
    fallbackBackground: "linear-gradient(180deg, #26173a 0%, #110b1a 100%)",
    grainOpacity: 0.07
  },
  universal: {
    id: "universal",
    label: "通用讲书",
    kicker: "BOOK FRAME",
    titleFontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
    bodyFontFamily: '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif',
    canvasGradient: "linear-gradient(180deg, #10151a 0%, #202934 44%, #0b1014 100%)",
    accent: "#e6c78f",
    accentSoft: "#f7e5c6",
    accentStrong: "#cc9f54",
    panelBackground: "linear-gradient(180deg, rgba(7,10,14,0.24) 0%, rgba(7,10,14,0.62) 100%)",
    panelBorder: "rgba(230,199,143,0.16)",
    overlayGradient: "linear-gradient(180deg, rgba(7,10,14,0.12) 0%, rgba(7,10,14,0.24) 40%, rgba(7,10,14,0.8) 100%)",
    ringColor: "rgba(230,199,143,0.16)",
    glowGradient: "radial-gradient(circle, rgba(230,199,143,0.18) 0%, rgba(230,199,143,0.06) 45%, rgba(0,0,0,0) 75%)",
    textPrimary: "#f8f4ed",
    textSecondary: "#f0dfbd",
    textMuted: "rgba(232,226,216,0.72)",
    chipBackground: "rgba(230,199,143,0.11)",
    fallbackBackground: "linear-gradient(180deg, #24303b 0%, #0f141a 100%)",
    grainOpacity: 0.06
  }
};

const CATEGORY_KEYWORDS: Record<Exclude<ThemeId, "universal">, string[]> = {
  "business-growth": [
    "business",
    "management",
    "startup",
    "growth",
    "leadership",
    "marketing",
    "productivity",
    "habit",
    "wealth",
    "decision",
    "商业",
    "成长",
    "创业",
    "管理",
    "领导力",
    "效率",
    "习惯",
    "营销",
    "财富",
    "决策"
  ],
  "psychology-cognition": [
    "psychology",
    "mindset",
    "cognition",
    "emotion",
    "behavior",
    "mental",
    "brain",
    "anxiety",
    "mindfulness",
    "心理",
    "认知",
    "情绪",
    "行为",
    "思维",
    "焦虑",
    "脑",
    "自控",
    "偏见"
  ],
  "social-history": [
    "history",
    "society",
    "culture",
    "politics",
    "civilization",
    "war",
    "nation",
    "biography",
    "memoir",
    "history fiction",
    "historical fiction",
    "历史",
    "社会",
    "文化",
    "政治",
    "文明",
    "人物",
    "传记",
    "回忆录",
    "王朝",
    "唐代",
    "官场",
    "制度",
    "权力",
    "古代"
  ],
  "fiction-literature": [
    "novel",
    "fiction",
    "literature",
    "story",
    "poetry",
    "fantasy",
    "science fiction",
    "thriller",
    "mystery",
    "romance",
    "小说",
    "文学",
    "故事",
    "叙事",
    "虚构",
    "长篇",
    "短篇",
    "寓言",
    "讽刺",
    "现实主义",
    "历史小说"
  ]
};

export function resolveTheme(data: Partial<RenderProps>): ThemeSpec {
  const explicit = normalizeThemeId(data.themeMode || "");
  if (explicit && explicit !== "universal") {
    return THEMES[explicit];
  }

  const categoryTheme = normalizeThemeId(data.bookCategory || "");
  if (categoryTheme) {
    return THEMES[categoryTheme];
  }

  const haystack = [
    data.bookCategory || "",
    ...(data.genreTags || []),
    data.title || "",
    ...((data.scenes || []).flatMap((scene) => [scene.title, scene.subtitle, scene.narration]))
  ]
    .join(" ")
    .toLowerCase();

  let bestTheme: ThemeId = "universal";
  let bestScore = 0;

  for (const [themeId, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<[Exclude<ThemeId, "universal">, string[]]>) {
    const score = keywords.reduce((sum, keyword) => sum + (haystack.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      bestTheme = themeId;
      bestScore = score;
    }
  }

  return bestScore > 0 ? THEMES[bestTheme] : THEMES.universal;
}

function normalizeThemeId(value: string): ThemeId | null {
  const normalized = String(value || "").trim().toLowerCase();
  switch (normalized) {
    case "business-growth":
    case "business":
    case "growth":
    case "商业成长":
    case "商业":
      return "business-growth";
    case "psychology-cognition":
    case "psychology":
    case "cognition":
    case "心理认知":
    case "心理":
      return "psychology-cognition";
    case "social-history":
    case "history":
    case "society":
    case "social":
    case "社会历史":
    case "历史":
      return "social-history";
    case "fiction-literature":
    case "fiction":
    case "literature":
    case "小说文学":
    case "小说":
    case "文学":
      return "fiction-literature";
    case "universal":
    case "通用讲书":
      return "universal";
    default:
      return null;
  }
}
