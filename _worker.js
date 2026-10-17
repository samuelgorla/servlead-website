import { onRequestPost as onLead } from "./functions/api/lead.js";
import { onRequestPost as onQuoteRescue } from "./functions/api/quote-rescue.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path === "/test" || path.startsWith("/test/")) {
      return new Response("Not found", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }
    // /consultation now books through the quick-connect call. Handled here because
    // Pages does not reliably apply _redirects when _worker.js serves the request.
    if (path === "/consultation") {
      return new Response(null, {
        status: 301,
        headers: {
          "location": "https://cal.com/samgorla/quick-connect" + url.search,
          "cache-control": "public, max-age=3600"
        }
      });
    }
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
