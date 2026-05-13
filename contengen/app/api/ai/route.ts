/**
 * Server-side proxy to the Viber AI endpoint.
 *
 * Why: calling the AI endpoint directly from the browser triggers CORS errors
 * (the Viber proxy doesn't return Access-Control-Allow-Origin) and exposes the
 * API key in the JS bundle. This route runs on the Next.js server, attaches
 * the key from a non-public env var, forces stream:false, and returns the
 * raw JSON to the client.
 *
 * The client (lib/ai.ts) POSTs the same chat-completions body it would send
 * directly to Viber — no shape change.
 */

export const runtime = "nodejs";
// Video generation can take 1–3 minutes. Set a long route timeout for local
// dev; on Vercel you'll need a Pro plan or self-host to allow >10s.
export const maxDuration = 300;

const BASE_URL =
  (process.env.AI_BASE_URL || "https://gstd.viber.id/v1").replace(/\/+$/, "");

export async function POST(req: Request) {
  const apiKey = process.env.VIBER_API_KEY;
  if (!apiKey) {
    return jsonError(500, "VIBER_API_KEY not configured on the server.");
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  // Force non-streaming so we get plain JSON back. Caller can override.
  const finalBody = { stream: false, ...body };

  let upstream: Response;
  try {
    upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(finalBody),
    });
  } catch (err) {
    return jsonError(
      502,
      "Failed to reach upstream AI endpoint. " +
        (err instanceof Error ? err.message : String(err))
    );
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") || "application/json",
    },
  });
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
