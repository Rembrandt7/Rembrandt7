---
name: ai-and-whatsapp-integrations
description: Documentación sobre cómo conectarse a Ollama, Groq y WhatsApp (Baileys) para replicar la integración en otros proyectos Node.js.
---

# Integración con IA y WhatsApp

Esta habilidad documenta los parámetros, endpoints y librerías clave utilizados en este proyecto para conectarse con **Groq**, **Ollama** y **WhatsApp**, para que puedas replicarlo en otra aplicación.

---

## 1. Conexión a Groq (IA Rápida)

Groq proporciona una API compatible con OpenAI para inferencia ultrarrápida de modelos open-source (Llama, Mixtral, etc).

**Parámetros de conexión:**
- **URL Base:** `https://api.groq.com/openai/v1/chat/completions`
- **Autenticación:** Cabecera HTTP `Authorization: Bearer <TU_GROQ_API_KEY>`
- **Content-Type:** `application/json`

**Modelos recomendados:**
- **Chat general / Análisis JSON:** `llama-3.1-8b-instant` o `llama3-70b-8192`
- **Análisis de Imágenes (Vision):** `llama-3.2-11b-vision-preview`

**Estructura del Body (JSON):**
```json
{
  "model": "llama-3.2-11b-vision-preview",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Describe esta imagen." },
        { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,BASE_64_AQUI" } }
      ]
    }
  ],
  "temperature": 0.2
}
```
*Si es solo texto, `content` puede ser un string normal.*

---

## 2. Conexión a Ollama (IA Local)

Ollama permite correr modelos de lenguaje localmente. Tiene una API REST propia por defecto en el puerto `11434`.

**Parámetros de conexión:**
- **URL Base (Texto/Chat):** `http://localhost:11434/api/chat`
- **URL Base (Generación Simple/Imágenes):** `http://localhost:11434/api/generate`
- **Autenticación:** Ninguna requerida localmente (opcionalmente se le puede enviar una key por cabecera si está detrás de un proxy protector).

**Modelos recomendados:**
- **Chat general:** `llama3`, `gemma2`, `phi3`
- **Análisis de Imágenes (Vision):** `llava` (Es vital tener un modelo multimodal descargado con `ollama run llava`).

**Estructura del Body para Visión (`/api/generate`):**
```json
{
  "model": "llava",
  "prompt": "Describe esta imagen",
  "images": ["BASE_64_AQUI_SIN_EL_DATA_URI_PREFIX"],
  "stream": false
}
```
*Atención: Ollama requiere solo la cadena codificada en Base64 desnuda (sin "data:image/jpeg;base64,").*

---

## 3. Conexión a WhatsApp (Baileys)

Para conectarse a la red de dispositivos múltiples de WhatsApp (sin costo de API oficial), la aplicación utiliza la librería de TypeScript/Node.js **`@whiskeysockets/baileys`**.

**Dependencias requeridas (`package.json`):**
```bash
npm install @whiskeysockets/baileys qrcode-terminal qrcode pino
```

**Bloques de código fundamentales:**

1. **Gestión de la sesión de Auth:**
   Baileys necesita guardar credenciales localmente para no volver a pedir QR en cada arranque.
   ```javascript
   const { useMultiFileAuthState, makeWASocket } = require('@whiskeysockets/baileys');
   // Guardará la sesión en la carpeta "baileys_auth_info"
   const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
   ```

2. **Iniciando el Socket:**
   ```javascript
   const sock = makeWASocket({
       auth: state,
       printQRInTerminal: true, // Si usas qrcode-terminal
       browser: ['MiApp IA', 'Chrome', '10.0'], // Nombre que se mostrará en Dispositivos Vinculados
   });
   
   sock.ev.on('creds.update', saveCreds);
   ```

3. **Escuchando QRs y estado de conexión:**
   ```javascript
   sock.ev.on('connection.update', (update) => {
       const { connection, qr } = update;
       if (qr) {
           // Si llega aquí, usa la librería `qrcode` para enviarlo a la UI web
           console.log("Generar nuevo QR web aquí");
       }
       if (connection === 'open') {
           console.log('WhatsApp conectado');
       } else if (connection === 'close') {
           console.log('Conexión cerrada, reconectar lógicamente...');
       }
   });
   ```

4. **Escuchando y restructurando mensajes (Filtros de Privacidad):**
   Para evitar respuestas masivas, el bot filtra mensajes de grupos, estados o teléfonos no autorizados usando un archivo JSON.
   ```javascript
   sock.ev.on('messages.upsert', async (m) => {
       const msg = m.messages[0];
       if (!msg.message) return; // Ignorar nulos

       const senderId = msg.key.remoteJid; // ej: 521XXXXXXXXXX@s.whatsapp.net
       const myId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
       const isMessageToMyself = senderId === myId;
       
       // 1. Ignorar si lo enviamos nosotros Y NO es un mensaje a "Mensajes Propios"
       if (msg.key.fromMe && !isMessageToMyself) return;

       // 2. Ignorar mensajes de grupos o estados de WhatsApp
       if (senderId.includes('@g.us') || senderId === 'status@broadcast') return;

       // 3. Sistema de Autorización (wa-allowed.json)
       const allowedNumbers = require('./wa-allowed.json'); 
       // Si el senderId no está en la lista de permitidos y no es a nosotros mismos, se ignora
       if (!allowedNumbers.includes(senderId) && !isMessageToMyself) return;

       const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

       // 4. Prevenir bucles infinitos (Infinite Loop Prevention)
       // Si el mensaje comienza con el emoji del robot o de procesamiento, lo ignoramos para no respondernos a nosotros mismos infinitamente.
       if (text.startsWith('🤖') || text.startsWith('⏳')) return;

       console.log(`Mensaje autorizado de ${senderId}: ${text}`);

       // Enviar a Groq/Ollama y responder
       await sock.sendMessage(senderId, { text: `🤖 Respuesta generada por IA: ...` }, { quoted: msg });
   });
   ```
   **Nota sobre Autorización:** El archivo `wa-allowed.json` contiene un arreglo de strings con los IDs de WhatsApp (ej. `["521XXXXXXXXXX@s.whatsapp.net"]`). Este archivo permite añadir dinámicamente nuevos números desde los que deseas que el bot responda. Por defecto, siempre responde a los mensajes que el usuario se manda a sí mismo (bloc de notas de WhatsApp).

Con estos 3 componentes principales (Llamadas POST a Groq, llamadas POST a localhost:11434 para Ollama y la inicialización del Socket de Baileys con sus filtros), puedes replicar todo el panel y chatbot en cualquier otra aplicación Express/Node.js.