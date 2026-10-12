import { onRequestPost as onLead } from "./functions/api/lead.js";
import { onRequestPost as onQuoteRescue } from "./functions/api/quote-rescue.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path === "/api/lead" || path === "/api/quote-rescue") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ ok: false }), {
          status: 405,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "allow": "POST"
          }
        });
      }
      if (path === "/api/quote-rescue") return onQuoteRescue({ request, env });
      return onLead({ request, env });
    }
    return env.ASSETS.fetch(request);
  }
};
