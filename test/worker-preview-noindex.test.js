import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../_worker.js';

const env = { ASSETS: { fetch: async () => new Response('<p>ok</p>', { status: 200, headers: { 'content-type': 'text/html' } }) } };

test('preview hosts on pages.dev get a noindex header', async () => {
  const res = await worker.fetch(new Request('https://rebuild-how-it-works.servlead-website.pages.dev/how-it-works'), env);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(await res.text(), '<p>ok</p>');
});

test('the live domain is not noindexed', async () => {
  const res = await worker.fetch(new Request('https://servleadsolutions.com/how-it-works'), env);
  assert.equal(res.headers.get('x-robots-tag'), null);
});
