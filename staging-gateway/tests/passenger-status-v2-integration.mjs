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
const isolated = process.argv[3] === '--isolated-qa';
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
const oldTester = 'synthetic-staging-existing-php-fixture-123456789';
const upstream = isolated ? 'uber-v3-tz02-qa.lobanov0710.workers.dev' : 'uber-v3-staging.lobanov0710.workers.dev';
if (isolated) env.TZ02_QA_WORKER_ORIGIN = 'https://' + upstream;
const name = 'passenger-integration';
const bundle = await build({ entryPoints: [join(worker, isolated ? 'qa/tz02/worker.js' : 'src/index.js')], bundle: true, write: false,
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
  const fixture = isolated ? await fromWorker('qa/tz02/synthetic-order.mjs')
    : await (async () => { await seedRuleActors(DB); return admissionScenario({ DB, ...env }, send); })();
  const id = isolated ? fixture.orderId : 'local_php_passenger_order';
  if (isolated) {
    await DB.batch((await fixture.seed(Date.now(), '2026-11-28')).map(sql => DB.prepare(sql)));
  } else await fixture.order(id);
  const accessToken = await signJWT(env.PASSENGER_ORDER_SECRET, { sub: id, scope: 'passenger_order:read' }, 300);
  const rawBody = `{\n  "accessToken": "${accessToken}"\n}\n`;

  const gateway = join(temp, 'gateway');
  const bootstrap = fileURLToPath(new URL('../_bootstrap.php', import.meta.url));
  cpSync(bootstrap, join(gateway, '_bootstrap.php'));
  cpSync(fileURLToPath(new URL('../public/', import.meta.url)), join(gateway, 'public'), { recursive: true });
  const writeKeys = (root, access, hmac) => {
    const privateDir = join(root, 'private');
    mkdirSync(privateDir, { recursive: true, mode: 0o700 });
    writeFileSync(join(privateDir, 'staging-access.key'), access, { mode: 0o600 });
    writeFileSync(join(privateDir, 'staging-hmac.key'), hmac, { mode: 0o600 });
  };
  const qaRoot = join(gateway, 'passenger-qa');
  const qaOriginFile = join(qaRoot, 'private', 'passenger-qa-upstream.txt');
  if (isolated) {
    writeKeys(gateway, oldTester, 'synthetic-existing-staging-hmac-key-123456789');
    writeKeys(qaRoot, tester, env.PROXY_HMAC_SECRET);
    cpSync(bootstrap, join(qaRoot, '_bootstrap.php'));
  } else writeKeys(gateway, tester, env.PROXY_HMAC_SECRET);
  if (isolated) writeFileSync(qaOriginFile, 'https://uber-v3-staging.lobanov0710.workers.dev\n', { mode: 0o600 });
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
    env: { PATH: process.env.PATH, PASSENGER_ASSIGNMENT_V2_ENABLED: isolated ? 'false' : 'true',
      ...(isolated ? { TS_STAGING_TESTER_TOKEN_FILE: join(gateway, 'private', 'staging-access.key'),
        TS_STAGING_HMAC_SECRET_FILE: join(gateway, 'private', 'staging-hmac.key') } : {}),
      https_proxy: proxyUrl, HTTPS_PROXY: proxyUrl, ALL_PROXY: proxyUrl }, stdio: 'ignore'
  });
  const origin = `http://127.0.0.1:${port}`;
  const url = `${origin}/api/${isolated ? 'tz02-qa' : 'v2'}/order-status.php`;
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(url); assert.equal(r.status, 405); break; }
    catch (error) { if (i === 39 || php.exitCode !== null) throw error; await delay(100); }
  }
  const read = (token = tester, suffix = '', endpoint = url) => fetch(endpoint + suffix, { method: 'POST', body: rawBody,
    headers: { 'Content-Type': 'application/json', 'X-Staging-Access-Token': token } });
  assert.equal((await read(tester, '?orderId=other')).status, 400);
  if (isolated) {
    assert.equal((await read()).status, 503);
    writeFileSync(qaOriginFile, `https://${upstream}\n`);
    assert.equal((await read(oldTester)).status, 403);
    assert.equal((await read(tester, '', `${origin}/api/order-status.php`)).status, 403);
    assert.equal((await read(oldTester, '', `${origin}/api/v2/order-status.php`)).status, 404);
  }
  assert.equal((await read('incorrect')).status, 403);
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
  if (isolated) await DB.batch(fixture.transitions['01-assign'].map(sql => DB.prepare(sql)));
  else assert.equal((await send('POST', `/v1/admin/orders/${id}/assign`, { driverId, vehicleId: fixture.vehicle.id,
    expectedRevision: 1, reason: 'Synthetic' }, fixture.ownerToken, 'php-integration-assignment')).status, 200);
  const order = await getOrder();
  assert.equal(order.id, id);
  assert.equal(order.revision, 2);
  assert.equal(order.assignment.vehicle.make, 'Toyota');
  assert.equal(order.assignment.driverDisplayName, null);
  if (isolated) {
    await DB.batch(fixture.transitions['02-reassign'].map(sql => DB.prepare(sql)));
    assert.equal((await getOrder()).assignment.vehicle.plate, 'QA-TZ02-02');
    await DB.batch(fixture.transitions['03-finish'].map(sql => DB.prepare(sql)));
    assert.equal((await getOrder()).assignment, null);
  }
  console.log('PHP/cURL → local TLS → Worker → local D1 PASS: gate, exact body, HMAC, assignment, one forward');
} finally {
  php?.kill();
  for (const socket of sockets) socket.destroy();
  for (const server of servers) { server.closeAllConnections?.(); server.close(); }
  await mf.dispose();
  rmSync(temp, { recursive: true, force: true });
}
