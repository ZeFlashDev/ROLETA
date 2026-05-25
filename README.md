# 🎯 Corteva — Roleta de Prêmios

Roleta de prêmios com **controle remoto pelo celular**.

## 🏗️ Arquitetura

```
┌──────────────┐    WebSocket    ┌──────────────────┐    WebSocket    ┌──────────────┐
│  TOTEM       │ ←─────────────→ │  RAILWAY         │ ←─────────────→ │  CELULAR     │
│  (roleta)    │                 │  (Node.js + WS)  │                 │ (botão GIRAR)│
└──────────────┘                 └──────────────────┘                 └──────────────┘
```

## 📁 Estrutura

```
ROLETA/
├── server.js              # Servidor Node.js + WebSocket relay
├── package.json
├── railway.json
└── public/
    ├── totem.html         # Roleta (telão do evento)
    ├── controle.html      # Botão GIRAR (celular)
    ├── corteva-logo.png
    └── corteva-icon.png
```

## 🚀 Como rodar

### Local (desenvolvimento)
```bash
npm install
npm start
```

Abre dois navegadores:
- **Totem**: http://localhost:3000/totem.html
- **Controle**: http://localhost:3000/controle.html

### Deploy no Railway

1. Acesse [railway.app](https://railway.app) e crie um projeto
2. Conecte ao seu repositório Git (GitHub)
3. Railway detecta o `package.json` e roda `npm start` automaticamente
4. Pega o domínio público (ex: `meu-app.up.railway.app`)

### URLs em produção
- Totem: `https://SEU-DOMINIO.up.railway.app/totem.html`
- Controle: `https://SEU-DOMINIO.up.railway.app/controle.html`

## 📱 Como usar no evento

1. **No totem (TV/monitor)**: abre `/totem.html` em fullscreen (F11)
2. **Gera QR code** apontando pra `/controle.html`
3. **Participante escaneia** o QR e abre o controle no celular
4. **Aperta GIRAR** no celular → roleta gira no totem
5. Roleta mostra o resultado e participante pode girar mais 2 vezes (sessão de 3 giros)

## 🔧 Funcionalidades

- ✅ **WebSocket bidirecional**: comandos do celular → totem; status/resultados → celular
- ✅ **Reconexão automática**: se perder conexão, tenta reconectar a cada 2s
- ✅ **Múltiplos clientes**: pode ter vários celulares conectados ao mesmo tempo
- ✅ **Estado sincronizado**: contador de giros, prêmios ganhos, etc.
- ✅ **Vibração tátil**: celulares Android vibram ao apertar GIRAR
- ✅ **Sem cache**: Railway sempre serve a versão mais nova
