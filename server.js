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
    // Força UTF-8 em todos os HTMLs pra emojis e acentos não quebrarem
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

// Mantém referência aos totens conectados (pode ter múltiplos)
const totens = new Set();
const controles = new Set();

wss.on('connection', (ws, req) => {
  // Identifica o tipo de cliente pela URL: /ws?role=totem ou /ws?role=controle
  const url = new URL(req.url, `http://${req.headers.host}`);
  const role = url.searchParams.get('role') || 'controle';
  ws.role = role;

  if (role === 'totem') {
    totens.add(ws);
    console.log(`[+] Totem conectado. Total: ${totens.size}`);
    // Avisa controles que totem tá online
    broadcast(controles, { type: 'totem_status', online: true });
  } else {
    controles.add(ws);
    console.log(`[+] Controle conectado. Total: ${controles.size}`);
    // Avisa o controle se já tem totem online
    ws.send(JSON.stringify({ type: 'totem_status', online: totens.size > 0 }));
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // Mensagens do controle → repassa pros totens
      if (ws.role === 'controle') {
        broadcast(totens, msg);
      }
      // Mensagens do totem → repassa pros controles (status, prêmio, etc)
      else if (ws.role === 'totem') {
        broadcast(controles, msg);
      }
    } catch (err) {
      console.error('Mensagem inválida:', err.message);
    }
  });

  ws.on('close', () => {
    if (ws.role === 'totem') {
      totens.delete(ws);
      console.log(`[-] Totem desconectado. Total: ${totens.size}`);
      if (totens.size === 0) {
        broadcast(controles, { type: 'totem_status', online: false });
      }
    } else {
      controles.delete(ws);
      console.log(`[-] Controle desconectado. Total: ${controles.size}`);
    }
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
  });
});

function broadcast(clients, msg) {
  const payload = JSON.stringify(msg);
  for (const c of clients) {
    if (c.readyState === 1) c.send(payload);
  }
}

// ─── Endpoint pra healthcheck do Railway ─────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, totens: totens.size, controles: controles.size });
});

server.listen(PORT, () => {
  console.log(`\n🎯 Corteva Roleta rodando em http://localhost:${PORT}`);
  console.log(`   Totem:    http://localhost:${PORT}/totem.html`);
  console.log(`   Controle: http://localhost:${PORT}/controle.html\n`);
});
