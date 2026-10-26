import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3096;
const APP_URL = `http://127.0.0.1:${PORT}`;

function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(APP_URL, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openBrowser() {
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  ];

  for (const chromePath of chromePaths) {
    if (fs.existsSync(chromePath)) {
      const child = spawn(chromePath, [`--app=${APP_URL}`, '--start-maximized'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });
      child.unref();
      return;
    }
  }

  const fallback = spawn('explorer.exe', [APP_URL], {
    detached: true,
    stdio: 'ignore',
  });
  fallback.unref();
}

async function runServer() {
  process.chdir(__dirname);
  const { createServer } = await import('vite');
  const server = await createServer({
    root: __dirname,
    server: {
      host: '127.0.0.1',
      port: PORT,
      strictPort: true,
    },
  });
  await server.listen();
}

async function main() {
  if (process.argv.includes('--server')) {
    await runServer();
    return;
  }

  const alreadyRunning = await checkServerReady();
  if (!alreadyRunning) {
    const child = spawn(process.execPath, [__filename, '--server'], {
      cwd: __dirname,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();

    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (await checkServerReady()) {
        break;
      }
    }
  }

  openBrowser();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
