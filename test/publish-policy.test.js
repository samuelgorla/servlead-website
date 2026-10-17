import test from 'node:test';
import assert from 'node:assert/strict';
import { isBlockedAsset } from '../functions/publish-policy.mjs';
import { auditRepo } from '../scripts/check-deploy.mjs';

test('internal docs, scripts, tests, and package files are not published', () => {
  const blocked = [
    '/README.md',
    '/CONTRIBUTING.md',
    '/number-sources.md',
    '/notes/internal.md',
    '/scripts/check-brand.mjs',
    '/scripts/',
    '/test/',
    '/test/quote-rescue.test.js',
    '/functions/api/lead.js',
    '/package.json',
    '/package-lock.json',
    '/.assetsignore',
    '/_worker.js',
    '/_redirects',
  ];
  for (const path of blocked) {
    assert.equal(isBlockedAsset(path), true, path);
  }
});

test('llms.txt, robots.txt, sitemap.xml, and pages stay published', () => {
  const published = [
    '/llms.txt',
    '/robots.txt',
    '/sitemap.xml',
    '/',
    '/index.html',
    '/consultation',
    '/tools/quote-rescue.js',
    '/1e8a485114f2e495ecca0cb1cdead332.txt',
  ];
  for (const path of published) {
    assert.equal(isBlockedAsset(path), false, path);
  }
});

test('the repo would not publish internal files or Notion and consultation links', () => {
  assert.deepEqual(auditRepo(), []);
});
