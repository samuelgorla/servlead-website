#!/usr/bin/env node
/**
 * Homepage brand checks for Servlead.
 *
 *   node scripts/check-brand.mjs
 *   node scripts/check-brand.mjs index.html path/to/other.html
 *
 * With no arguments, checks DEFAULT_PAGES. Add a page there when the
 * same rules should cover it. Edit VENDOR_DENYLIST and DOLLAR_ALLOWLIST
 * in this file; each allowlisted amount needs a source note.
 *
 * Exit 0 when every file passes, 1 otherwise.
 */

import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

const DEFAULT_PAGES = ['index.html'];

const QUICK_CONNECT = 'https://cal.com/samgorla/quick-connect';
const MAX_RUST_CTAS = 2;

/** Editable. A hit anywhere in the page fails the check. */
const VENDOR_DENYLIST = ['EasyCater', 'Google Sheets'];

/**
 * Dollar figures that may appear outside an example.
 * Keys are normalized ($ removed commas, lower case, dash between ranges).
 */
const DOLLAR_ALLOWLIST = [
  { key: '$1000', source: 'Published AI & Efficiency Audit fee.' },
  { key: '$500', source: 'Half of the $1,000 audit fee: $500 to book, $500 on delivery.' },
  { key: '$10000', source: "Guarantee: at least $10,000 a year shown, or the audit's free." },
  { key: '$38k-$54k', source: 'Kahler Construction audit report, about $38,000 to $54,000 a year.' },
  { key: '$38000', source: 'Kahler Construction audit report, written out.' },
  { key: '$54000', source: 'Kahler Construction audit report, written out.' },
  { key: '$10m', source: 'Existing line for sizing the audit at operations of $10M and up.' },
  { key: '$13300', source: 'Leak Ledger: Manual lead generation with no system. https://app.notion.com/p/3bb77a727f2681578285c82925556ff1' },
  { key: '$32000', source: "Leak Ledger: Estimating logic lives entirely in Budd's head. https://app.notion.com/p/3bb77a727f2681278885e69e2c01b9a8" },
  { key: '$16494', source: 'Leak Ledger: Cash counted by hand at four locations and chased against POS. https://app.notion.com/3bb77a727f26816c958ed6bad3c5cd36' },
  { key: '$37440', source: 'Leak Ledger: Interviews that nobody shows up to. https://app.notion.com/p/3bb77a727f268184bf93e8f7a1b5b8aa' },
];

const BANNED_GREENS = ['#22764f', '#4fc28c', '#0f5136'];

const DOLLAR_RE =
  /\$\d{1,3}(?:,\d{3})*(?:\.\d+)?[kKmM]?(?:\s*[–—-]\s*\$\d{1,3}(?:,\d{3})*(?:\.\d+)?[kKmM]?)?/g;

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

const ALLOWED = new Map(DOLLAR_ALLOWLIST.map((item) => [item.key, item.source]));

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function normalizeDollar(raw) {
  return raw.replace(/,/g, '').replace(/[–—]/g, '-').replace(/\s+/g, '').toLowerCase();
}

function parseAttrs(raw) {
  const attrs = {};
  const re = /([:@A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = re.exec(raw))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return attrs;
}

function classTokens(value) {
  return String(value || '').split(/\s+/).filter(Boolean);
}

function isSample(el) {
  if (!el) return false;
  const tokens = classTokens(el.attrs.class);
  if (tokens.includes('sample') || tokens.includes('example')) return true;
  const figure = String(el.attrs['data-figure'] || '').trim().toLowerCase();
  return figure === 'sample' || figure === 'example';
}

function stackIsSample(stack, current) {
  return stack.some(isSample) || isSample(current);
}

function walk(html, visit) {
  const stack = [];
  let i = 0;
  while (i < html.length) {
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      const textEnd = end < 0 ? html.length : end;
      visit({
        type: 'comment',
        text: html.slice(i + 4, textEnd),
        index: i,
        stack,
      });
      i = end < 0 ? html.length : end + 3;
      continue;
    }
    if (html[i] === '<') {
      const end = html.indexOf('>', i);
      if (end < 0) break;
      const raw = html.slice(i + 1, end);
      const closer = /^\/\s*([a-zA-Z][\w:-]*)/.exec(raw);
      if (closer) {
        const name = closer[1].toLowerCase();
        for (let s = stack.length - 1; s >= 0; s--) {
          if (stack[s].name === name) {
            stack.length = s;
            break;
          }
        }
        i = end + 1;
        continue;
      }
      const nameMatch = /^([a-zA-Z][\w:-]*)/.exec(raw.trim());
      const name = nameMatch ? nameMatch[1].toLowerCase() : '';
      const attrs = parseAttrs(raw);
      const self = /\/\s*$/.test(raw) || VOID.has(name);
      visit({ type: 'open', name, attrs, index: i, stack: stack.slice() });
      if (!self && (name === 'script' || name === 'style')) {
        const closeRe = new RegExp(`</${name}\\s*>`, 'i');
        const rest = html.slice(end + 1);
        const found = closeRe.exec(rest);
        const innerEnd = found ? end + 1 + found.index : html.length;
        const innerStack = stack.concat([{ name, attrs }]);
        visit({
          type: 'text',
          text: html.slice(end + 1, innerEnd),
          index: end + 1,
          stack: innerStack,
        });
        i = found ? innerEnd + found[0].length : html.length;
        continue;
      }
      if (!self && name) stack.push({ name, attrs });
      i = end + 1;
      continue;
    }
    const next = html.indexOf('<', i);
    const end = next < 0 ? html.length : next;
    visit({ type: 'text', text: html.slice(i, end), index: i, stack: stack.slice() });
    i = end;
  }
}

