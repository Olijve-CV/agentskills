# Task Plan: book2video skill

## Goal
Create a reusable `book2video` skill that accepts a book title or URL, researches the source material, generates an approximately 2-minute video script, creates per-segment images via `chatgpt-web-cdp`, assembles a subtitled video, and shows the book title and author at the beginning.

## Current Phase
Phase 4

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand the exact target workflow and user expectations
- [x] Inspect existing local skills and dependencies
- [x] Document constraints and open questions
- **Status:** complete

### Phase 2: Design & Structure
- [x] Choose skill structure and bundled resources
- [x] Define workflow, inputs, outputs, and validation behavior
- [x] Document key decisions
- **Status:** complete

### Phase 3: Implementation
- [x] Create or update the skill files
- [x] Add any helper scripts or references needed
- [x] Integrate with `chatgpt-web-cdp`
- **Status:** complete

### Phase 4: Testing & Verification
- [ ] Validate the skill on at least one realistic prompt
- [x] Fix issues found during validation
- [x] Record test outcomes
- **Status:** in_progress

### Phase 5: Delivery
- [ ] Review changed files
- [ ] Summarize usage and constraints
- [ ] Hand off to the user
- **Status:** pending

## Key Questions
1. Is the target book input scope title-only, URL-only, or both with automatic fallback?
2. Which video assembly stack should the skill standardize on locally?
3. What language, tone, and platform format should the default 2-minute output target?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use `brainstorming` before implementation | Required for new functionality and helps reduce rework |
| Use planning files for this task | The workflow spans discovery, implementation, and validation |
| Use a researched production-plan JSON as the handoff between reasoning and media rendering | Research and script design are flexible; rendering steps should be deterministic |
| Reuse `chatgpt-web-cdp` only for image generation primitives | Keeps browser automation maintained in one sibling skill |
| Treat `ffmpeg` as an external dependency instead of inventing a custom renderer | Standard tool for vertical video assembly, subtitles, and audio mixing |
| Use `edge-tts` as the default voice engine | It is available locally and produces better Chinese voices than legacy Windows speech synthesis |
| Use `Remotion + ffmpeg` as the default rendering architecture | Gives the skill a maintainable template layer while keeping deterministic media prep and fallback rendering |
| Use four auto-mapped visual themes with a universal fallback | Matches the user's requirement for type-aware styling without forcing uncertain classifications |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| JSON parse failure on BOM-prefixed files | 1 | Strip UTF-8 BOM before `JSON.parse` in the CLI loader |
| `edge-tts` subtitle timestamps used commas instead of dots | 1 | Relax timestamp parsing to accept both formats |
| Partial zero-byte TTS outputs were treated as reusable cache | 1 | Reuse only non-empty outputs whose subtitle duration parses successfully |
| Assumed `remotion` package exposed the CLI binary | 1 | Add `@remotion/cli` and invoke the local `.bin/remotion(.cmd)` executable |
| Windows `--props` JSON quoting broke Remotion CLI invocation | 1 | Pass a props file path instead of inline JSON |

## Notes
- Existing sibling skill: `skills/chatgpt-web-cdp`
- Existing target folder: `skills/book2video`
- User preferences captured: Douyin/Video Account style, Chinese output, link input required, core-points commentary, external research allowed, voiceover plus rhythm-aware BGM selection desired
