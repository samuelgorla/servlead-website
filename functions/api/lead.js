const MAX_BYTES = 10 * 1024;
const HONEYPOTS = ['website', 'f_web', 'hp', 'url'];

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function emailOk(value) {
  if (typeof value !== 'string') return false;
  const email = value.trim();
  if (email.length < 5 || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clip(value, max) {
  return String(value || '').trim().slice(0, max);
}

export function leadPayload(data, request) {
  const payload = {
    email: clip(data.email, 254),
    source: clip(data.source, 40) === 'quote-rescue' ? 'quote-rescue' : 'leak-estimate',
    page: pageOf(data, request),
    timestamp: new Date().toISOString()
  };
  if (typeof data.name === 'string' && data.name.trim()) payload.name = clip(data.name, 200);
  if (typeof data.business_type === 'string' && data.business_type.trim()) {
    payload.business_type = clip(data.business_type, 200);
  }
  return payload;
}

function pageOf(data, request) {
  const fromBody = typeof data.page === 'string' ? data.page.trim() : '';
  if (fromBody) return fromBody.slice(0, 2000);
  return (request.headers.get('referer') || '').slice(0, 2000);
}

async function parseBody(request, buf) {
  const type = (request.headers.get('content-type') || '').toLowerCase();
  if (type.includes('application/json')) {
    const data = JSON.parse(new TextDecoder().decode(buf));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('bad json');
    return data;
  }
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const copy = new Request(request.url, {
      method: 'POST',
      headers: { 'content-type': request.headers.get('content-type') },
      body: buf
    });
    const form = await copy.formData();
    const out = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  }
  throw new Error('unsupported type');
}

export async function onRequestPost({ request, env }) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > MAX_BYTES) return json(413, { ok: false });

  const buf = await request.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return json(413, { ok: false });

  let data;
  try {
    data = await parseBody(request, buf);
  } catch (err) {
    return json(400, { ok: false });
  }

  const tripped = HONEYPOTS.some(function (key) {
    return typeof data[key] === 'string' && data[key].trim() !== '';
  });
  if (tripped) return json(200, { ok: true });

  if (!emailOk(data.email)) return json(400, { ok: false });

  const payload = leadPayload(data, request);

  const url = env && env.LEAD_WEBHOOK_URL;
  const key = env && env.LEAD_WEBHOOK_KEY;
  if (typeof url === 'string' && url && typeof key === 'string' && key) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      // Browser still gets 200. The n8n send does not depend on this one.
    }
  }

  return json(200, { ok: true });
}
