#!/usr/bin/env node

import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SUPPORTED_BGM_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"]);
const MIME_TYPES = new Map([
  [".json", "application/json; charset=utf-8"],
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".m4a", "audio/mp4"],
  [".aac", "audio/aac"],
  [".flac", "audio/flac"],
  [".ogg", "audio/ogg"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  switch (command) {
    case "render":
      await handleRender(args);
      return;
    case "studio":
      await handleStudio(args);
      return;
    case "prepare":
      await handlePrepare(args);
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
  process.stdout.write(
    [
      "render-remotion CLI",
      "",
      "Commands:",
      "  prepare   Create Remotion-ready props JSON from book2video runtime output",
      "  studio    Start Remotion Studio with a local asset server",
      "  render    Render the final MP4 through Remotion",
      "",
      "Common options:",
      "  --out-dir <path>    Output directory that contains book2video.runtime.json",
      "  --bgm-dir <path>    Optional local BGM library directory",
      "  --output <path>     Final MP4 output path",
      "  --port <number>     Fixed local asset-server port",
      "  --fps <number>      Override fps",
      "  --width <number>    Override width",
      "  --height <number>   Override height"
    ].join("\n") + "\n"
  );
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

async function handlePrepare(args) {
  const prep = await prepareRenderContext(args);
  await fs.writeFile(prep.propsFilePath, JSON.stringify(prep.renderProps, null, 2) + "\n", "utf8");
  process.stdout.write(`Remotion props written to ${prep.propsFilePath}\n`);
}

async function handleStudio(args) {
  const prep = await prepareRenderContext(args);
  const server = await startAssetServer(prep);
  process.stdout.write(`Asset server ready at ${prep.baseUrl}\n`);
  const launchPropsPath = await writeLaunchProps(prep);

  try {
    await runCommand(getRemotionCli(prep.remotionDir), ["studio", "src/index.ts", "--props", launchPropsPath], {
      cwd: prep.remotionDir,
      stdio: "inherit"
    });
  } finally {
    await closeServer(server);
  }
}

async function handleRender(args) {
  const prep = await prepareRenderContext(args);
  const server = await startAssetServer(prep);
  process.stdout.write(`Asset server ready at ${prep.baseUrl}\n`);

  const outputPath = path.resolve(args.output || path.join(prep.outDir, "book2video.remotion.mp4"));
  const launchPropsPath = await writeLaunchProps(prep);

  try {
    await runCommand(
      getRemotionCli(prep.remotionDir),
      [
        "render",
        "src/index.ts",
        "Book2Video",
        outputPath,
        "--props",
        launchPropsPath
      ],
      {
        cwd: prep.remotionDir,
        stdio: "inherit"
      }
    );
  } finally {
    await closeServer(server);
  }
}

function getRemotionCli(remotionDir) {
  return path.join(remotionDir, "node_modules", ".bin", process.platform === "win32" ? "remotion.cmd" : "remotion");
}

async function prepareRenderContext(args) {
  const outDir = path.resolve(args["out-dir"] || path.join(process.cwd(), "output"));
  const runtimePath = path.join(outDir, "book2video.runtime.json");
  const raw = await fs.readFile(runtimePath, "utf8");
  const runtime = JSON.parse(stripBom(raw));

  if (!Array.isArray(runtime.scenes) || runtime.scenes.length === 0) {
    throw new Error(`No scenes found in ${runtimePath}`);
  }

  const remotionDir = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "remotion"));
  const port = Number.parseInt(args.port || "0", 10);
  const bgmDir = args["bgm-dir"] ? path.resolve(args["bgm-dir"]) : "";
  const selectedBgm = bgmDir ? await chooseBestBgm(bgmDir, runtime) : null;
  const propsFilePath = path.join(outDir, "book2video.render-props.json");
  const fps = Number.parseInt(args.fps || runtime.fps || "30", 10);
  const width = Number.parseInt(args.width || runtime.width || "1080", 10);
  const height = Number.parseInt(args.height || runtime.height || "1920", 10);

  const renderProps = {
    title: runtime.title,
    author: runtime.author,
    sourceUrl: runtime.source_url,
    fps,
    width,
    height,
    titleCardSec: runtime.runtime?.title_card_sec || 2.8,
    totalDurationSec: runtime.runtime?.total_duration_sec || 120,
    bgm: selectedBgm ? {path: selectedBgm, volume: runtime.bgm?.ducking || 0.18} : null,
    scenes: runtime.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      subtitle: scene.subtitle,
      narration: scene.narration,
      energy: scene.energy,
      durationSec: scene.render_duration_sec || scene.duration_sec,
      audioPath: scene.audio_path,
      imagePaths: scene.images || []
    }))
  };

  await fs.writeFile(propsFilePath, JSON.stringify(renderProps, null, 2) + "\n", "utf8");

  return {
    outDir,
    runtime,
    remotionDir,
    port,
    renderProps,
    propsFilePath,
    selectedBgm,
    baseUrl: "",
    extraFiles: selectedBgm ? new Map([["/__bgm__/selected" + path.extname(selectedBgm).toLowerCase(), selectedBgm]]) : new Map()
  };
}

