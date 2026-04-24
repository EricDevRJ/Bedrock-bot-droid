# 🤖 Bot 24h para Minecraft Bedrock no Android (Linux + Node.js)

Tutorial completo para criar um bot que entra em servidores Minecraft Bedrock (Aternos, etc.), realiza movimentos realistas e fica online 24 horas — tudo rodando dentro de um **Ubuntu completo no seu celular Android**, sem precisar de root.

## 📋 Pré-requisitos

- Celular Android (não precisa de root)
- Servidor Bedrock (ex: [Aternos](https://aternos.org)) com **modo online desativado**
- [Andronix](https://play.google.com/store/apps/details?id=studio.com.techriz.andronix) (Play Store)
- [Termux](https://f-droid.org/packages/com.termux/) (recomendado F-Droid para versão mais recente)

## 🐧 Etapa 1 – Instalar o Ubuntu via Andronix

1. Abra o Andronix, escolha **Ubuntu** e copie o comando gerado.
2. Cole no Termux e pressione Enter.
3. Na configuração do teclado:
   - Selecione **"Other"**
   - Depois **"English (US)"** (ou **Portuguese (Brazil)**)
4. Aguarde até aparecer `root@localhost:~#`.

**Sempre que precisar reiniciar o Linux:**
```bash
./start-andronix.sh
