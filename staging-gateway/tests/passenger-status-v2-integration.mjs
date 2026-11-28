// Actual PHP + cURL, local TLS transport, bundled Worker and disposable D1.
// CONNECT is accepted only for the configured upstream and terminates locally.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, writeFileSync, readFileSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const worker = resolve(process.argv[2] ?? '');
const fromWorker = path => import(pathToFileURL(join(worker, path)).href);
const [{ build }, { Miniflare, convertV4MiniflareOptions }, { sqliteD1 }, { seedRuleActors, ruleSecrets, driverId },
  { admissionScenario }, { signJWT }] = await Promise.all([
  fromWorker('node_modules/esbuild/lib/main.js'), fromWorker('node_modules/miniflare/dist/src/index.js'),
  fromWorker('tests/helpers/sqliteD1.mjs'), fromWorker('tests/helpers/adminVehicleRuleScenario.mjs'),
  fromWorker('tests/helpers/vehicleAdmissionScenario.mjs'), fromWorker('src/core/auth.js')
]);
const env = { ...ruleSecrets, APP_ENV: 'staging', PASSENGER_ASSIGNMENT_V2_ENABLED: 'true',
  PASSENGER_ORDER_SECRET: 'synthetic-integration-order-fixture-123456',
  PROXY_HMAC_SECRET: 'synthetic-integration-proxy-fixture-123456' };
const tester = 'synthetic-integration-php-fixture-123456789';
const upstream = 'uber-v3-staging.lobanov0710.workers.dev';
const name = 'passenger-integration';
const bundle = await build({ entryPoints: [join(worker, 'src/index.js')], bundle: true, write: false,
  format: 'esm', target: 'es2022', platform: 'browser' });
const mf = new Miniflare(convertV4MiniflareOptions({ workers: [{ name, modules: true,
  script: bundle.outputFiles[0].text, bindings: env, d1Databases: ['DB'], compatibilityDate: '2026-08-20' }] }));
const temp = mkdtempSync(join(tmpdir(), 'tz02-http-'));
const sockets = new Set();
const servers = [];
let php;

async function listen(server) {
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}

