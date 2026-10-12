import { onRequestPost } from "./functions/api/lead.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path === "/api/lead") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ ok: false }), {
          status: 405,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "allow": "POST"
          }
        });
      }
      return onRequestPost({ request, env });
    }
    return env.ASSETS.fetch(request);
  }
};
