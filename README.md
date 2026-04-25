# 🤖 Bot 24h para Minecraft Bedrock no Android (Linux + Node.js)

Tutorial completo para criar um bot que entra em servidores Minecraft Bedrock (Aternos, etc.), realiza movimentos realistas e fica online 24 horas — tudo rodando dentro de um **Ubuntu completo no seu celular Android**, sem precisar de root.
* observação: Não funciona em Servidores com Autenticação premium, ou seja, servidores oficiais ou que exijam uma conta original da Microsoft.

## 📋 Pré‑requisitos

- Celular Android (não precisa de root)
- Servidor Bedrock (ex: [Aternos](https://aternos.org)) com **modo online desativado**
- [Andronix](https://play.google.com/store/apps/details?id=studio.com.techriz.andronix) (Play Store)
- [Termux](https://f-droid.org/packages/com.termux/) (recomendado F‑Droid para versão mais recente)

> 📌 Pegue o **IP** e a **Porta** do seu servidor (ex: `3001CN.aternos.me:30374`). No painel do Aternos, verifique se a opção **"Modo online"** está **desativada** (offline/cracked).

---

## 🐧 Etapa 1 – Instalar o Ubuntu via Andronix

1. Abra o **Andronix**, escolha **Ubuntu** e copie o comando gerado.
2. Cole o comando no **Termux** e pressione Enter. A instalação começará.
3. Durante a configuração do teclado:
   - Na primeira tela grande, role até o fim e selecione **"Other"**.
   - Depois escolha **"English (US)"** (recomendado para evitar problemas no terminal).
   - Se preferir português, selecione **"Portuguese (Brazil)"** (opção 1).
4. Aguarde até surgir o prompt `root@localhost:~#`.

> 🔁 **Sempre que precisar reiniciar o Linux**, abra o Termux e execute:
> ```bash
> ./start-andronix.sh
> ```

---

## 🧹 Etapa 2 – Corrigir repositórios (remover Debian "buster")

O Ubuntu do Andronix pode conter referências quebradas a um Debian antigo.

1. Edite o arquivo de fontes:
   ```bash
   nano /etc/apt/sources.list
2. Procure linhas com a palavra buster e as comente adicionando # no início:
   ```bash
   # deb http://ftp.debian.org/debian buster main
   # deb http://ftp.debian.org/debian buster-updates main
4. Salve e saia (Ctrl+O, Enter, Ctrl+X).
5. Atualize os pacotes:
 ```bash
apt update
````
   Não devem mais aparecer erros 404 ou menções a "buster".

## 📦 Etapa 3 – Instalar o Node.js 22 (com resolução de conflito)
A versão padrão do Ubuntu é muito antiga. Vamos instalar a 22.
````bash
apt install curl -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
````
Se ocorrer um erro de conflito com libnode-dev, remova‑o à força:
````bash
dpkg --remove --force-all libnode-dev
````
Instale o Node.js 22:
````bash
apt install nodejs -y
````
Verifique a versão (deve exibir v22.x):
````bash
node -v
````
Caso ainda apareça v12, execute hash -r e teste novamente.

## 🛠️ Etapa 4 – Ferramentas de compilação e criação da pasta do bot

````bash
apt install build-essential cmake git python3 -y
mkdir /root/meu-bot && cd /root/meu-bot
npm init -y
npm install bedrock-protocol@latest
````
*⚠️ A compilação do módulo raknet-native pode levar alguns minutos. Aguarde.*

## 🤖 Etapa 5 – Script final (anda em círculos, pula e evita banimento)

Crie o arquivo index.js:
````bash
nano index.js
````

<details>
<summary>📄 Clique para ver o código JavaScript completo, coloque no index.js</summary>
   Copie e cole o conteúdo completo abaixo (para colar no Termux use Ctrl+Shift+V)

````javascript
const { createClient } = require('bedrock-protocol');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// ⚙️ CONFIGURAÇÕES DO BOT – ALTERE AQUI
const SERVER_HOST = 'SEU_IP_OU_DOMINIO';
const SERVER_PORT = SUA_PORTA;       // número, ex: 30374
const USERNAME = 'NOME_DO_BOT';

// ⚙️ CONFIGURAÇÃO DO DASHBOARD
const DASHBOARD_PORT = 3001;         // Mudei para 3001 para evitar conflito com o processo antigo

let client = null;
const RECONNECT_DELAY = 10000;

let fakeX = 0, fakeY = 64, fakeZ = 0, yaw = 0;
let moveInterval = null, actionInterval = null;

// ------ DASHBOARD SETUP ------
const startTime = Date.now();
const chatLog = [];
const MAX_LOG_LINES = 200;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir a página HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// API de status (opcional, para testes)
app.get('/status', (req, res) => {
    res.json({
        online: client !== null,
        uptime: Math.floor((Date.now() - startTime) / 1000)
    });
});

io.on('connection', (socket) => {
    // Envia estado atual
    socket.emit('status', {
        online: client !== null,
        uptime: Math.floor((Date.now() - startTime) / 1000)
    });
    socket.emit('chatHistory', chatLog);

    // Atualiza uptime a cada segundo
    const uptimeInterval = setInterval(() => {
        socket.emit('uptime', Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    socket.on('disconnect', () => {
        clearInterval(uptimeInterval);
    });
});

function addChatMessage(message) {
    const entry = {
        time: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
        text: message
    };
    chatLog.push(entry);
    if (chatLog.length > MAX_LOG_LINES) chatLog.shift();
    io.emit('chatMessage', entry);
    // Também mostra no terminal
    console.log(`[CHAT] ${message}`);
}

// Inicia o servidor do dashboard
server.listen(DASHBOARD_PORT, '0.0.0.0', () => {
    console.log(`📊 Dashboard online em http://0.0.0.0:${DASHBOARD_PORT}`);
    console.log(`   No celular, acesse http://localhost:${DASHBOARD_PORT}`);
    console.log(`   De outro dispositivo, use http://<IP_DO_CELULAR>:${DASHBOARD_PORT}`);
});
// ------ FIM DASHBOARD ------

// Funções de movimento (mantidas do original)
function stopMovement() {
    if (moveInterval) clearInterval(moveInterval);
    if (actionInterval) clearInterval(actionInterval);
    moveInterval = null;
    actionInterval = null;
}

function startMovementLoop() {
    stopMovement();

    moveInterval = setInterval(() => {
        if (!client) return;
        yaw += 0.05;
        const speed = 0.02;
        fakeX += Math.sin(yaw) * speed;
        fakeZ += Math.cos(yaw) * speed;
        client.write('move_player', {
            position: { x: fakeX, y: fakeY, z: fakeZ },
            rotation: { yaw: yaw, pitch: 0, headYaw: yaw },
            mode: 0,
            onGround: true,
            tick: 0n
        });
    }, 50);

    function scheduleJump() {
        if (!client) return;
        const delay = Math.random() * 2000 + 2000;
        actionInterval = setTimeout(() => {
            if (!client) return;
            client.write('move_player', {
                position: { x: fakeX, y: fakeY + 0.5, z: fakeZ },
                rotation: { yaw: yaw, pitch: 0, headYaw: yaw },
                mode: 0,
                onGround: false,
                tick: 0n
            });
            setTimeout(() => {
                if (!client) return;
                client.write('move_player', {
                    position: { x: fakeX, y: fakeY, z: fakeZ },
                    rotation: { yaw: yaw, pitch: 0, headYaw: yaw },
                    mode: 0,
                    onGround: true,
                    tick: 0n
                });
            }, 300);
            scheduleJump();
        }, delay);
    }
    scheduleJump();
    console.log('🤖 Bot andando e pulando (modo círculo).');
}

// Conexão com o servidor Minecraft
function connect() {
    console.log(`🔌 Conectando a ${SERVER_HOST}:${SERVER_PORT} como ${USERNAME}...`);
    client = createClient({
        host: SERVER_HOST,
        port: SERVER_PORT,
        username: USERNAME,
        offline: true
    });

    // Captura de mensagens (chat e sistema) – AGORA COM NICK!
    client.on('text', (packet) => {
        if (!packet.message) return;
        // Remove códigos de formatação (§a, §l, etc.)
        const cleanMessage = packet.message.replace(/§[0-9a-fk-or]/g, '').trim();
        if (!cleanMessage) return;

        let displayText;
        if (packet.type === 'chat' && packet.sourceName) {
            // Jogador falando: <Nome> mensagem
            displayText = `<${packet.sourceName}> ${cleanMessage}`;
        } else if (packet.type === 'chat') {
            // Chat sem sourceName (muito raro)
            displayText = cleanMessage;
        } else {
            // Sistema, translation (entrou/saiu, conquistas...)
            const prefix = packet.sourceName ? `[${packet.sourceName}]` : '[Sistema]';
            displayText = `${prefix} ${cleanMessage}`;
        }
        addChatMessage(displayText);
    });

    client.on('spawn', () => {
        console.log('✅ Bot entrou no servidor!');
        fakeX = 0; fakeY = 64; fakeZ = 0; yaw = 0;
        startMovementLoop();
        addChatMessage('[Bot] Entrou no servidor');
    });

    client.on('disconnect', (reason) => {
        console.log(`❌ Desconectado: ${reason}`);
        addChatMessage(`[Bot] Desconectado: ${reason}`);
        client = null;
        stopMovement();
        // Atualiza status no dashboard
        io.emit('status', { online: false, uptime: Math.floor((Date.now() - startTime) / 1000) });
        setTimeout(connect, RECONNECT_DELAY);
    });

    client.on('error', (err) => {
        console.error(`⚠️ Erro: ${err.message}`);
    });
}

connect();
````
</details>

Salve e saia (Ctrl+O, Enter, Ctrl+X).

## 🚀 Etapa 6 – Executar o bot e mantê‑lo online

1. Ligue o servidor Aternos manualmente pelo painel.
2. No terminal do Linux, execute:
````bash
cd /root/meu-bot
node index.js
````
3. Se tudo der certo, você verá ✅ Bot entrou no servidor! e o bot começará a andar e pular.

* 🔁 Reconexão automática
O bot já está programado para reconectar a cada 10 segundos se a conexão cair. Se o Server desligar por inatividade, você precisará ligá‑lo novamente.

* 📱 Mantendo o bot ativo 24h
O Linux do Andronix continua rodando em segundo plano, mesmo com a tela do celular bloqueada.

* Importante: desative qualquer otimização de bateria para o Termux nas configurações do Android.

* Se o celular for reiniciado, abra o Termux, execute ./start-andronix.sh e depois cd /root/meu-bot && node index.js.

🔁 Dica extra: iniciar o bot automaticamente
Adicione a linha abaixo ao final do arquivo ~/.bashrc:
````bash
cd /root/meu-bot && node index.js &
````
Assim, sempre que você logar no Linux, o bot iniciará sozinho em segundo plano.

*Criado por Eric*

Tutorial inspirado em uma jornada real de persistência e superação de bugs. Contribuições são bem‑vindas! ✨


## _🏎 Como criar e ativar uma Dashboard própria pro seu Bot! (atualização)_ ##

A partir de agora você pode **monitorar seu bot em tempo real** direto do navegador!  
A dashboard mostra:

- 🟢 **Status** – se o bot está online no servidor
- ⏱️ **Uptime** – há quanto tempo ele está ligado
- 💬 **Chat do Minecraft** – todas as mensagens do jogo, com nome dos jogadores

Tudo funciona via Wi‑Fi, no celular ou em qualquer outro dispositivo da mesma rede.

---

### 📦 1. Instale as dependências da dashboard

Entre na pasta do bot (se ainda não estiver lá):

```bash
cd /root/meu-bot
````
Instale os pacotes necessários:
````bash
npm install express socket.io
````
A instalação é rápida e não interfere nos módulos que você já tem.

## 📄 2. Atualize o arquivo index.js

Substitua todo o conteúdo do index.js pela versão mais recente do repositório (que já inclui o servidor web e a captura de chat com nicks).

⚠️ Não esqueça de editar as configurações no topo do arquivo: SERVER_HOST, SERVER_PORT e USERNAME.

Se preferir manter os movimentos do bot originais, o novo código preserva exatamente o mesmo comportamento de andar e pular.

🎨 3. Crie o arquivo dashboard.html

Ainda na pasta /root/meu-bot, crie o arquivo da interface:
````bash
nano dashboard.html
````
<details>
<summary>📄 Clique para ver o código HTML completo, coloque no dashboard.html</summary>
Copie e cole o conteúdo completo abaixo (para colar no Termux use Ctrl+Shift+V):
   
```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bot Dashboard - Bedrock</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1e1e2e;
      color: #cdd6f4;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      background: #313244;
      border-radius: 16px;
      padding: 30px;
      width: 100%;
      max-width: 700px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
    }
    .status-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: gray;
      transition: background 0.3s;
    }
    .status-dot.online { background: #a6e3a1; }
    .status-dot.offline { background: #f38ba8; }
    .uptime {
      font-size: 1.2rem;
      margin-bottom: 30px;
    }
    #chatLog {
      background: #181825;
      border-radius: 8px;
      padding: 15px;
      height: 400px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 0.9rem;
      border: 1px solid #45475a;
    }
    .chat-entry {
      margin-bottom: 5px;
      word-break: break-word;
    }
    .chat-entry .time {
      color: #89b4fa;
      margin-right: 8px;
    }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-thumb { background: #585b70; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="status-row">
      <div id="statusDot" class="status-dot offline"></div>
      <h2 id="statusText">Bot Offline</h2>
    </div>
    <div class="uptime">
      ⏱️ Online há: <strong id="uptimeDisplay">00:00:00</strong>
    </div>
    <h3>📜 Chat do Minecraft</h3>
    <div id="chatLog">
      <div class="chat-entry">Aguardando conexão...</div>
    </div>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const uptimeDisplay = document.getElementById('uptimeDisplay');
    const chatLog = document.getElementById('chatLog');

    function formatUptime(seconds) {
      const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      return `${h}:${m}:${s}`;
    }

    function updateStatus(online) {
      if (online) {
        statusDot.className = 'status-dot online';
        statusText.textContent = 'Bot Online';
      } else {
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Bot Offline';
      }
    }

    socket.on('status', (data) => {
      updateStatus(data.online);
      uptimeDisplay.textContent = formatUptime(data.uptime);
    });

    socket.on('uptime', (seconds) => {
      uptimeDisplay.textContent = formatUptime(seconds);
    });

    socket.on('chatHistory', (history) => {
      chatLog.innerHTML = '';
      history.forEach(entry => addChatEntry(entry));
    });

    socket.on('chatMessage', (entry) => {
      addChatEntry(entry);
    });

    function addChatEntry(entry) {
      const div = document.createElement('div');
      div.className = 'chat-entry';
      div.innerHTML = `<span class="time">[${entry.time}]</span>${escapeHtml(entry.text)}`;
      chatLog.appendChild(div);
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    function escapeHtml(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    socket.on('disconnect', () => {
      updateStatus(false);
    });
  </script>
</body>
</html>
```
</details>

🚀 4. Execute o bot (com dashboard)

Agora inicie o bot normalmente:
````bash
node index.js
````
Se tudo estiver certo, você verá no terminal:
````text
📊 Dashboard online em http://0.0.0.0:3001
   No celular, acesse http://localhost:3001
   De outro dispositivo, use http://<IP_DO_CELULAR>:3001
````
🔁 Porta: Por padrão a dashboard usa a porta 3001 (para não brigar com a 3000, caso tenha algum processo antigo). Se precisar alterar, edite a variável DASHBOARD_PORT no início do index.js.

## 🌐 5. Acesse a dashboard

No próprio celular:
Abra o navegador e digite:
http://localhost:3001

De outro PC/celular na mesma rede Wi-Fi:
Descubra o IP do seu celular (vá em Configurações > Wi‑Fi, toque na rede conectada e veja o Endereço IP).
Depois acesse:
http://<IP_DO_CELULAR>:3001
Exemplo: http://192.168.1.105:3001

💡 Dicas importantes
Porta em uso?
Se aparecer o erro EADDRINUSE, mude a porta no código (ex: 3002) ou feche qualquer bot ainda rodando em segundo plano.

Acesso externo (fora de casa)?
Use um túnel como o ngrok. Rode em outro terminal:
ngrok http 3001
Ele vai gerar um link público temporário.

Chat com nome de jogador?
Já está funcionando! O painel mostra <NomeDoJogador> mensagem para cada fala.

Quer iniciar a dashboard junto com o bot?
Adicione no fim do ~/.bashrc:
cd /root/meu-bot && node index.js &
Assim o bot (e a dashboard) iniciam automaticamente ao abrir o Linux.

Pronto! Agora você tem um painel de controle completo para seu bot de Minecraft Bedrock, acessível de qualquer lugar da sua rede. ✨
