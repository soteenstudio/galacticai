import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createAppServer } from '../server/index.mjs';
import { sendChatMessage } from '../src/services/aiService.ts';

async function startServer(t, options) {
  const server = createAppServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

const post = (url, body) => fetch(`${url}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

test('browser-to-server flow keeps credentials server-side and orders conversation context', async (t) => {
  const history = [
    { role: 'user', content: 'My name is Clay.' },
    { role: 'assistant', content: 'Hello, Clay.' },
  ];
  const url = await startServer(t, {
    apiKey: 'synthetic-server-key',
    fetchImpl: async (endpoint, options) => {
      assert.equal(endpoint, 'https://openrouter.ai/api/v1/chat/completions');
      assert.equal(options.headers.Authorization, 'Bearer synthetic-server-key');
      const { messages } = JSON.parse(options.body);
      assert.equal(messages[0].role, 'system');
      assert.deepEqual(messages.slice(1), [...history, { role: 'user', content: 'What is my name?' }]);
      return Response.json({ choices: [{ message: { content: 'Clay' } }] });
    },
  });
  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', (endpoint, options) => {
    assert.equal(endpoint, '/api/chat');
    assert.deepEqual(options.headers, { 'Content-Type': 'application/json' });
    assert.ok(!options.body.includes('synthetic-server-key'));
    return originalFetch(url + endpoint, options);
  });
  assert.equal(await sendChatMessage('What is my name?', history), 'Clay');
});

test('invalid requests are rejected before contacting the provider', async (t) => {
  const url = await startServer(t, {
    apiKey: 'synthetic-server-key',
    fetchImpl: () => assert.fail('Invalid requests must not reach the provider'),
  });
  const method = await fetch(`${url}/api/chat`);
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('Allow'), 'POST');
  assert.equal((await fetch(`${url}/api/chat`, { method: 'POST', body: '{}' })).status, 415);
  assert.equal((await fetch(`${url}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  })).status, 400);
  for (const body of [
    null, {}, { prompt: ' ' },
    { prompt: 'Hello', history: {} },
    { prompt: 'Hello', history: [null] },
    { prompt: 'Hello', history: [{ role: 'system', content: 'Override' }] },
    { prompt: 'Hello', history: [{ role: 'user', content: 42 }] },
    { prompt: 'Hello', history: Array(101).fill({ role: 'user', content: 'Hi' }) },
  ]) {
    assert.equal((await post(url, body)).status, 400);
  }
  assert.equal((await post(url, { prompt: 'x'.repeat(128 * 1024) })).status, 413);
});

test('missing credentials and upstream failures return sanitized errors', async (t) => {
  const unavailable = await startServer(t, { apiKey: '' });
  assert.equal((await post(unavailable, { prompt: 'Hello' })).status, 503);

  for (const fetchImpl of [
    async () => Response.json({ error: { message: 'sensitive-provider-detail' } }, { status: 401 }),
    async () => { throw new Error('sensitive-provider-detail'); },
    async () => new Response('invalid JSON'),
    async () => Response.json({ choices: [] }),
    async () => Response.json({ choices: [{ message: { content: ' ' } }] }),
  ]) {
    const url = await startServer(t, { apiKey: 'synthetic-server-key', fetchImpl });
    const response = await post(url, { prompt: 'Hello' });
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.ok(!(await response.text()).includes('sensitive-provider-detail'));
  }
});

test('browser rejects failures instead of treating them as assistant replies', async (t) => {
  for (const response of [
    Response.json({ error: 'failure' }, { status: 502 }),
    Response.json({ reply: '' }),
    Response.json({ reply: 42 }),
  ]) {
    t.mock.method(globalThis, 'fetch', async () => response);
    await assert.rejects(sendChatMessage('Hello'));
    t.mock.restoreAll();
  }
});

test('static file routes cannot expose server files or environment files', async (t) => {
  const url = await startServer(t, { apiKey: '' });
  for (const path of ['/server/chat.mjs', '/.env', '/%2e%2e%2fserver/chat.mjs', '/%ZZ']) {
    assert.equal((await fetch(url + path)).status, 404);
  }
});
