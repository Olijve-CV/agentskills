# Workflow Reference

## Environment

- Node.js 22 or later
- A Chromium-based browser reachable through CDP at `http://127.0.0.1:9223` unless the caller passes another `cdpUrl`
- A browser profile already signed in to `chatgpt.com`

## Expected Usage

- Import `scripts/chatgpt-web-cdp.mjs` from the calling skill or project.
- Reuse `withChatGptPage()` so the caller does not reimplement target discovery and WebSocket lifecycle handling.
- Capture caller-specific state before prompting so `waitForAssistantJson()` and `waitForNewImage()` can compare against known messages or image sources.

## Troubleshooting

- If `hasEditor` is false, the browser is usually on a login wall, Cloudflare page, or a stale tab. Reopen the tab in the signed-in profile and retry.
- If prompt submission fails, inspect the live composer selectors in `scripts/lib/chatgpt_cdp.mjs` and patch them here instead of inside dependent skills.
- If image extraction fails after a successful generation, inspect the page for updated `backend-api/estuary/content` URLs and update the image source filter in this skill.
