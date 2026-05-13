# Visual Affiliate Story Engine

Next.js 15 + React 19 app that turns a product photo into 4–5 affiliate scene prompts (voiceover + text-to-image + image-to-video) and generates a reference image per scene.

The AI backend is **self-hosted Viber** (OpenAI-compatible API) — not Gemini.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies
   ```
   npm install
   ```
2. Copy env and fill in your API key
   ```
   cp .env.example .env.local
   ```
   Then edit `.env.local`:
   ```
   NEXT_PUBLIC_VIBER_API_KEY=your_key_here
   NEXT_PUBLIC_AI_BASE_URL=https://gstd.viber.id/v1
   NEXT_PUBLIC_AI_TEXT_MODEL=grok-4
   NEXT_PUBLIC_AI_IMAGE_MODEL=grok-imagine-1.0
   ```
3. Run
   ```
   npm run dev
   ```

## Where the AI calls live

All HTTP to the Viber endpoint goes through [`lib/ai.ts`](./lib/ai.ts):

| Function | Endpoint | Default model |
|---|---|---|
| `generateTextFromImage` | `POST /v1/chat/completions` (multimodal vision) | `grok-4` |
| `generateImageFromImage` | `POST /v1/chat/completions` with `image_config` | `grok-imagine-1.0` |

Both use `Authorization: Bearer <NEXT_PUBLIC_VIBER_API_KEY>`. Swap models via env — no code change needed.

## Security note

The API key is exposed to the browser (`NEXT_PUBLIC_*`) because the original app calls the AI directly from the client. For production, move these calls behind a Next.js Route Handler (e.g. `app/api/ai/route.ts`) and use a non-`NEXT_PUBLIC_` env var so the key stays server-side.
