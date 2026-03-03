import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



async function readEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env');
    const content = await fs.readFile(envPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (key && !process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env file is optional
  }
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function handleTranslate(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  let raw = '';
  for await (const chunk of req) raw += chunk;

  let body;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body' });
  }

  const paragraph = String(body.paragraph || '').trim();
  if (!paragraph) {
    return sendJson(res, 400, { error: 'paragraph is required' });
  }

  if (!OPENAI_API_KEY) {
    return sendJson(res, 500, { error: 'Missing OPENAI_API_KEY on server' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          {
            role: 'system',
            content: 'You are a translation assistant. Translate the provided English paragraph into concise, natural Simplified Chinese while keeping named entities accurate.'
          },
          {
            role: 'user',
            content: paragraph
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return sendJson(res, response.status, {
        error: data?.error?.message || 'OpenAI request failed'
      });
    }

    const translated = data?.output_text?.trim();
    if (!translated) {
      return sendJson(res, 502, { error: 'No translation text returned from model' });
    }

    return sendJson(res, 200, { translation: translated, model: MODEL });
  } catch (error) {
    return sendJson(res, 500, {
      error: `Translation request failed: ${error instanceof Error ? error.message : 'unknown error'}`
    });
  }
}

async function serveStatic(req, res) {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host}`);
  let pathname = reqUrl.pathname;
  if (pathname === '/') pathname = '/index.html';

  const filePath = path.join(__dirname, pathname);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
}

let PORT = 4173;
let OPENAI_API_KEY = '';
let MODEL = 'gpt-5.2';

const server = http.createServer(async (req, res) => {
  if ((req.url || '').startsWith('/api/translate')) {
    return handleTranslate(req, res);
  }
  return serveStatic(req, res);
});

await readEnvFile();
PORT = Number(process.env.PORT || 4173);
OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
MODEL = process.env.OPENAI_MODEL || 'gpt-5.2';

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Reader app running at http://127.0.0.1:${PORT}`);
});
