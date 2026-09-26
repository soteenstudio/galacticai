import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { parse, compileScript } from '@vue/compiler-sfc';
import { createRenderer } from 'vue';
import ts from 'typescript';

test('follow-ups retain completed turns, failures are excluded, and New Chat clears context', async (t) => {
  const source = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8');
  const { descriptor } = parse(source);
  const script = compileScript(descriptor, { id: 'conversation-test' }).content
    .replaceAll('from "vue"', `from "${import.meta.resolve('vue')}"`)
    .replaceAll("from 'vue'", `from '${import.meta.resolve('vue')}'`)
    .replace("from './services/aiService'", `from '${new URL('../src/services/aiService.ts', import.meta.url).href}'`);
  const { outputText } = ts.transpileModule(script, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  });
  const { default: App } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, value: { getItem: () => 'dark' },
  });
  t.after(() => {
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
    else delete globalThis.localStorage;
  });
  const renderer = createRenderer({
    createComment: () => ({}), insert() {}, remove() {}, parentNode() {}, nextSibling() {},
  });
  const app = renderer.createApp({ ...App, render: () => null });
  const vm = app.mount({}).$.setupState;
  t.after(() => app.unmount());
  const requests = [];
  let fail = false;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return fail
      ? Response.json({ error: 'failed' }, { status: 502 })
      : Response.json({ reply: 'Hello, Clay.' });
  });
  t.mock.method(console, 'error', () => {});

  await vm.sendMessage('My name is Clay.');
  assert.deepEqual(requests[0].history, []);
  await vm.sendMessage('What is my name?');
  assert.deepEqual(requests[1].history, [
    { role: 'user', content: 'My name is Clay.' },
    { role: 'assistant', content: 'Hello, Clay.' },
  ]);
  fail = true;
  await vm.sendMessage('Failed request');
  fail = false;
  await vm.sendMessage('Try again');
  assert.ok(requests[3].history.every((message) => !message.content.includes('Failed request') &&
    !message.content.includes('Terjadi kesalahan')));

  vm.newChat();
  assert.equal(vm.messages.length, 0);
  await vm.sendMessage('Fresh start');
  assert.deepEqual(requests[4].history, []);
});
