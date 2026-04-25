# 🤖 Bot 24h para Minecraft Bedrock no Android (Linux + Node.js)

Tutorial completo para criar um bot que entra em servidores Minecraft Bedrock (Aternos, etc.), realiza movimentos realistas e fica online 24 horas — tudo rodando dentro de um **Ubuntu completo no seu celular Android**, sem precisar de root.

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
Copie e cole o conteúdo completo abaixo (para colar no Termux use Ctrl+Shift+V):
````bash
const { createClient } = require('bedrock-protocol');

// ⚙️ CONFIGURAÇÕES – ALTERE AQUI
const SERVER_HOST = 'SEU_IP_OU_DOMINIO';
const SERVER_PORT = SUA_PORTA;
const USERNAME = 'NOME_DO_BOT';

let client = null;
const RECONNECT_DELAY = 10000; // 10 segundos entre tentativas

let fakeX = 0, fakeY = 64, fakeZ = 0, yaw = 0;
let moveInterval = null, actionInterval = null;

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

        // Anda em círculo devagar
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
    }, 50); // 50ms = 20 atualizações por segundo

    // Pulo aleatório a cada 2~4 segundos
    function scheduleJump() {
        if (!client) return;
        const delay = Math.random() * 2000 + 2000;
        actionInterval = setTimeout(() => {
            if (!client) return;

            // Levanta voo
            client.write('move_player', {
                position: { x: fakeX, y: fakeY + 0.5, z: fakeZ },
                rotation: { yaw: yaw, pitch: 0, headYaw: yaw },
                mode: 0,
                onGround: false,
                tick: 0n
            });

            // Volta ao chão após 300ms
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

            scheduleJump(); // agenda o próximo pulo
        }, delay);
    }

    scheduleJump();
    console.log('🤖 Bot andando e pulando (modo círculo).');
}

function connect() {
    console.log(`🔌 Conectando a ${SERVER_HOST}:${SERVER_PORT} como ${USERNAME}...`);
    client = createClient({
        host: SERVER_HOST,
        port: SERVER_PORT,
        username: USERNAME,
        offline: true          // servidor offline/cracked
    });

    client.on('spawn', () => {
        console.log('✅ Bot entrou no servidor!');
        fakeX = 0; fakeY = 64; fakeZ = 0; yaw = 0;
        startMovementLoop();
    });

    client.on('disconnect', (reason) => {
        console.log(`❌ Desconectado: ${reason}`);
        client = null;
        stopMovement();
        setTimeout(connect, RECONNECT_DELAY);
    });

    client.on('error', (err) => {
        console.error(`⚠️ Erro: ${err.message}`);
    });
}

connect();
````
Salve e saia (Ctrl+O, Enter, Ctrl+X).

## 🚀 Etapa 6 – Executar o bot e mantê‑lo online

1. Ligue o servidor Aternos manualmente pelo painel.
2. No terminal do Linux, execute:
````bash
cd /root/meu-bot
node index.js
````
3. Se tudo der certo, você verá ✅ Bot entrou no servidor! e o bot começará a andar e pular.

🔁 Reconexão automática
O bot já está programado para reconectar a cada 10 segundos se a conexão cair. Se o Server desligar por inatividade, você precisará ligá‑lo novamente.

📱 Mantendo o bot ativo 24h
O Linux do Andronix continua rodando em segundo plano, mesmo com a tela do celular bloqueada.

Importante: desative qualquer otimização de bateria para o Termux nas configurações do Android.

Se o celular for reiniciado, abra o Termux, execute ./start-andronix.sh e depois cd /root/meu-bot && node index.js.

🔁 Dica extra: iniciar o bot automaticamente
Adicione a linha abaixo ao final do arquivo ~/.bashrc:
````bash
cd /root/meu-bot && node index.js &
````
Assim, sempre que você logar no Linux, o bot iniciará sozinho em segundo plano.

*Criado por Eric*

Tutorial inspirado em uma jornada real de persistência e superação de bugs. Contribuições são bem‑vindas! ✨

## 🏎 Como criar e ativar uma Dashboard própria pro seu Bot! (atualização)
