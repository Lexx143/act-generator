// Real production HTTP stack with disposable SQLite and random synthetic credentials.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const directory = await mkdtemp(path.join(os.tmpdir(), 'act-http-test-'));
const reservation = net.createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const password = randomBytes(24).toString('hex');
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    SESSION_SECRET: randomBytes(32).toString('hex'), INITIAL_ADMIN_PASSWORD: password,
    DB_PATH: path.join(directory, 'acts.db') },
  // Startup currently prints the bootstrap password; never forward it to CI logs.
  stdio: ['ignore', 'ignore', 'ignore'],
});
const exited = once(child, 'exit');
child.on('error', () => {});
async function request(route, body, cookie) {
  return fetch(base + route, { method: body === undefined ? 'GET' : 'POST',
    body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    signal: AbortSignal.timeout(10000) });
}
let checks = 0;
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks++; }
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('test server exited before becoming ready');
    try { if ((await request('/login')).status === 200) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, 'production server ready');
  let response = await request('/');
  equal(response.status, 307, 'anonymous page redirects');
  equal(new URL(response.headers.get('location'), base).pathname, '/login', 'redirect target');
  equal((await request('/api/acts', {})).status, 401, 'anonymous act creation denied');
  equal((await request('/api/users', {})).status, 403, 'anonymous administration denied');
  equal((await request('/api/login', { login: 'admin', password: 'wrong-synthetic' })).status, 401, 'wrong password denied');
  response = await request('/api/login', { login: 'admin', password });
  equal(response.status, 200, 'admin login');
  const setCookie = response.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /Secure/i); assert.match(setCookie, /SameSite=lax/i);
  const admin = setCookie.split(';')[0];
  equal((await request('/', undefined, admin)).status, 200, 'protected page with valid session');
  const act = { act_number: 'synthetic-001', act_date: '2026-01-01', client_name: 'Synthetic client',
    equipment: [{ name: 'Synthetic device', serial: 'TEST' }], conclusion: 'Test only', signer_name: 'Synthetic signer' };
  response = await request('/api/acts', act, admin);
  equal(response.status, 200, 'SQLite act creation');
  const id = (await response.json()).id;
  equal((await request('/api/acts', act, admin)).status, 409, 'duplicate act rejected');
  assert.match(await (await request(`/acts/${id}`, undefined, admin)).text(), /Synthetic client/);
  equal((await request('/api/users', { login: 'test-user', password, full_name: 'Synthetic user' }, admin)).status, 200, 'create test specialist');
  response = await request('/api/login', { login: 'test-user', password });
  equal(response.status, 200, 'specialist login');
  const specialist = response.headers.get('set-cookie').split(';')[0];
  equal((await request('/api/users', { login: 'forbidden', password, full_name: 'Forbidden' }, specialist)).status, 403, 'specialist cannot administer users');
  const history = await (await request('/history', undefined, specialist)).text();
  assert.ok(!history.includes('Synthetic client'), 'specialist cannot see another author act');
  console.log(`PASS ${checks} HTTP status checks, cookie flags, rendered document and author isolation`);
} finally {
  if (child.exitCode === null) child.kill('SIGTERM');
  const killTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
  await exited;
  clearTimeout(killTimer);
  await rm(directory, { recursive: true, force: true });
}
