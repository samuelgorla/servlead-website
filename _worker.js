import { onRequestPost as onLeadPost } from "./functions/api/lead.js";
import { onRequestPost as onQuoteRescuePost } from "./functions/api/quote-rescue.js";

function methodNotAllowed() {
  return new Response(JSON.stringify({ ok: false }), {
    status: 405,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "allow": "POST"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path === "/api/lead") {
      if (request.method !== "POST") return methodNotAllowed();
      return onLeadPost({ request, env });
    }
    if (path === "/api/quote-rescue") {
      if (request.method !== "POST") return methodNotAllowed();
      return onQuoteRescuePost({ request, env });
    }
    return env.ASSETS.fetch(request);
  }
};