function expandHex(hex) {
  let body = hex.slice(1).toLowerCase();
  if (body.length === 3 || body.length === 4) {
    body = body.slice(0, 3).split('').map((ch) => ch + ch).join('');
  } else if (body.length === 8) {
    body = body.slice(0, 6);
  }
  if (body.length !== 6 || /[^0-9a-f]/.test(body)) return null;
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
  };
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

function isGreenHue(h, s, l) {
  return h >= 75 && h <= 165 && s >= 0.15 && l >= 0.06 && l <= 0.94;
}

function cssRules(css, baseIndex) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, (comment) => ' '.repeat(comment.length));
  const rules = [];
  let i = 0;
  while (i < clean.length) {
    const open = clean.indexOf('{', i);
    if (open < 0) break;
    let depth = 0;
    let close = -1;
    for (let j = open; j < clean.length; j++) {
      if (clean[j] === '{') depth += 1;
      else if (clean[j] === '}') {
        depth -= 1;
        if (depth === 0) {
          close = j;
          break;
        }
      }
    }
    if (close < 0) break;
    const selector = clean.slice(i, open).trim();
    const body = clean.slice(open + 1, close);
    if (selector.startsWith('@media') || selector.startsWith('@supports')) {
      rules.push(...cssRules(body, baseIndex + open + 1));
    } else if (selector && !selector.startsWith('@')) {
      rules.push({
        selector,
        bodyStart: baseIndex + open + 1,
        bodyEnd: baseIndex + close,
      });
    }
    i = close + 1;
  }
  return rules;
}

function ruleAt(rules, index) {
  return rules.find((rule) => index >= rule.bodyStart && index < rule.bodyEnd) || null;
}

function isCtaSelector(selector) {
  return selector.split(',').every((part) =>
    /^\s*\.btn-primary\s*(?::(?:hover|focus|focus-visible|active))?\s*$/.test(part)
  );
}

function push(groups, name, line, detail) {
  if (!groups.has(name)) groups.set(name, []);
  groups.get(name).push({ line, detail });
}