async function startAssetServer(context) {
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(requestUrl.pathname);

      if (pathname === "/book2video.render-props.json") {
        response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
        response.end(JSON.stringify(buildServedRenderProps(context), null, 2));
        return;
      }

      if (context.extraFiles.has(pathname)) {
        await pipeFile(context.extraFiles.get(pathname), response);
        return;
      }

      const relativePath = pathname.replace(/^\/+/, "");
      const fullPath = path.resolve(context.outDir, relativePath);
      if (!fullPath.startsWith(context.outDir)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      await pipeFile(fullPath, response);
    } catch (error) {
      response.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
      response.end(error instanceof Error ? error.message : "Not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(context.port, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not determine asset server address.");
  }

  context.baseUrl = `http://127.0.0.1:${address.port}`;
  return server;
}

function buildServedRenderProps(context) {
  return {
    ...context.renderProps,
    bgm: context.selectedBgm
      ? {
          url: `${context.baseUrl}/__bgm__/selected${path.extname(context.selectedBgm).toLowerCase()}`,
          volume: context.renderProps.bgm?.volume || 0.18
        }
      : null,
    scenes: context.renderProps.scenes.map((scene) => ({
      ...scene,
      audioUrl: `${context.baseUrl}/${toUrlPath(context.outDir, scene.audioPath)}`,
      imageUrls: scene.imagePaths.map((imagePath) => `${context.baseUrl}/${toUrlPath(context.outDir, imagePath)}`)
    }))
  };
}

async function writeLaunchProps(context) {
  const launchPropsPath = path.join(context.outDir, "book2video.remotion-launch.json");
  await fs.writeFile(
    launchPropsPath,
    JSON.stringify({dataUrl: `${context.baseUrl}/book2video.render-props.json`}, null, 2) + "\n",
    "utf8"
  );
  return launchPropsPath;
}

function toUrlPath(rootDir, filePath) {
  return path
    .relative(rootDir, filePath)
    .split(path.sep)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function pipeFile(filePath, response) {
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  response.writeHead(200, {"Content-Type": MIME_TYPES.get(ext) || "application/octet-stream"});
  response.end(buffer);
}

async function closeServer(server) {
  if (!server?.listening) {
    return;
  }
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
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
    ...(runtimePlan.scenes || []).map((scene) => scene.energy || "")
  ].join(" "));

  const scored = candidates
    .map((file) => ({file, score: scoreBgmCandidate(path.basename(file), queryTokens)}))
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
  const entries = await fs.readdir(rootDir, {withFileTypes: true}).catch(() => []);

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

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const useShell = process.platform === "win32" && /\.cmd$/i.test(command);
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: process.env,
      stdio: options.stdio || "pipe",
      shell: useShell
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

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