try {
  const DB = await mf.getD1Database('DB', name);
  const { sqlite } = sqliteD1();
  try {
    for (const type of ['table', 'index', 'view', 'trigger']) {
      const rows = sqlite.prepare(`SELECT sql FROM sqlite_master WHERE type = ?
        AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid`).all(type);
      for (const { sql } of rows) await DB.prepare(sql).run();
    }
  } finally { sqlite.close(); }
  const send = async (method, path, body, token, key) => {
    const response = await mf.dispatchFetch('https://fixture.invalid' + path, { method,
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.10',
        ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  };
  await seedRuleActors(DB);
  const fixture = await admissionScenario({ DB, ...env }, send);
  const id = 'local_php_passenger_order';
  await fixture.order(id);
  const accessToken = await signJWT(env.PASSENGER_ORDER_SECRET, { sub: id, scope: 'passenger_order:read' }, 300);
  const rawBody = `{\n  "accessToken": "${accessToken}"\n}\n`;

  const gateway = join(temp, 'gateway');
  cpSync(fileURLToPath(new URL('../_bootstrap.php', import.meta.url)), join(gateway, '_bootstrap.php'));
  cpSync(fileURLToPath(new URL('../public/', import.meta.url)), join(gateway, 'public'), { recursive: true });
  const privateDir = join(gateway, 'private');
  mkdirSync(privateDir, { mode: 0o700 });
  writeFileSync(join(privateDir, 'staging-access.key'), tester, { mode: 0o600 });
  writeFileSync(join(privateDir, 'staging-hmac.key'), env.PROXY_HMAC_SECRET, { mode: 0o600 });
  const certificate = join(temp, 'tls.pem');
  const key = join(temp, 'tls.key');
  execFileSync('openssl', ['req', '-x509', '-nodes', '-newkey', 'rsa:2048', '-days', '1',
    '-keyout', key, '-out', certificate, '-subj', `/CN=${upstream}`,
    '-addext', `subjectAltName=DNS:${upstream}`], { stdio: 'ignore' });

  let forwarded = 0;
  let transportError;
  const upstreamPort = await listen(https.createServer({ cert: readFileSync(certificate), key: readFileSync(key) },
    async (req, res) => {
      try {
        forwarded++;
        assert.equal(req.headers.host, upstream);
        assert.equal(req.url, '/v2/order-status');
        assert.equal(req.method, 'POST');
        assert.equal(req.headers['x-staging-access-token'], undefined);
        const bytes = [];
        for await (const chunk of req) bytes.push(chunk);
        const body = Buffer.concat(bytes);
        assert.equal(body.toString('utf8'), rawBody);
        const result = await mf.dispatchFetch(`https://${upstream}${req.url}`, { method: req.method,
          headers: req.headers, body });
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(await result.text());
      } catch (error) {
        transportError = error;
        res.writeHead(500).end('{}');
      }
    }));
  const proxy = http.createServer((_req, res) => res.writeHead(403).end());
  proxy.on('connect', (req, socket, head) => {
    if (req.url !== `${upstream}:443`) { socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return; }
    const target = net.connect(upstreamPort, '127.0.0.1');
    sockets.add(socket); sockets.add(target);
    socket.on('error', () => target.destroy());
    target.on('error', () => socket.destroy());
    target.once('connect', () => {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) target.write(head);
      socket.pipe(target).pipe(socket);
    });
  });
  const proxyPort = await listen(proxy);
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolveClose => reservation.close(resolveClose));
  const proxyUrl = `http://127.0.0.1:${proxyPort}`;
  php = spawn('php', ['-d', `curl.cainfo=${certificate}`, '-S', `127.0.0.1:${port}`, '-t', join(gateway, 'public')], {
    env: { PATH: process.env.PATH, PASSENGER_ASSIGNMENT_V2_ENABLED: 'true',
      https_proxy: proxyUrl, HTTPS_PROXY: proxyUrl, ALL_PROXY: proxyUrl }, stdio: 'ignore'
  });
  const url = `http://127.0.0.1:${port}/api/v2/order-status.php`;
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(url); assert.equal(r.status, 405); break; }
    catch (error) { if (i === 39 || php.exitCode !== null) throw error; await delay(100); }
  }
  const read = (token = tester, suffix = '') => fetch(url + suffix, { method: 'POST', body: rawBody,
    headers: { 'Content-Type': 'application/json', 'X-Staging-Access-Token': token } });
  assert.equal((await read('incorrect')).status, 403);
  assert.equal((await read(tester, '?orderId=other')).status, 400);
  assert.equal(forwarded, 0);
  const getOrder = async () => {
    const before = forwarded;
    const r = await read();
    if (transportError) throw transportError;
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('Cache-Control'), 'no-store');
    assert.equal(forwarded, before + 1);
    return (await r.json()).order;
  };
  assert.equal((await getOrder()).assignment, null);
  assert.equal((await send('POST', `/v1/admin/orders/${id}/assign`, { driverId, vehicleId: fixture.vehicle.id,
    expectedRevision: 1, reason: 'Synthetic' }, fixture.ownerToken, 'php-integration-assignment')).status, 200);
  const order = await getOrder();
  assert.equal(order.id, id);
  assert.equal(order.revision, 2);
  assert.equal(order.assignment.vehicle.make, 'Toyota');
  assert.equal(order.assignment.driverDisplayName, null);
  console.log('PHP/cURL → local TLS → Worker → local D1 PASS: gate, exact body, HMAC, assignment, one forward');
} finally {
  php?.kill();
  for (const socket of sockets) socket.destroy();
  for (const server of servers) { server.closeAllConnections?.(); server.close(); }
  await mf.dispose();
  rmSync(temp, { recursive: true, force: true });
}
