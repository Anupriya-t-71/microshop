const http = require('http');

const NAME = process.env.SERVICE_NAME || 'service';
const PORT = parseInt(process.env.PORT || '8080', 10);
const IS_GATEWAY = NAME === 'api-gateway';
const SERVICES = (process.env.SERVICES || '').split(',').filter(Boolean);

const store = new Map();
let seq = 1;
const startedAt = Date.now();

const send = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
  });

const log = (msg) => console.log(JSON.stringify({ t: new Date().toISOString(), service: NAME, msg }));

function getJson(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const r = http.get(url, { timeout: timeoutMs }, (resp) => {
      let d = '';
      resp.on('data', (c) => (d += c));
      resp.on('end', () => {
        try { resolve({ ok: resp.statusCode === 200, body: JSON.parse(d) }); }
        catch { resolve({ ok: false }); }
      });
    });
    r.on('timeout', () => { r.destroy(); resolve({ ok: false }); });
    r.on('error', () => resolve({ ok: false }));
  });
}

function proxy(req, res, target, path) {
  const options = {
    host: target, port: 8080, path, method: req.method,
    headers: { ...req.headers, host: `${target}:8080` }, timeout: 5000,
  };
  const upstream = http.request(options, (up) => {
    res.writeHead(up.statusCode, up.headers);
    up.pipe(res);
  });
  upstream.on('timeout', () => upstream.destroy());
  upstream.on('error', () => send(res, 502, { error: 'bad gateway', upstream: target }));
  req.pipe(upstream);
}

async function handleCrud(req, res, path) {
  const m = path.match(/^\/items(?:\/([^/]+))?$/);
  if (!m) return send(res, 404, { error: 'not found' });
  const id = m[1];

  if (!id && req.method === 'GET') return send(res, 200, [...store.values()]);
  if (!id && req.method === 'POST') {
    const body = await readBody(req);
    const item = { id: String(seq++), ...body, createdAt: new Date().toISOString() };
    store.set(item.id, item);
    return send(res, 201, item);
  }
  if (id && req.method === 'GET') {
    return store.has(id) ? send(res, 200, store.get(id)) : send(res, 404, { error: 'not found' });
  }
  if (id && req.method === 'PUT') {
    if (!store.has(id)) return send(res, 404, { error: 'not found' });
    const body = await readBody(req);
    const item = { ...store.get(id), ...body, id, updatedAt: new Date().toISOString() };
    store.set(id, item);
    return send(res, 200, item);
  }
  if (id && req.method === 'DELETE') {
    return store.delete(id) ? send(res, 200, { deleted: id }) : send(res, 404, { error: 'not found' });
  }
  return send(res, 405, { error: 'method not allowed' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  log(`${req.method} ${path}`);

  if (path === '/health' || path === '/ready') {
    return send(res, 200, { status: 'UP', service: NAME, uptimeSec: Math.floor((Date.now() - startedAt) / 1000) });
  }

  if (IS_GATEWAY) {
    if (path === '/') return send(res, 200, { service: NAME, services: SERVICES, hint: 'Use /api/<service>/items or /api/status' });
    if (path === '/api/status') {
      const results = await Promise.all(
        SERVICES.map(async (s) => {
          const r = await getJson(`http://${s}:8080/health`);
          return [s, r.ok ? 'UP' : 'DOWN'];
        })
      );
      const status = Object.fromEntries(results);
      const up = results.filter(([, v]) => v === 'UP').length;
      return send(res, 200, { total: results.length, up, down: results.length - up, status });
    }
    const m = path.match(/^\/api\/([a-z0-9-]+)(\/.*)?$/);
    if (m && SERVICES.includes(m[1])) {
      return proxy(req, res, m[1], (m[2] || '/') + url.search);
    }
    return send(res, 404, { error: 'unknown route' });
  }

  if (path === '/') return send(res, 200, { service: NAME, endpoints: ['/health', '/items'] });
  return handleCrud(req, res, path);
});

server.listen(PORT, () => log(`listening on ${PORT}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
