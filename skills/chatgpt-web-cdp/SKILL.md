---
name: chatgpt-web-cdp
description: Reuse ChatGPT web automation over a signed-in browser session exposed through Chrome DevTools Protocol (CDP). Use when Codex needs to open `chatgpt.com`, submit prompts in the web composer, wait for JSON-only assistant replies, watch for new generated images on `https://chatgpt.com/images/`, or download the original image payload from the page without switching to the OpenAI API.
---

# ChatGPT Web CDP

## Overview

Reuse the existing ChatGPT web automation that talks to a browser through CDP instead of the OpenAI API. Keep this skill focused on browser-level ChatGPT primitives so other skills can import one stable module instead of duplicating selectors, polling logic, and image download behavior.

## Quick Start

1. Reuse a Chromium-based browser that is already signed in to `chatgpt.com` and exposes CDP on `http://127.0.0.1:9223`.
2. Import the public module from another skill or project file:

```js
import {
  openChatGpt,
  readChatGptState,
  submitComposerPrompt,
  waitForAssistantJson,
  waitForNewImage,
  saveImageFromPage,
  withChatGptPage
} from "../../chatgpt-web-cdp/scripts/chatgpt-web-cdp.mjs";
```

3. Keep product-specific prompt construction, JSON parsing rules, and downstream business logic in the caller. This skill should only own ChatGPT web page automation and payload extraction.

## Public Module

Use `scripts/chatgpt-web-cdp.mjs` as the stable import target for sibling skills. It re-exports the browser helpers from `scripts/lib/chatgpt_cdp.mjs`.

The exported helpers cover:

- `withChatGptPage(cdpUrl, callback)`: connect to the first ChatGPT tab in the CDP browser
- `openChatGpt(page, url?)`: optionally navigate and then wait for the page to settle
- `readChatGptState(page)`: inspect composer availability, assistant messages, and generated image URLs
- `submitComposerPrompt(page, prompt)`: write into the ChatGPT composer and click send
- `waitForAssistantJson(page, previousMessages, timeoutMs?)`: wait for a new assistant message that contains JSON
- `waitForNewImage(page, knownSources, timeoutMs?)`: wait for a new generated image source
- `saveImageFromPage(page, imageUrl, outputPath)`: download the original image payload through the page session

## Boundaries

- Keep this skill browser-centric. Do not move caller-specific prompt text, schema design, or post-processing here unless multiple skills truly need the same behavior.
- Assume the browser session is already authenticated. If ChatGPT is behind login or Cloudflare, fail fast and let the caller surface that requirement.
- Prefer fixing selectors or polling logic in this skill when ChatGPT's UI changes. Do not duplicate patches across dependent skills.

## Resources

- `scripts/chatgpt-web-cdp.mjs`: stable re-export entrypoint for dependent skills
- `scripts/lib/chatgpt_cdp.mjs`: ChatGPT-specific page state, prompt submission, polling, and image saving
- `scripts/lib/cdp_browser.mjs`: minimal CDP page connection helpers used by the ChatGPT layer
- `references/workflow.md`: environment requirements and troubleshooting notes
