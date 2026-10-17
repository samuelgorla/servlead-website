#!/usr/bin/env node
/**
 * Fail when an internal file would be published, or when a published
 * file still contains a Notion URL or a samgorla/consultation link.
 *
 *   npm run check:deploy
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv, exit } from 'node:process';
import { isBlockedAsset } from '../functions/publish-policy.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const SERVED_EXT = new Set([
  '.html', '.txt', '.xml', '.js', '.css', '.svg', '.json', '.webmanifest',
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function urlPath(file, root) {
  const rel = relative(root, file).split(sep).join('/');
  return `/${rel}`;
}

export function auditRepo(root = ROOT) {
  const problems = [];
  const worker = readFileSync(join(root, '_worker.js'), 'utf8');
  if (!worker.includes('isBlockedAsset')) {
    problems.push('_worker.js does not call isBlockedAsset, so internal files would be published');
  }
  if (!/path === "\/consultation"/.test(worker)) {
    problems.push('_worker.js no longer redirects /consultation');
  }
  const redirects = readFileSync(join(root, '_redirects'), 'utf8');
  if (!/^\/consultation\s+https:\/\/cal\.com\/samgorla\/quick-connect\s+301\s*$/m.test(redirects)) {
    problems.push('_redirects is missing the /consultation 301 to quick-connect');
  }

  for (const file of walk(root)) {
    const path = urlPath(file, root);
    const blocked = isBlockedAsset(path);
    const lower = path.toLowerCase();
    const base = lower.slice(lower.lastIndexOf('/') + 1);
    const internal = lower.endsWith('.md')
      || lower.startsWith('/scripts/')
      || lower === '/scripts'
      || lower.startsWith('/test/')
      || lower === '/test'
      || lower.startsWith('/functions/')
      || lower === '/functions'
      || /^package.*\.json$/.test(base)
      || base === '.assetsignore';
    if (internal && !blocked) {
      problems.push(`${path} would be published`);
    }
    if ((lower === '/llms.txt' || lower === '/robots.txt' || lower === '/sitemap.xml') && blocked) {
      problems.push(`${path} would be blocked, and it must stay public`);
    }
    if (blocked) continue;
    const ext = lower.slice(lower.lastIndexOf('.'));
    if (!SERVED_EXT.has(ext)) continue;
    const text = readFileSync(file, 'utf8');
    if (/notion\.com/i.test(text)) problems.push(`${path} contains a Notion URL`);
    if (/samgorla\/consultation/i.test(text)) problems.push(`${path} links to samgorla/consultation`);
    if (/(?:href|url)\s*=\s*["']\/consultation\/?/i.test(text)) {
      problems.push(`${path} links to /consultation`);
    }
  }
  return problems;
}

function main() {
  const problems = auditRepo(argv[2] || ROOT);
  if (!problems.length) {
    console.log('PASS deploy publish rules');
    console.log('  internal notes, scripts, tests, and package.json are not published');
    console.log('  llms.txt, robots.txt, and sitemap.xml stay public');
    console.log('');
    return;
  }
  console.log('FAIL deploy publish rules');
  for (const problem of problems) console.log(`  ${problem}`);
  console.log('');
  exit(1);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
