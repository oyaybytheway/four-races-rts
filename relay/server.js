// Four Races RTS — tiny WebSocket relay + static file server.
// Host-authoritative: the host's browser runs the simulation; this server only
// manages rooms (5-letter codes) and forwards messages between host and guests.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 8080;
const ROOT = path.join(__dirname, '..');
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/' ) p = '/index.html';
  if (p === '/healthz') { res.writeHead(200); return res.end('ok'); }
  if (p !== '/index.html') { res.writeHead(404); return res.end('not found'); }
  fs.readFile(path.join(ROOT, 'index.html'), (e, d) => {
    if (e) { res.writeHead(500); return res.end('missing index.html'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(d);
  });
});
const wss = new WebSocketServer({ server, maxPayload: 8 * 1024 * 1024 });
const rooms = new Map(); // code -> {host, guests: Map(cid->ws)}
let nextId = 1;
const code5 = () => { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c; do { c = ''; for (let i = 0; i < 5; i++) c += A[Math.floor(Math.random() * A.length)]; } while (rooms.has(c)); return c; };
const send = (ws, o) => { if (ws && ws.readyState === 1) ws.send(typeof o === 'string' ? o : JSON.stringify(o)); };
wss.on('connection', ws => {
  ws.cid = nextId++; ws.isAlive = true; ws.on('pong', () => ws.isAlive = true);
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.t === 'host') {
      const code = code5(); rooms.set(code, { host: ws, guests: new Map(), started: false });
      ws.room = code; ws.role = 'host'; return send(ws, { t: 'hosted', code, cid: ws.cid });
    }
    if (m.t === 'join') {
      const r = rooms.get(String(m.code || '').toUpperCase().trim());
      if (!r) return send(ws, { t: 'error', msg: 'Room not found' });
      if (r.guests.size >= 3) return send(ws, { t: 'error', msg: 'Room is full (4 players max)' });
      if (r.started) return send(ws, { t: 'error', msg: 'Match already started' });
      ws.room = String(m.code).toUpperCase().trim(); ws.role = 'guest'; r.guests.set(ws.cid, ws);
      send(ws, { t: 'joined', code: ws.room, cid: ws.cid });
      return send(r.host, { t: 'peer-join', cid: ws.cid, name: String(m.name || 'Guest').slice(0, 20), race: m.race });
    }
    const r = rooms.get(ws.room); if (!r) return;
    if (ws.role === 'host') {
      if (m.t === 'started') r.started = true;
      const out = JSON.stringify(m.d);
      if (m.to === 'all') r.guests.forEach(g => send(g, out)); else send(r.guests.get(m.to), out);
    } else {
      send(r.host, { t: 'from', cid: ws.cid, d: m.d });
    }
  });
  ws.on('close', () => {
    const r = rooms.get(ws.room); if (!r) return;
    if (ws.role === 'host') { r.guests.forEach(g => send(g, { t: 'host-left' })); rooms.delete(ws.room); }
    else { r.guests.delete(ws.cid); send(r.host, { t: 'peer-left', cid: ws.cid }); }
  });
});
setInterval(() => wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }), 20000);
server.listen(PORT, () => console.log('Four Races relay on :' + PORT));
