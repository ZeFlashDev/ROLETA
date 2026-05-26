import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
const server = createServer(app);

// ─── Servir arquivos estáticos ───────────────────────────────
app.use(express.static(join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));

// Rota raiz redireciona pro totem
app.get('/', (req, res) => {
  res.redirect('/totem.html');
});

// ─── WebSocket: relay entre totem e controles ────────────────
const wss = new WebSocketServer({ server });

// Estrutura de salas: cada sala tem seu próprio totem + controles
// rooms = { 'loja1': { totens: Set, controles: Set }, 'loja2': {...} }
const rooms = new Map();

function getRoom(name) {
  if (!rooms.has(name)) {
    rooms.set(name, { totens: new Set(), controles: new Set() });
  }
  return rooms.get(name);
}

function broadcast(clients, msg) {
  const payload = JSON.stringify(msg);
  for (const c of clients) {
    if (c.readyState === 1) c.send(payload);
  }
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const role = url.searchParams.get('role') || 'controle';
  const roomName = url.searchParams.get('sala') || 'default';
  ws.role = role;
  ws.roomName = roomName;

  const room = getRoom(roomName);

  if (role === 'totem') {
    room.totens.add(ws);
    console.log(`[+] Totem conectado [sala=${roomName}]. Total na sala: ${room.totens.size}`);
    broadcast(room.controles, { type: 'totem_status', online: true });
  } else {
    room.controles.add(ws);
    console.log(`[+] Controle conectado [sala=${roomName}]. Total na sala: ${room.controles.size}`);
    ws.send(JSON.stringify({ type: 'totem_status', online: room.totens.size > 0 }));
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const r = getRoom(ws.roomName);

      if (ws.role === 'controle') {
        // CELULAR → totens da MESMA sala
        broadcast(r.totens, msg);
      } else if (ws.role === 'totem') {
        // TOTEM → controles da MESMA sala
        broadcast(r.controles, msg);
      }
    } catch (err) {
      console.error('Mensagem inválida:', err.message);
    }
  });

  ws.on('close', () => {
    const r = getRoom(ws.roomName);
    if (ws.role === 'totem') {
      r.totens.delete(ws);
      console.log(`[-] Totem desconectado [sala=${ws.roomName}]. Restam: ${r.totens.size}`);
      if (r.totens.size === 0) {
        broadcast(r.controles, { type: 'totem_status', online: false });
      }
    } else {
      r.controles.delete(ws);
      console.log(`[-] Controle desconectado [sala=${ws.roomName}]. Restam: ${r.controles.size}`);
    }
    // Limpa sala vazia
    if (r.totens.size === 0 && r.controles.size === 0) {
      rooms.delete(ws.roomName);
    }
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
  });
});

// ─── Endpoint pra healthcheck do Railway ─────────────────────
app.get('/health', (req, res) => {
  const roomStats = {};
  for (const [name, r] of rooms.entries()) {
    roomStats[name] = { totens: r.totens.size, controles: r.controles.size };
  }
  res.json({
    ok: true,
    rooms: roomStats,
    totalRooms: rooms.size
  });
});

server.listen(PORT, () => {
  console.log(`\n🎯 Corteva Roleta rodando em http://localhost:${PORT}`);
  console.log(`   Totem:    http://localhost:${PORT}/totem.html?sala=NOME`);
  console.log(`   Controle: http://localhost:${PORT}/controle.html?sala=NOME\n`);
});
