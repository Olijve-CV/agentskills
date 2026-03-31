#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import {
  openChatGpt,
  readChatGptState,
  saveImageFromPage,
  submitComposerPrompt,
  waitForNewImage,
  withChatGptPage
} from "../../chatgpt-web-cdp/scripts/chatgpt-web-cdp.mjs";

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1920;
const DEFAULT_FPS = 30;
const DEFAULT_TITLE_CARD_SEC = 2.8;
const DEFAULT_SCENE_TAIL_PAD_SEC = 0.5;
const DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural";
const DEFAULT_RATE = "+0%";
const DEFAULT_VOLUME = "+0%";
const SUPPORTED_BGM_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"]);

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  switch (command) {
    case "validate-plan":
      await handleValidatePlan(args);
      return;
    case "generate-images":
      await handleGenerateImages(args);
      return;
    case "list-voices":
      await handleListVoices();
      return;
    case "synthesize-voice":
      await handleSynthesizeVoice(args);
      return;
    case "render":
      await handleRender(args);
      return;
    case "build":
      await handleBuild(args);
      return;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

function printHelp() {
  const lines = [
    "book2video CLI",
    "",
    "Commands:",
    "  validate-plan   Validate a production-plan JSON",
    "  generate-images Generate per-scene images through chatgpt-web-cdp",
    "  list-voices     List edge-tts voices",
    "  synthesize-voice Generate per-scene voiceover, VTT, SRT, and runtime plan",
    "  render          Build the final vertical video with title card, subtitles, and optional BGM",
    "  build           Run validate-plan, generate-images, synthesize-voice, and render",
    "",
    "Common options:",
    "  --plan <path>      Path to production-plan.json",
    "  --out-dir <path>   Output directory",
    "  --bgm-dir <path>   Local BGM library directory",
    "  --cdp-url <url>    Override CDP URL for chatgpt-web-cdp",
    "  --voice <name>     Override voice name",
    "  --rate <value>     Override TTS rate, for example +5%",
    "  --volume <value>   Override TTS volume, for example +0%",
    "  --width <n>        Output width, default 1080",
    "  --height <n>       Output height, default 1920",
    "  --fps <n>          Output fps, default 30"
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}

function parseArgs(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

async function handleValidatePlan(args) {
  const plan = await loadPlan(args.plan);
  validatePlan(plan);
  process.stdout.write(JSON.stringify(buildPlanSummary(plan), null, 2) + "\n");
}

async function handleGenerateImages(args) {
  const plan = await loadPlan(args.plan);
  validatePlan(plan);
  const outDir = resolveOutDir(args["out-dir"]);
  const imagesDir = path.join(outDir, "images");
  await fs.mkdir(imagesDir, { recursive: true });

  const cdpUrl = args["cdp-url"] || process.env.CHATGPT_CDP_URL || "";
  const imagePageUrl = args["image-page-url"] || "https://chatgpt.com/images/";
  const scenes = normalizeScenes(plan.scenes);

  await withChatGptPage(cdpUrl, async (page) => {
    await openChatGpt(page, imagePageUrl);
    const pageState = await readChatGptState(page);
    if (!pageState.hasEditor) {
      throw new Error("ChatGPT image page is not ready. Verify the signed-in CDP browser session.");
    }

    for (const scene of scenes) {
      const prompts = getImagePrompts(scene);
      for (let index = 0; index < prompts.length; index += 1) {
        const prompt = prompts[index];
        await openChatGpt(page, imagePageUrl);
        const knownState = await readChatGptState(page);
        const fullPrompt = [
          "Generate one vertical image for a Chinese short-form book-summary video.",
          "Requirements:",
          "- Portrait composition suitable for 1080x1920",
          "- No text, captions, logos, watermarks, or UI",
          "- Rich lighting and clean focal hierarchy",
          "- Consistent with an editorial, cinematic, idea-led visual style",
          "",
          `Scene title: ${scene.title}`,
          `Scene narration summary: ${scene.subtitle || scene.narration}`,
          "",
          `Visual brief: ${prompt}`
        ].join("\n");

        process.stdout.write(`Generating image ${index + 1}/${prompts.length} for ${scene.id}...\n`);
        await submitComposerPrompt(page, fullPrompt);
        const imageUrl = await waitForNewImage(page, knownState.imageSources || []);
        const outputPath = path.join(imagesDir, `${scene.id}-${String(index + 1).padStart(2, "0")}.png`);
        await saveImageFromPage(page, imageUrl, outputPath);
      }
    }
  });

  process.stdout.write(`Images saved to ${imagesDir}\n`);
}

async function handleListVoices() {
  await runCommand("python", ["-m", "edge_tts", "--list-voices"], { stdio: "inherit" });
}

async function handleSynthesizeVoice(args) {
  const plan = await loadPlan(args.plan);
  validatePlan(plan);
  const outDir = resolveOutDir(args["out-dir"]);
  await ensurePipelineDirs(outDir);

  const voiceName = args.voice || plan.voice?.voice_name || DEFAULT_VOICE;
  const rate = args.rate || plan.voice?.rate || DEFAULT_RATE;
  const volume = args.volume || plan.voice?.volume || DEFAULT_VOLUME;
  const scenes = normalizeScenes(plan.scenes);
  const titleCardSec = parseNumber(args["title-card-sec"], DEFAULT_TITLE_CARD_SEC);
  const runtimeScenes = [];

  for (const scene of scenes) {
    const audioPath = path.join(outDir, "audio", `${scene.id}.mp3`);
    const vttPath = path.join(outDir, "vtt", `${scene.id}.vtt`);
    const textPath = path.join(outDir, "audio", `${scene.id}.txt`);
    await fs.writeFile(textPath, `${scene.narration}\n`, "utf8");

    const ttsArgs = [
      "-m",
      "edge_tts",
      "--file",
      textPath,
      "--voice",
      voiceName,
      "--rate",
      rate,
      "--volume",
      volume,
      "--write-media",
      audioPath,
      "--write-subtitles",
      vttPath
    ];

    if (!args.force && await canReuseSynthesizedScene(audioPath, vttPath)) {
      process.stdout.write(`Skipping ${scene.id}; audio and subtitles already exist.\n`);
    } else {
      process.stdout.write(`Synthesizing ${scene.id} with ${voiceName}...\n`);
      await runWithRetries(
        () => runCommand("python", ttsArgs, { stdio: "inherit" }),
        3,
        `${scene.id} voice synthesis`
      );
    }

    const detectedDuration = await parseVttDuration(vttPath);
    const finalDuration = roundDuration(
      Math.max(detectedDuration + DEFAULT_SCENE_TAIL_PAD_SEC, parseNumber(scene.duration_sec, detectedDuration))
    );

    runtimeScenes.push({
      ...scene,
      audio_path: audioPath,
      vtt_path: vttPath,
      images: await listSceneImages(outDir, scene.id),
      voice_duration_sec: roundDuration(detectedDuration),
      render_duration_sec: finalDuration
    });
  }

  const subtitlePath = path.join(outDir, "subtitles", "book2video.srt");
  await writeMergedSrt({
    titleCardSec,
    scenes: runtimeScenes,
    outputPath: subtitlePath
  });

  const runtimePlan = {
    ...plan,
    voice: {
      voice_name: voiceName,
      rate,
      volume
    },
    runtime: {
      generated_at: new Date().toISOString(),
      title_card_sec: titleCardSec,
      subtitle_path: subtitlePath,
      total_duration_sec: roundDuration(
        titleCardSec + runtimeScenes.reduce((sum, scene) => sum + scene.render_duration_sec, 0)
      )
    },
    scenes: runtimeScenes
  };

  const runtimePath = path.join(outDir, "book2video.runtime.json");
  await fs.writeFile(runtimePath, JSON.stringify(runtimePlan, null, 2) + "\n", "utf8");
  process.stdout.write(`Runtime plan written to ${runtimePath}\n`);
}

async function handleRender(args) {
  const runtime = await loadRuntimePlan(args);
  const outDir = resolveOutDir(args["out-dir"]);
  await ensurePipelineDirs(outDir);

  const width = parseInteger(args.width, DEFAULT_WIDTH);
  const height = parseInteger(args.height, DEFAULT_HEIGHT);
  const fps = parseInteger(args.fps, DEFAULT_FPS);
  const titleCardSec = parseNumber(args["title-card-sec"], runtime.runtime?.title_card_sec || DEFAULT_TITLE_CARD_SEC);
  const subtitlePath = runtime.runtime?.subtitle_path || path.join(outDir, "subtitles", "book2video.srt");
  const outputPath = path.resolve(args.output || path.join(outDir, "book2video.mp4"));
  const bgmDir = args["bgm-dir"] ? path.resolve(args["bgm-dir"]) : "";
  const selectedBgm = bgmDir ? await chooseBestBgm(bgmDir, runtime) : null;

  const introFont = await detectChineseFont();
  const titleText = escapeDrawtext(runtime.title || "");
  const authorText = escapeDrawtext(runtime.author ? `作者 ${runtime.author}` : "");
  const hookScene = runtime.scenes[0];
  const hookText = escapeDrawtext(hookScene?.subtitle || hookScene?.narration || "");
  const filterParts = [];
  const concatVideoLabels = ["[v0]"];
  const concatAudioLabels = ["[a0]"];
  const ffmpegArgs = [
    "-y",
    "-f",
    "lavfi",
    "-t",
    `${titleCardSec}`,
    "-i",
    `color=c=#101418:s=${width}x${height}:r=${fps}`,
    "-f",
    "lavfi",
    "-t",
    `${titleCardSec}`,
    "-i",
    "anullsrc=r=24000:cl=stereo"
  ];

  filterParts.push([
    "[0:v]format=yuv420p",
    drawtextFilter({
      text: titleText,
      y: "h*0.34",
      fontSize: Math.round(height * 0.04),
      fontFile: introFont,
      color: "white"
    }),
    drawtextFilter({
      text: authorText,
      y: "h*0.43",
      fontSize: Math.round(height * 0.025),
      fontFile: introFont,
      color: "#e8d9a8"
    }),
    drawtextFilter({
      text: hookText,
      y: "h*0.58",
      fontSize: Math.round(height * 0.024),
      fontFile: introFont,
      color: "#d8dde3"
    }),
    "[v0]"
  ].join(","));
  filterParts.push("[1:a]anull[a0]");

  let nextInputIndex = 2;
  for (let sceneIndex = 0; sceneIndex < runtime.scenes.length; sceneIndex += 1) {
    const scene = runtime.scenes[sceneIndex];
    if (!scene.images?.length) {
      throw new Error(`No images found for ${scene.id}. Run generate-images first.`);
    }

    const perImageDuration = roundDuration(scene.render_duration_sec / scene.images.length);
    for (const imagePath of scene.images) {
      ffmpegArgs.push("-loop", "1", "-t", `${perImageDuration}`, "-i", imagePath);
      const label = `[v${nextInputIndex}]`;
      filterParts.push(
        `[${nextInputIndex}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,format=yuv420p${label}`
      );
      concatVideoLabels.push(label);
      nextInputIndex += 1;
    }
  }

  for (let sceneIndex = 0; sceneIndex < runtime.scenes.length; sceneIndex += 1) {
    const scene = runtime.scenes[sceneIndex];
    ffmpegArgs.push("-i", scene.audio_path);
    const audioInputIndex = nextInputIndex + sceneIndex;
    const audioLabel = `[a${sceneIndex + 1}]`;
    filterParts.push(`[${audioInputIndex}:a]aresample=24000${audioLabel}`);
    concatAudioLabels.push(audioLabel);
  }

  filterParts.push(`${concatVideoLabels.join("")}concat=n=${concatVideoLabels.length}:v=1:a=0[vcat]`);
  filterParts.push(`${concatAudioLabels.join("")}concat=n=${concatAudioLabels.length}:v=0:a=1[voice]`);

  let audioMapLabel = "[voice]";
  if (selectedBgm) {
    process.stdout.write(`Selected BGM: ${selectedBgm}\n`);
    ffmpegArgs.push("-stream_loop", "-1", "-i", selectedBgm);
    const bgmInputIndex = nextInputIndex + runtime.scenes.length;
    const ducking = clamp(parseNumber(runtime.bgm?.ducking, 0.22), 0, 1);
    filterParts.push(
      `[${bgmInputIndex}:a]volume=${roundDuration(ducking)},atrim=0:${runtime.runtime.total_duration_sec}[bgm]`
    );
    filterParts.push("[voice][bgm]amix=inputs=2:duration=first:weights='1 1'[mixed]");
    audioMapLabel = "[mixed]";
  }

  ffmpegArgs.push(
    "-filter_complex",
    filterParts.join(";"),
    "-map",
    "[vcat]",
    "-map",
    audioMapLabel,
    "-vf",
    `subtitles='${escapeSubtitlePath(subtitlePath)}':force_style='FontName=Microsoft YaHei,Alignment=2,MarginV=80,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H20000000,BorderStyle=3,Outline=1,Shadow=0'`,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    outputPath
  );

  await runCommand("ffmpeg", ffmpegArgs, { stdio: "inherit" });
  process.stdout.write(`Video written to ${outputPath}\n`);
}

async function handleBuild(args) {
  await handleValidatePlan(args);
  await handleGenerateImages(args);
  await handleSynthesizeVoice(args);
  await handleRender(args);
}

async function loadPlan(planPath) {
  if (!planPath) {
    throw new Error("Missing --plan <path>");
  }

  const resolvedPath = path.resolve(planPath);
  const raw = stripBom(await fs.readFile(resolvedPath, "utf8"));
  return JSON.parse(raw);
}

async function loadRuntimePlan(args) {
  const outDir = resolveOutDir(args["out-dir"]);
  const runtimePath = path.join(outDir, "book2video.runtime.json");

  try {
    const raw = await fs.readFile(runtimePath, "utf8");
    return JSON.parse(raw);
  } catch {
    const plan = await loadPlan(args.plan);
    validatePlan(plan);
    return {
      ...plan,
      runtime: {
        title_card_sec: DEFAULT_TITLE_CARD_SEC,
        subtitle_path: path.join(outDir, "subtitles", "book2video.srt"),
        total_duration_sec:
          DEFAULT_TITLE_CARD_SEC + normalizeScenes(plan.scenes).reduce((sum, scene) => sum + parseNumber(scene.duration_sec, 0), 0)
      },
      scenes: normalizeScenes(plan.scenes)
    };
  }
}

function validatePlan(plan) {
  const errors = [];

  if (!plan || typeof plan !== "object") {
    throw new Error("Plan must be a JSON object.");
  }

  for (const field of ["title", "author", "source_url", "language", "aspect_ratio"]) {
    if (!stringValue(plan[field])) {
      errors.push(`Missing required top-level field: ${field}`);
    }
  }

  if (!Array.isArray(plan.scenes) || plan.scenes.length < 1) {
    errors.push("Plan must contain at least one scene.");
  }

  if (plan.aspect_ratio !== "9:16") {
    errors.push("This skill currently expects aspect_ratio to be '9:16'.");
  }

  const totalDuration = (plan.scenes || []).reduce((sum, scene) => sum + parseNumber(scene.duration_sec, 0), 0);
  if (totalDuration < 90 || totalDuration > 150) {
    errors.push(`Scene durations should total roughly 90-150 seconds. Current total: ${roundDuration(totalDuration)} seconds.`);
  }

  normalizeScenes(plan.scenes || []).forEach((scene, index) => {
    if (!stringValue(scene.id)) {
      errors.push(`Scene ${index + 1} is missing id.`);
    }
    if (!stringValue(scene.title)) {
      errors.push(`Scene ${scene.id || index + 1} is missing title.`);
    }
    if (!stringValue(scene.narration)) {
      errors.push(`Scene ${scene.id || index + 1} is missing narration.`);
    }
    if (!stringValue(scene.subtitle)) {
      errors.push(`Scene ${scene.id || index + 1} is missing subtitle.`);
    }
    if (!["low", "medium", "high"].includes(scene.energy)) {
      errors.push(`Scene ${scene.id || index + 1} must use energy low/medium/high.`);
    }
    if (!scene.image_prompt && !(Array.isArray(scene.image_prompts) && scene.image_prompts.length > 0)) {
      errors.push(`Scene ${scene.id || index + 1} needs image_prompt or image_prompts.`);
    }
  });

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }
}

function normalizeScenes(rawScenes) {
  return (rawScenes || []).map((scene, index) => ({
    id: scene.id || `scene-${String(index + 1).padStart(2, "0")}`,
    title: scene.title || `Scene ${index + 1}`,
    narration: normalizeWhitespace(scene.narration || ""),
    subtitle: normalizeWhitespace(scene.subtitle || scene.narration || ""),
    image_prompt: scene.image_prompt ? normalizeWhitespace(scene.image_prompt) : "",
    image_prompts: Array.isArray(scene.image_prompts)
      ? scene.image_prompts.map((item) => normalizeWhitespace(item)).filter(Boolean)
      : [],
    duration_sec: parseNumber(scene.duration_sec, 0),
    images_per_scene: Math.max(1, parseInteger(scene.images_per_scene, 2)),
    energy: scene.energy || "medium",
    audio_path: scene.audio_path || ""
  }));
}

function getImagePrompts(scene) {
  if (scene.image_prompts?.length) {
    return scene.image_prompts;
  }

  const count = Math.max(1, scene.images_per_scene || 1);
  return Array.from({ length: count }, (_, index) => {
    if (count === 1) {
      return scene.image_prompt;
    }
    return `${scene.image_prompt}\nVariation ${index + 1} of ${count}. Keep the same scene meaning and visual identity, but vary composition and camera distance.`;
  });
}

function buildPlanSummary(plan) {
  const scenes = normalizeScenes(plan.scenes);
  return {
    title: plan.title,
    author: plan.author,
    source_url: plan.source_url,
    scene_count: scenes.length,
    duration_target_sec: plan.duration_target_sec,
    total_scene_duration_sec: roundDuration(scenes.reduce((sum, scene) => sum + scene.duration_sec, 0)),
    total_images: scenes.reduce((sum, scene) => sum + getImagePrompts(scene).length, 0),
    voice: plan.voice?.voice_name || DEFAULT_VOICE
  };
}

async function ensurePipelineDirs(outDir) {
  for (const folder of ["audio", "images", "subtitles", "vtt"]) {
    await fs.mkdir(path.join(outDir, folder), { recursive: true });
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function canReuseSynthesizedScene(audioPath, vttPath) {
  try {
    const [audioStat, vttStat] = await Promise.all([fs.stat(audioPath), fs.stat(vttPath)]);
    if (audioStat.size <= 0 || vttStat.size <= 0) {
      return false;
    }
    await parseVttDuration(vttPath);
    return true;
  } catch {
    return false;
  }
}

function resolveOutDir(outDir) {
  return path.resolve(outDir || path.join(process.cwd(), "output"));
}

async function listSceneImages(outDir, sceneId) {
  const imagesDir = path.join(outDir, "images");
  const entries = await fs.readdir(imagesDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && entry.name.startsWith(`${sceneId}-`))
    .map((entry) => path.join(imagesDir, entry.name))
    .sort();
}

async function parseVttDuration(vttPath) {
  const raw = await fs.readFile(vttPath, "utf8");
  const matches = [...raw.matchAll(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[.,]\d{3})/g)];
  if (!matches.length) {
    throw new Error(`Could not determine duration from ${vttPath}`);
  }
  return parseTimestamp(matches[matches.length - 1][2]);
}

async function writeMergedSrt({ titleCardSec, scenes, outputPath }) {
  let current = titleCardSec;
  const blocks = [];

  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    const start = current;
    const end = current + scene.render_duration_sec;
    blocks.push(
      [
        `${index + 1}`,
        `${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}`,
        scene.subtitle || scene.narration || "",
        ""
      ].join("\n")
    );
    current = end;
  }

  await fs.writeFile(outputPath, blocks.join("\n"), "utf8");
}

function parseTimestamp(value) {
  const match = /^(\d{2}):(\d{2}):(\d{2})[.,](\d{3})$/.exec(value);
  if (!match) {
    return 0;
  }
  const [, hh, mm, ss, ms] = match;
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + Number(ms) / 1000;
}

function formatSrtTimestamp(totalSeconds) {
  const totalMs = Math.round(totalSeconds * 1000);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = totalMs % 1000;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":") + "," + String(milliseconds).padStart(3, "0");
}

async function chooseBestBgm(bgmDir, runtimePlan) {
  const files = await walkFiles(bgmDir);
  const candidates = files.filter((file) => SUPPORTED_BGM_EXTENSIONS.has(path.extname(file).toLowerCase()));
  if (!candidates.length) {
    return null;
  }

  const queryTokens = tokenize([
    runtimePlan.bgm?.query || "",
    ...(runtimePlan.bgm?.mood_tags || []),
    ...runtimePlan.scenes.map((scene) => scene.energy || "")
  ].join(" "));

  const scored = candidates
    .map((file) => ({
      file,
      score: scoreBgmCandidate(path.basename(file), queryTokens)
    }))
    .sort((left, right) => right.score - left.score || left.file.localeCompare(right.file));

  return scored[0]?.file || null;
}

function scoreBgmCandidate(name, queryTokens) {
  const fileTokens = tokenize(name);
  const overlap = fileTokens.filter((token) => queryTokens.includes(token)).length;
  const energyBonus =
    (fileTokens.includes("high") || fileTokens.includes("energetic") || fileTokens.includes("dramatic")) && queryTokens.includes("high")
      ? 2
      : 0;
  const calmBonus =
    (fileTokens.includes("calm") || fileTokens.includes("piano") || fileTokens.includes("ambient")) && queryTokens.includes("low")
      ? 1
      : 0;
  return overlap * 3 + energyBonus + calmBonus;
}

async function walkFiles(rootDir) {
  const results = [];
  const entries = await fs.readdir(rootDir, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walkFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

function drawtextFilter({ text, y, fontSize, fontFile, color }) {
  const parts = [];
  if (fontFile) {
    parts.push(`fontfile='${escapeSubtitlePath(fontFile)}'`);
  }
  parts.push(`text='${text}'`);
  parts.push("x=(w-text_w)/2");
  parts.push(`y=${y}`);
  parts.push(`fontsize=${fontSize}`);
  parts.push(`fontcolor=${color}`);
  parts.push("borderw=2");
  parts.push("bordercolor=#00000099");
  parts.push("line_spacing=10");
  return `drawtext=${parts.join(":")}`;
}

async function detectChineseFont() {
  const candidates = [
    "C:\\Windows\\Fonts\\msyh.ttc",
    "C:\\Windows\\Fonts\\msyhbd.ttc",
    "C:\\Windows\\Fonts\\simhei.ttf"
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return "";
}

function escapeDrawtext(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/%/g, "\\%");
}

function escapeSubtitlePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'");
}

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

function stringValue(value) {
  return normalizeWhitespace(value).length > 0;
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundDuration(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: process.env,
      stdio: options.stdio || "pipe",
      shell: false
    });

    let stderr = "";
    if (child.stderr && options.stdio !== "inherit") {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || `${command} exited with code ${code}`));
    });
  });
}

async function runWithRetries(action, maxAttempts, label) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await action();
      return;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
      process.stdout.write(`${label} failed on attempt ${attempt}/${maxAttempts}. Retrying...\n`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }

  throw lastError;
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
