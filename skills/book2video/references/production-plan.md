# Production Plan Format

Use a `production-plan.json` file as the handoff between research and rendering.

## Required Top-Level Fields

```json
{
  "title": "Atomic Habits",
  "author": "James Clear",
  "source_url": "https://example.com/book-page",
  "language": "zh-CN",
  "aspect_ratio": "9:16",
  "book_category": "business-growth",
  "genre_tags": ["habit", "self-improvement", "behavior"],
  "theme_mode": "auto",
  "duration_target_sec": 120,
  "voice": {
    "voice_name": "zh-CN-XiaoxiaoNeural",
    "rate": "+0%",
    "volume": "+0%"
  },
  "bgm": {
    "query": "uplifting thoughtful motivational piano",
    "mood_tags": ["uplifting", "thoughtful", "clear"],
    "ducking": 0.22
  },
  "scenes": []
}
```

## Optional Theme Metadata

The Remotion renderer supports automatic visual theme selection. To make that reliable, include these optional top-level fields whenever possible:

- `book_category`: one of `business-growth`, `psychology-cognition`, `social-history`, `fiction-literature`
- `genre_tags`: a short string array with topic clues
- `theme_mode`: usually `auto`; set an explicit theme only when you want to override classification

If `book_category` is absent, the renderer falls back to keyword-based classification using `genre_tags`, title, and scene text. If classification is weak, it uses the universal premium book-summary theme.

## Required Scene Fields

Each scene must contain:

```json
{
  "id": "scene-01",
  "title": "Hook",
  "narration": "你以为这本书在讲自律，其实它在讲环境如何偷偷塑造你。",
  "subtitle": "你以为它在讲自律，其实在讲环境如何塑造你。",
  "image_prompt": "Vertical cinematic editorial illustration of a person surrounded by tiny repeated daily actions shaping a larger identity, warm light, layered composition, no text.",
  "energy": "high",
  "duration_sec": 14,
  "images_per_scene": 2
}
```

You may use `image_prompts` instead of `image_prompt` when each image in the scene should be materially different:

```json
{
  "id": "scene-03",
  "title": "Point Two",
  "narration": "...",
  "subtitle": "...",
  "image_prompts": [
    "Prompt A",
    "Prompt B"
  ],
  "energy": "medium",
  "duration_sec": 18
}
```

## Planning Guidance

- `duration_sec` is a planning hint. The CLI may extend a scene slightly to avoid cutting off voiceover.
- Use spoken Chinese for `narration`.
- Keep `subtitle` close to narration but tighter and easier to read.
- `images_per_scene` should usually be `1` to `3`.
- `energy` must be `low`, `medium`, or `high`.

## Recommended Shape

- `scene-01`: hook
- `scene-02`: why this book matters
- `scene-03` to `scene-06`: core ideas
- optional `scene-07`: contrast, warning, or counterintuitive point
- final scene: conclusion or action takeaway

## Quality Bar

- Avoid unsupported direct quotes.
- Avoid book-report phrasing.
- Prefer one clear idea per scene.
- Use image prompts that imply mood and symbolism instead of literal cover art.
- When possible, set `book_category` deliberately so the visual theme matches the book type.
