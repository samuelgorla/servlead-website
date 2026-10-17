/**
 * Paths the site must not publish.
 *
 * Cloudflare Pages did not honor .assetsignore for these files (number-sources.md
 * was still served). _worker.js calls isBlockedAsset before ASSETS.fetch, which
 * is the check that actually returns 404.
 *
 * llms.txt, robots.txt, and sitemap.xml stay public.
 * This module lives under functions/ so the worker can import it even if
 * Pages starts ignoring scripts/.
 */

const KEPT_PUBLIC = new Set(['/llms.txt', '/robots.txt', '/sitemap.xml']);

export function normalizeAssetPath(pathname) {
  let path = String(pathname || '/');
  try {
    path = decodeURIComponent(path);
  } catch {
    // Keep the raw path when it is not valid encoding.
  }
  path = path.split('?')[0].split('#')[0];
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/{2,}/g, '/');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path;
}

export function isBlockedAsset(pathname) {
  const path = normalizeAssetPath(pathname);
  const lower = path.toLowerCase();
  if (KEPT_PUBLIC.has(lower)) return false;
  const parts = lower.split('/').filter(Boolean);
  const base = parts[parts.length - 1] || '';
  if (lower.endsWith('.md')) return true;
  if (parts[0] === 'scripts' || parts[0] === 'test' || parts[0] === 'functions') return true;
  if (/^package.*\.json$/.test(base)) return true;
  if (base.startsWith('.') || base.startsWith('_')) return true;
  return false;
}
