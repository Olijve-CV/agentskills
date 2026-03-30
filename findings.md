# Findings & Decisions

## Requirements
- Build or complete a `book2video` skill.
- Input should be a book or book link.
- The skill should research the book first.
- The skill should generate an about 2-minute text/script.
- Each script segment should drive image generation through `chatgpt-web-cdp`.
- The final output should be a video with subtitles.
- The opening section should show book title and author.
- The user is open to requirement clarification before implementation starts.
- Default target platform is Douyin / Video Account style short video.
- Default output language is Chinese.
- Input is required to be a link, not title-only.
- Supported source links should focus on catalog/introduction pages and directly readable content pages.
- Default content form is a core-points style "talking about the book" video, not a pure recommendation ad.
- The workflow may and should use stronger external sources beyond the provided URL to extract high-signal summaries and reviews.
- The final video should include voiceover and automatic BGM selection based on rhythm/energy.

## Research Findings
- Local workspace contains `skills/book2video` and `skills/chatgpt-web-cdp`.
- `chatgpt-web-cdp` already exposes reusable browser primitives for signed-in ChatGPT web automation over CDP.
- The `chatgpt-web-cdp` skill is intentionally browser-centric and expects caller skills to own prompt design and downstream workflow.
- `skills/book2video` currently appears empty.
- `chatgpt-web-cdp` exports `withChatGptPage`, `openChatGpt`, `readChatGptState`, `submitComposerPrompt`, `waitForAssistantJson`, `waitForNewImage`, and `saveImageFromPage`.
- Local environment has Node.js 22.22.0 and Python 3.11.2.
- Local environment does not currently expose `ffmpeg` or `ffprobe` on PATH.
- `edge-tts` is installed locally and its CLI is available via `python -m edge_tts`.
- `edge-tts` subtitle output uses comma-separated timestamps such as `00:00:05,512`.
- Latest npm versions resolved during implementation: `remotion@4.0.441`, `@remotion/media@4.0.441`, `@remotion/cli@4.0.441`, `react@19.2.4`, `react-dom@19.2.4`.
- The Remotion CLI binary is provided by `@remotion/cli`, not by the `remotion` package itself.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Keep `chatgpt-web-cdp` as a dependency instead of duplicating browser automation | Reduces maintenance and follows sibling skill boundary |
| Implement the skill as instructions plus helper scripts rather than a single all-knowing scraper | External research is better handled by the agent; media assembly needs deterministic tooling |
| Use a structured production-plan JSON between research and rendering | Makes image generation, TTS, subtitles, and video rendering scriptable and testable |
| Add automatic retry and resumability to TTS synthesis | Edge-based online synthesis can timeout intermittently; long runs need resume support |
| Separate the Remotion renderer into its own wrapper script and project folder | Keeps the existing prep CLI stable while adding a stronger template layer |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| PowerShell environment blocks setting `Console.OutputEncoding` in constrained language mode | Ignore the warning; file reads still succeed |
| Temporary JSON files written by PowerShell may include a UTF-8 BOM | Strip the BOM in the loader so validation works on common Windows-authored files |
| Interrupted TTS runs can leave behind zero-byte audio or subtitle files | Treat only non-empty, parseable artifacts as cache hits |
| Inline `--props` JSON is unreliable on Windows with Remotion CLI | Write a launch props JSON file and pass its path instead |

## Resources
- `E:\WorkSpace\Olijve-CV\agentskills\skills\chatgpt-web-cdp\SKILL.md`
- `E:\WorkSpace\Olijve-CV\agentskills\skills\chatgpt-web-cdp\references\workflow.md`
- `E:\WorkSpace\Olijve-CV\agentskills\skills\chatgpt-web-cdp\scripts\chatgpt-web-cdp.mjs`
- `E:\WorkSpace\Olijve-CV\agentskills\skills\chatgpt-web-cdp\scripts\lib\chatgpt_cdp.mjs`
- `E:\WorkSpace\Olijve-CV\agentskills\skills\book2video`
- `E:\WorkSpace\Olijve-CV\agentskills\skills\book2video\remotion`

## Visual/Browser Findings
- None yet.