function checkFile(file) {
  const html = readFileSync(file, 'utf8');
  const groups = new Map();
  let dollars = 0;
  let allowlisted = 0;
  let sampled = 0;
  let images = 0;

  const banned = new Set(BANNED_GREENS);
  const hexRe = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
  let match;
  while ((match = hexRe.exec(html))) {
    const raw = match[0].toLowerCase();
    const normalized = raw.length === 4
      ? '#' + raw.slice(1).split('').map((ch) => ch + ch).join('')
      : raw.length === 9
        ? raw.slice(0, 7)
        : raw;
    const rgb = expandHex(match[0]);
    if (!rgb) continue;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    if (banned.has(normalized)) {
      push(groups, 'Green', lineAt(html, match.index), `banned green ${match[0]}`);
    } else if (isGreenHue(hsl.h, hsl.s, hsl.l)) {
      push(groups, 'Green', lineAt(html, match.index), `green hue ${match[0]} (hue ${Math.round(hsl.h)})`);
    }
  }

  const hslRe = /hsla?\(\s*([0-9.]+)(?:deg)?\s*[,\s]\s*([0-9.]+)%\s*[,\s]\s*([0-9.]+)%/gi;
  while ((match = hslRe.exec(html))) {
    const h = Number(match[1]);
    const s = Number(match[2]) / 100;
    const l = Number(match[3]) / 100;
    if (isGreenHue(h, s, l)) {
      push(groups, 'Green', lineAt(html, match.index), `green hue ${match[0]}`);
    }
  }

  const rgbRe = /rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/gi;
  while ((match = rgbRe.exec(html))) {
    const hsl = rgbToHsl(Number(match[1]), Number(match[2]), Number(match[3]));
    if (isGreenHue(hsl.h, hsl.s, hsl.l)) {
      push(groups, 'Green', lineAt(html, match.index), `green hue ${match[0]}`);
    }
  }

  if (/--green\b|var\(\s*--green\s*\)/i.test(html)) {
    const token = /--green\b|var\(\s*--green\s*\)/gi;
    while ((match = token.exec(html))) {
      push(groups, 'Green', lineAt(html, match.index), match[0]);
    }
  }

  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  const rules = [];
  while ((match = styleRe.exec(html))) {
    const innerStart = match.index + match[0].indexOf(match[1]);
    rules.push(...cssRules(match[1], innerStart));
  }

  const rustColorRe = /#a63d1c|#7c2b13|var\(\s*--rust(?:-deep)?\s*\)|rgba?\(\s*166\s*,\s*61\s*,\s*28|rgba?\(\s*124\s*,\s*43\s*,\s*19/gi;
  while ((match = rustColorRe.exec(html))) {
    const found = match[0].toLowerCase();
    const line = html.slice(html.lastIndexOf('\n', match.index) + 1, html.indexOf('\n', match.index));
    if (found.startsWith('#a63d1c') && /--rust\s*:\s*#a63d1c/i.test(line) && !/--rust-deep/.test(line)) continue;
    if (found.startsWith('#7c2b13') && /--rust-deep\s*:\s*#7c2b13/i.test(line)) continue;
    const rule = ruleAt(rules, match.index);
    if (rule && isCtaSelector(rule.selector)) continue;
    const where = rule ? rule.selector.replace(/\s+/g, ' ') : 'outside a stylesheet rule';
    push(groups, 'Rust', lineAt(html, match.index), `${match[0]} in ${where}`);
  }

  const ctas = [];
  let fortune = false;
  let vendors = false;

  function noteDollar(text, index, sample) {
    DOLLAR_RE.lastIndex = 0;
    let found;
    while ((found = DOLLAR_RE.exec(text))) {
      dollars += 1;
      if (sample) {
        sampled += 1;
        continue;
      }
      const key = normalizeDollar(found[0]);
      if (ALLOWED.has(key)) {
        allowlisted += 1;
        continue;
      }
      push(
        groups,
        'Dollar figures',
        lineAt(html, index + found.index),
        `${found[0]} is not on the allowlist and is not inside sample/example`,
      );
    }
  }

  walk(html, (node) => {
    if (node.type === 'text' || node.type === 'comment') {
      noteDollar(node.text, node.index, stackIsSample(node.stack));
      return;
    }
    if (node.type !== 'open') return;
    const sample = stackIsSample(node.stack, { attrs: node.attrs });
    for (const value of Object.values(node.attrs)) noteDollar(value, node.index, sample);

    if (node.name === 'img') {
      images += 1;
      const alt = node.attrs.alt;
      if (alt == null || alt.trim() === '') {
        push(groups, 'Images', lineAt(html, node.index), 'img is missing a non-empty alt');
      }
    }
    if (node.name === 'a' || node.name === 'button') {
      if (classTokens(node.attrs.class).includes('btn-primary')) {
        ctas.push({ href: node.attrs.href || '', line: lineAt(html, node.index) });
      }
    }
  });

  if (ctas.length > MAX_RUST_CTAS) {
    push(groups, 'Rust', ctas[0]?.line || 1, `${ctas.length} rust CTA buttons; at most ${MAX_RUST_CTAS} are allowed`);
  }
  for (const cta of ctas) {
    const href = cta.href.replace(/\/$/, '');
    if (href !== QUICK_CONNECT) {
      push(groups, 'Rust', cta.line, `rust CTA points at ${cta.href || '(no href)'} instead of ${QUICK_CONNECT}`);
    }
  }

  const consultRe = /cal\.com\/samgorla\/consultation/gi;
  while ((match = consultRe.exec(html))) {
    push(groups, 'Consultation links', lineAt(html, match.index), 'cal.com/samgorla/consultation');
  }

  const fortuneRe = /fortune\s*1500/gi;
  while ((match = fortuneRe.exec(html))) {
    fortune = true;
    push(groups, 'Fortune 1500', lineAt(html, match.index), match[0]);
  }

  for (const name of VENDOR_DENYLIST) {
    const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    while ((match = re.exec(html))) {
      vendors = true;
      push(groups, 'Vendor names', lineAt(html, match.index), match[0]);
    }
  }

  return { file, groups, dollars, allowlisted, sampled, images, ctas: ctas.length, fortune, vendors };
}

function printResult(result) {
  const failed = result.groups.size > 0;
  console.log(`${failed ? 'FAIL' : 'PASS'} ${result.file}`);
  console.log(
    `  dollar figures: ${result.dollars} (${result.allowlisted} allowlisted, ${result.sampled} inside sample/example)`,
  );
  console.log(`  rust CTA buttons: ${result.ctas}`);
  console.log(`  images: ${result.images}`);
  if (!failed) {
    console.log('');
    return;
  }
  for (const [name, items] of result.groups) {
    console.log(`  ${name}`);
    for (const item of items) {
      console.log(`    L${item.line}  ${item.detail}`);
    }
  }
  console.log('');
}

const files = argv.slice(2);
const targets = files.length ? files : DEFAULT_PAGES;
let failed = false;
for (const file of targets) {
  let result;
  try {
    result = checkFile(file);
  } catch (error) {
    console.log(`FAIL ${file}`);
    console.log(`  ${error.message}`);
    console.log('');
    failed = true;
    continue;
  }
  printResult(result);
  if (result.groups.size) failed = true;
}
exit(failed ? 1 : 0);
