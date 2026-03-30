---
name: book2video
description: Turn a book link into a researched Chinese short-form book-summary video for Douyin or Video Account. Use when Codex should study a book page plus stronger external sources, write an about-2-minute core-points script, generate per-scene images through `chatgpt-web-cdp`, create voiceover and subtitles, and assemble a vertical video that shows the book title and author at the beginning.
---

# Book To Video

## Overview

Use this skill when the user provides a book-related link and wants a short-form video about the book rather than a plain written summary. The default output is:

- Chinese
- Douyin / Video Account style
- `9:16`
- about 2 minutes
- core-points commentary, not a sales ad
- opening title card with book title and author
- voiceover, subtitles, and BGM selection

This skill is split into three layers:

1. Codex handles research, source judgment, and script design.
2. `scripts/book2video.mjs` handles deterministic prep steps: validating the plan, generating images with `chatgpt-web-cdp`, synthesizing voiceover with `edge-tts`, building subtitles, and preparing runtime metadata.
3. `scripts/render-remotion.mjs` plus `remotion/` handle the visual template render. `ffmpeg` remains a fallback renderer and an indirect dependency of Remotion's render pipeline.

## Inputs

The user should provide a link. This skill is optimized for:

- book catalog / introduction pages
- publisher pages
- readable article pages with excerpts or commentary

The workflow may use stronger external sources if they improve accuracy or signal quality.

## Workflow

### 1. Research the book

Read the user-provided link first. Then gather better supporting material from authoritative or high-signal sources when needed, for example:

- publisher or official product pages
- Douban / Goodreads / Amazon review aggregates
- interviews, long-form reviews, or reading notes that clearly discuss the book

Prefer factual claims that can be grounded in the source set. If you infer beyond the sources, label that clearly in your own reasoning.

Capture:

- book title
- author
- genre / topic
- target reader
- 3 to 5 strongest ideas, tensions, or takeaways
- useful short review angles or memorable framings

### 2. Create a production plan JSON

Write a `production-plan.json` that follows `references/production-plan.md`.

Targets:

- 6 to 8 scenes
- total duration around 110 to 130 seconds before final padding
- first scene is a hook
- the opening title card is rendered separately by the CLI, so scenes should start with the spoken content
- each scene must include narration, subtitle text, and either `image_prompt` or `image_prompts`
- each scene should have an `energy` value of `low`, `medium`, or `high`
- use Chinese wording that works as spoken narration

Do not overstuff a scene. Shorter, cleaner narration usually makes a better short video.

### 3. Validate the plan

Run:

```powershell
node .\skills\book2video\scripts\book2video.mjs validate-plan --plan .\production-plan.json
```

Fix any schema or content issues before generating media.

### 4. Generate images with ChatGPT web

This skill depends on `chatgpt-web-cdp`. Ensure a signed-in Chromium browser is exposed over CDP first.

Run:

```powershell
node .\skills\book2video\scripts\book2video.mjs generate-images --plan .\production-plan.json --out-dir .\output
```

The script will:

- open `https://chatgpt.com/images/`
- submit one prompt per required image
- save images under `output\images`

Keep prompts visually specific. Avoid asking for text inside the image.

### 5. Generate voiceover and subtitles

Run:

```powershell
node .\skills\book2video\scripts\book2video.mjs synthesize-voice --plan .\production-plan.json --out-dir .\output
```

This uses `edge-tts` by default and writes:

- per-scene audio under `output\audio`
- per-scene VTT under `output\vtt`
- a merged `output\subtitles\book2video.srt`
- a runtime plan under `output\book2video.runtime.json`

You can list available voices with:

```powershell
node .\skills\book2video\scripts\book2video.mjs list-voices
```

### 6. Render the video with Remotion

Install the Remotion app dependencies once:

```powershell
cd .\skills\book2video\remotion
npm install
```

Then render:

Run:

```powershell
node .\skills\book2video\scripts\render-remotion.mjs render --out-dir .\output --bgm-dir .\bgm
```

If `--bgm-dir` is provided, the script selects the best local track by scoring filename keywords against the plan's mood and energy hints. If no BGM directory is supplied, it renders voice-only scenes. The Remotion render provides the animated title card, scene layout, overlays, and subtitle presentation.

For template tuning in the Studio:

```powershell
node .\skills\book2video\scripts\render-remotion.mjs studio --out-dir .\output --bgm-dir .\bgm
```

Use `build` to run the full pipeline once the plan is ready:

```powershell
node .\skills\book2video\scripts\book2video.mjs validate-plan --plan .\production-plan.json
node .\skills\book2video\scripts\book2video.mjs generate-images --plan .\production-plan.json --out-dir .\output
node .\skills\book2video\scripts\book2video.mjs synthesize-voice --plan .\production-plan.json --out-dir .\output
node .\skills\book2video\scripts\render-remotion.mjs render --out-dir .\output --bgm-dir .\bgm
```

If Remotion is unavailable, the old `book2video.mjs render` path can still be used as an `ffmpeg` fallback.

## Output Standard

The final video should:

- be vertical `1080x1920`
- start with a title card showing book title and author
- use the Remotion template for title card, scene overlays, and subtitle layout
- keep the voiceover clear over BGM
- feel paced for short-form Chinese video, not like a slow audiobook

## Boundaries

- Do not pretend you have read the entire book unless the sources actually provide the full text.
- Do not fabricate quotes or page-specific claims from weak summaries.
- Use external sources aggressively for signal, but stay conservative about unsupported facts.
- Keep the `chatgpt-web-cdp` dependency focused on image generation primitives. Do not copy its browser logic into this skill.

## Resources

- `references/workflow.md`: environment requirements, workflow notes, and troubleshooting
- `references/production-plan.md`: JSON shape and planning guidance
- `scripts/book2video.mjs`: CLI for validation, image generation, TTS, subtitles, and fallback `ffmpeg` rendering
- `scripts/render-remotion.mjs`: CLI for Remotion Studio and final Remotion render
- `remotion/`: the Remotion composition project
