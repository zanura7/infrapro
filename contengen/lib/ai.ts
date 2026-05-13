/**
 * AI client. Calls the local Next.js API route at /api/ai, which proxies to
 * the Viber AI endpoint server-side. The browser never sees the API key, and
 * the route handles CORS + forces stream:false.
 *
 * Model names stay on the client side via NEXT_PUBLIC_* so the user can swap
 * them without touching code; the API key lives only on the server (VIBER_API_KEY).
 */

const PROXY_URL = "/api/ai";

const TEXT_MODEL =
  process.env.NEXT_PUBLIC_AI_TEXT_MODEL || "grok-4.20-beta";
const IMAGE_MODEL =
  process.env.NEXT_PUBLIC_AI_IMAGE_MODEL || "grok-imagine-1.0";
const VIDEO_MODEL =
  process.env.NEXT_PUBLIC_AI_VIDEO_MODEL || "grok-imagine-1.0-video";

async function postJson<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText} — ${text.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

interface ChatPart {
  type?: string;
  text?: string;
  image_url?: { url?: string };
  video_url?: { url?: string };
  url?: string;
  b64_json?: string;
}
interface ChatChoice {
  message?: { content?: string | ChatPart[]; };
}
interface ChatResponse {
  choices?: ChatChoice[];
  data?: Array<{ b64_json?: string; url?: string }>;
}

/**
 * Generate text from a prompt + reference image (vision input).
 * `model` overrides the default text model — useful when you want
 * to swap between Claude / GPT / Grok at call site.
 */
export async function generateTextFromImage(opts: {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  model?: string;
}): Promise<string> {
  const dataUrl = `data:${opts.mimeType};base64,${opts.imageBase64}`;

  const body = {
    model: opts.model || TEXT_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: opts.prompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  };

  const res = await postJson<ChatResponse>(body);
  const content = res.choices?.[0]?.message?.content;

  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === "string" ? c : c.text || ""))
      .join("");
  }
  throw new Error("No text content in response.");
}

/**
 * Content strategy returned by the analysis LLM.
 * The LLM is instructed to return JSON matching this shape.
 */
export interface ContentStrategy {
  product: {
    name: string;
    category: string;
    description: string;
    key_features: string[];
  };
  audience: {
    primary: string;
    psychographics: string;
    pain_points: string[];
  };
  strategy: {
    angle: string;
    rationale: string;
  };
  format: {
    type: string;
    aspect_ratio: string;
    rationale: string;
  };
  hook: string;
  cta: string;
  image_prompt: string;
  video_prompt: string;
}

const STRATEGY_SYSTEM_PROMPT = `You are a senior content strategist for affiliate marketing.
You analyze product images and decide the best creative strategy + format,
then output prompts a downstream image/video model can execute.

You MUST return ONLY valid JSON. No prose before or after, no markdown fences.
The JSON shape:

{
  "product": {
    "name": "concise product name as you see it",
    "category": "short category (e.g. 'Personal Care · Skincare')",
    "description": "1-2 sentence factual description",
    "key_features": ["3-5 short bullet observations from the image"]
  },
  "audience": {
    "primary": "single-line audience description (age range, gender, lifestyle)",
    "psychographics": "what they care about, in one sentence",
    "pain_points": ["2-4 short pain points this product solves"]
  },
  "strategy": {
    "angle": "one of: trust | story | authority | fomo | aspiration | problem-solution | social-proof",
    "rationale": "1-2 sentences why this angle fits this product + audience"
  },
  "format": {
    "type": "one of: single_poster | carousel | reel | story | short_video",
    "aspect_ratio": "one of: 9:16 | 1:1 | 4:5 | 16:9",
    "rationale": "1-2 sentences why this format wins for this product"
  },
  "hook": "the headline / first 3 seconds — punchy, max 12 words, in the requested language",
  "cta": "the call to action — max 8 words, in the requested language",
  "image_prompt": "detailed text-to-image prompt for a photorealistic ad image. Must lock the product's exact shape, color, label, packaging. Include environment + people + lighting + camera style. The product must look IDENTICAL to the reference.",
  "video_prompt": "detailed image-to-video prompt for an 8-second clip starting from the generated image. Describe the motion, camera movement, and human interaction. Keep the product identity locked."
}`;

/**
 * Analyze a product image and return a full content strategy as structured JSON.
 * `model` lets you pick which vision LLM to use (e.g. claude-sonnet-4-5, gpt-4o, grok-4).
 */
