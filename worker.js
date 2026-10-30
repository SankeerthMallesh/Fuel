// Fuel API proxy: keeps the Gemini key on the server (Cloudflare secret GEMINI_KEY).
const MODEL_OK = /^gemini-[a-z0-9.\-]+$/i;
const MAX_BYTES = 8 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/gemini/")) return env.ASSETS.fetch(request);

    const json = (obj, status) =>
      new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

    if (request.method !== "POST") return json({ error: { message: "Method not allowed" } }, 405);

    // Only accept calls coming from this site itself.
    const origin = request.headers.get("Origin");
    if (origin && new URL(origin).host !== url.host) return json({ error: { message: "Forbidden" } }, 403);

    if (!env.GEMINI_KEY) return json({ error: { message: "AI is not set up yet. The owner needs to add the GEMINI_KEY secret." } }, 500);

    const model = decodeURIComponent(url.pathname.slice("/api/gemini/".length));
    if (!MODEL_OK.test(model)) return json({ error: { message: "Bad model" } }, 400);

    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_BYTES) return json({ error: { message: "Image too large" } }, 413);

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_KEY }, body }
    );
    return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/json" } });
  },
};
