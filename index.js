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