export async function generateStrategy(opts: {
  imageBase64: string;
  mimeType: string;
  language: "indonesian" | "malay" | "english";
  productContext?: string;
  model?: string;
}): Promise<ContentStrategy> {
  const languageName =
    opts.language === "indonesian"
      ? "Indonesian (Bahasa Indonesia)"
      : opts.language === "malay"
        ? "Malaysian (Bahasa Melayu)"
        : "English (global/Western)";

  const userPrompt = `Analyze the attached product image and produce the content strategy JSON.

Target language for hook, cta, and any human dialogue inside prompts: ${languageName}.

${opts.productContext?.trim() ? `Additional product context from the seller:\n${opts.productContext.trim()}\n` : ""}

Remember: return ONLY the JSON object, nothing else.`;

  const dataUrl = `data:${opts.mimeType};base64,${opts.imageBase64}`;

  const body = {
    model: opts.model || TEXT_MODEL,
    messages: [
      { role: "system", content: STRATEGY_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  };

  const res = await postJson<ChatResponse>(body);
  const rawContent = res.choices?.[0]?.message?.content;

  let raw = "";
  if (typeof rawContent === "string") {
    raw = rawContent;
  } else if (Array.isArray(rawContent)) {
    raw = rawContent.map((c) => (typeof c === "string" ? c : c.text || "")).join("");
  }

  if (!raw) throw new Error("Empty response from strategy model.");

  // Strip ```json fences if the model added them despite instructions
  let cleaned = raw.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) cleaned = fence[1].trim();

  // Find the first { and last } in case of leading/trailing prose
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last !== -1) cleaned = cleaned.slice(first, last + 1);

  try {
    return JSON.parse(cleaned) as ContentStrategy;
  } catch (err) {
    throw new Error(
      "Strategy model returned malformed JSON. First 300 chars:\n" + raw.slice(0, 300)
    );
  }
}

/**
 * Generate an image from a prompt + reference image.
 * Replaces the Gemini gemini-2.5-flash-image call.
 *
 * Mirrors the video_config pattern shown in the Viber API examples,
 * using image_config for aspect ratio. Response parsing is intentionally
 * flexible — base64 inline data, a URL, or a data URI in message content
 * are all handled.
 *
 * Returns a data: URL ready to use as an <img src>.
 */
export async function generateImageFromImage(opts: {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  aspectRatio?: string;
}): Promise<string> {
  const dataUrl = `data:${opts.mimeType};base64,${opts.imageBase64}`;

  const body = {
    model: IMAGE_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: opts.prompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    image_config: {
      aspect_ratio: opts.aspectRatio || "9:16",
    },
  };

  const res = await postJson<ChatResponse>(body);

  // Pattern A: OpenAI images endpoint shape — { data: [{ b64_json | url }] }
  if (res.data?.[0]) {
    if (res.data[0].b64_json) {
      return `data:image/png;base64,${res.data[0].b64_json}`;
    }
    if (res.data[0].url) return res.data[0].url;
  }

  // Pattern B: chat shape — content is a string with a data: URL or http URL
  const content = res.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    const dataUriMatch = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (dataUriMatch) return dataUriMatch[0];
    const urlMatch = content.match(/https?:\/\/\S+\.(?:png|jpg|jpeg|webp)/i);
    if (urlMatch) return urlMatch[0];
  }

  // Pattern C: chat shape — content is an array, look for image_url/b64_json
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part.b64_json) return `data:image/png;base64,${part.b64_json}`;
      if (part.image_url?.url) return part.image_url.url;
    }
  }

  throw new Error("No image returned by the model.");
}

/**
 * Generate a video from a text prompt + optional reference image.
 * Mirrors the curl example from the Viber API docs:
 *   model: grok-imagine-1.0-video
 *   video_config: { aspect_ratio, video_length, resolution_name, preset }
 *
 * Returns a URL (or data: URI) ready to use as a <video src>.
 * Note: video generation is typically slow (30s–several min). Caller should
 * show a long-running spinner and consider increasing the fetch timeout.
 */
export async function generateVideoFromImage(opts: {
  imageBase64?: string;
  mimeType?: string;
  prompt: string;
  aspectRatio?: string;
  videoLength?: number;
  resolution?: "480p" | "720p" | "1080p" | string;
  preset?: "fast" | "normal" | "high" | string;
}): Promise<string> {
  let userContent: string | ChatPart[];
  if (opts.imageBase64 && opts.mimeType) {
    const dataUrl = `data:${opts.mimeType};base64,${opts.imageBase64}`;
    userContent = [
      { type: "text", text: opts.prompt },
      { type: "image_url", image_url: { url: dataUrl } },
    ];
  } else {
    userContent = opts.prompt;
  }

  const body = {
    model: VIDEO_MODEL,
    messages: [{ role: "user", content: userContent }],
    video_config: {
      aspect_ratio: opts.aspectRatio || "9:16",
      video_length: opts.videoLength ?? 8,
      resolution_name: opts.resolution || "480p",
      preset: opts.preset || "normal",
    },
  };

  const res = await postJson<ChatResponse>(body);

  // Pattern A: { data: [{ url | b64_json }] }
  if (res.data?.[0]?.url) return res.data[0].url;
  if (res.data?.[0]?.b64_json) return `data:video/mp4;base64,${res.data[0].b64_json}`;

  // Pattern B: choices[0].message.content as string with URL or data: URI
  const content = res.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    const dataUriMatch = content.match(/data:video\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (dataUriMatch) return dataUriMatch[0];
    const urlMatch = content.match(/https?:\/\/\S+\.(?:mp4|webm|mov)(?:\?[^\s"']*)?/i);
    if (urlMatch) return urlMatch[0];
  }

  // Pattern C: content as array — look for video_url / url / b64_json
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part.b64_json) return `data:video/mp4;base64,${part.b64_json}`;
      if (part.video_url?.url) return part.video_url.url;
      if (part.url) return part.url;
    }
  }

  throw new Error("No video returned by the model.");
}
