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

  const DROP = ['quote', 'checkin', 'close', 'draft', 'drafts', 'quote_text', 'customer', 'customer_line'];
  const payload = {};
  for (const [key, value] of Object.entries(data)) {
    if (HONEYPOTS.includes(key) || DROP.includes(key)) continue;
    if (typeof value === 'string') payload[key] = value.slice(0, 2000);
    else if (typeof value === 'number' || typeof value === 'boolean') payload[key] = value;
  }
  payload.email = String(data.email).trim();
  const requested = typeof data.source === 'string' ? data.source.trim() : '';
  payload.source = requested === 'quote-rescue' ? 'quote-rescue' : 'leak-estimate';
  payload.page = pageOf(data, request);
  payload.timestamp = new Date().toISOString();

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
