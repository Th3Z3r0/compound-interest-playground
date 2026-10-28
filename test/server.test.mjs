import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('the real HTTP server serves the complete app, health check, and errors', async t => {
  const child = spawn(process.execPath, ['server.mjs'], { cwd: new URL('../', import.meta.url), env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { if (child.exitCode !== null || child.signalCode !== null) return; const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; });
  const output = await new Promise((resolve, reject) => {
    let text = '';
    child.stdout.on('data', chunk => { text += chunk; if (/port \d+/.test(text)) resolve(text); });
    child.once('error', reject); child.once('exit', code => reject(new Error(`Server exited early: ${code}`)));
  });
  const origin = `http://127.0.0.1:${output.match(/port (\d+)/)[1]}`;
  const response = await fetch(origin); assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  assert.match(await response.text(), /Pip’s Compound Interest Playground/);
  for (const file of ['app.mjs', 'model.mjs', 'style.css', 'icon.svg']) assert.equal((await fetch(`${origin}/${file}`)).status, 200, file);
  assert.match((await fetch(`${origin}/app.mjs`)).headers.get('content-type'), /javascript/);
  assert.equal(await (await fetch(`${origin}/healthz`)).text(), 'ok');
  const head = await fetch(origin, { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(await head.text(), '');
  assert.equal((await fetch(`${origin}/missing`)).status, 404);
  assert.equal((await fetch(`${origin}/%2e%2e%2fpackage.json`)).status, 403);
  assert.equal((await fetch(origin, { method: 'POST' })).status, 405);
});
