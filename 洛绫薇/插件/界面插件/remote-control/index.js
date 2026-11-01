/**
 * Host half of Remote Control — a small mobile PWA that drives a DSH session.
 *
 * Serves an installable mobile page (manifest + service worker) plus a tiny HTTP
 * API: live session list, "send a message to that session", and a legacy action
 * queue kept for the Bluetooth bridge. Delivered messages arrive in a session as
 * a program-injected user message, so the agent on the desktop picks the intent
 * up exactly like any other prompt.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'remote-control'

/** Listen port; overridable so the plugin self-test can bind a spare port. */
const PORT = Number(process.env.DSH_REMOTE_PORT ?? 7123)
/** Bind address; LAN by default so a phone on the same Wi-Fi can reach it. */
const BIND = process.env.DSH_REMOTE_BIND ?? '0.0.0.0'

const actions = []

/**
 * 校验 /api/new-session 的 cwd（2026-11-01 看板问题 D）。
 * 缺省 → 当前工作区；显式给出时必须「绝对路径 + 存在 + 是目录 + 在允许的根之下」，
 * 否则 400 —— 不再像以前那样照单全收（那会凭空造出 --Z-no-such-path-- 这类目录，
 * 并让会话落在一个根本不存在的工作区里）。
 *
 * 允许的根：① process.cwd()（宿主启动目录）；② 本插件所在的工作区（模块真实路径上溯两级）；
 * ③ 环境变量 DSH_REMOTE_CWD_ROOTS（分号分隔）。
 * 2026-11-01 07:4x 修正：首版只认 process.cwd()，而重启后宿主 cwd = `~\.dsh\profiles\desktop`，
 * 结果把真实工作区也挡成 400 —— 那是我自己引入的回归，现改为多根匹配。
 */
function allowedCwdRoots() {
  const roots = new Set()
  const push = (p) => {
    if (typeof p === 'string' && p.trim() !== '') roots.add(path.resolve(p.trim()))
  }
  push(process.cwd())
  try { push(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')) } catch { /* 取不到就跳过 */ }
  for (const p of String(process.env.DSH_REMOTE_CWD_ROOTS ?? '').split(';')) push(p)
  return Array.from(roots)
}

function resolveSessionCwd(input) {
  const root = process.cwd()
  if (typeof input !== 'string' || input.trim() === '') return { ok: true, cwd: root }
  const wanted = input.trim()
  if (!path.isAbsolute(wanted)) return { ok: false, error: 'cwd must be an absolute path' }
  let real
  try { real = fs.realpathSync(wanted) } catch { return { ok: false, error: 'cwd does not exist: ' + wanted } }
  let stat
  try { stat = fs.statSync(real) } catch { return { ok: false, error: 'cwd does not exist: ' + wanted } }
  if (!stat.isDirectory()) return { ok: false, error: 'cwd is not a directory: ' + wanted }
  const roots = allowedCwdRoots()
  for (const candidate of roots) {
    const rel = path.relative(candidate, real)
    if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) return { ok: true, cwd: real }
  }
  return { ok: false, error: 'cwd must be inside one of: ' + roots.join(' | ') }
}

const MANIFEST = {
  name: '洛绫薇 · 远程',
  short_name: '洛绫薇',
  start_url: '/',
  display: 'standalone',
  background_color: '#000000',
  theme_color: '#000000',
  icons: [],
}

const SW_JS = `self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); });
`

const CONTROL_PAGE = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#000000">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<link rel="manifest" href="/manifest.webmanifest">
<title>洛绫薇 · 远程</title>
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; padding: 20px 18px 28px; font: 16px/1.6 -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif; background: #000; color: #e8eaed; }
  h1 { margin: 0 0 2px; font-size: 22px; }
  .sub { margin: 0 0 18px; font-size: 12.5px; color: #9aa0a8; }
  .status { display: flex; gap: 10px; margin-bottom: 18px; }
  .chip { flex: 1; padding: 12px; border-radius: 12px; background: #111; border: 1px solid rgba(255,255,255,.12); }
  .chip .k { font-size: 11px; color: #9aa0a8; }
  .chip .v { font-size: 16px; font-weight: 600; margin-top: 2px; }
  label { display: block; font-size: 12px; color: #9aa0a8; margin: 0 0 6px; }
  select, textarea { width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,.18); background: #16181c; color: #e8eaed; padding: 12px; font-size: 15px; font-family: inherit; }
  textarea { min-height: 96px; resize: vertical; }
  .row { display: flex; gap: 10px; margin-top: 10px; }
  button { padding: 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,.18); background: #16181c; color: #e8eaed; font-size: 15px; cursor: pointer; flex: 1; }
  button:active { background: #2a2f36; }
  button.primary { background: #16351f; border-color: #2f6b3f; }
  button.ghost { flex: 0 0 auto; padding: 12px 14px; font-size: 13px; color: #9aa0a8; }
  #log { margin-top: 16px; font-size: 12px; color: #9aa0a8; white-space: pre-wrap; }
  .install { margin-top: 18px; width: 100%; background: #1b1f2a; border-color: #33415c; }
</style>
</head>
<body>
  <h1>洛绫薇 · 远程</h1>
  <p class="sub">在手机上给电脑上的洛绫薇发指令。</p>
  <div class="status">
    <div class="chip"><div class="k">DSH</div><div class="v" id="st-dsh">—</div></div>
    <div class="chip"><div class="k">模型</div><div class="v" id="st-model">—</div></div>
  </div>
  <label for="sess">会话</label>
  <select id="sess"></select>
  <div class="row"><button class="ghost" id="reload">刷新会话</button></div>
  <label for="msg" style="margin-top:14px">指令</label>
  <textarea id="msg" placeholder="例如：看板上有什么待办？/ 帮我看下磁盘。"></textarea>
  <div class="row">
    <button class="primary" id="send">发送给洛绫薇</button>
  </div>
  <div id="log"></div>
  <button id="install" class="install" hidden>安装到手机桌面</button>
  <script>
    var log = document.getElementById('log');
    function setLog(t) { log.textContent = t + '  ' + new Date().toLocaleTimeString(); }
    function shortId(id) { return id ? ('…' + id.slice(-8)) : '—'; }
    function refreshStatus() {
      fetch('/api/status').then(function (r) { return r.json(); }).then(function (s) {
        document.getElementById('st-dsh').textContent = s.dsh ? '在线' : '离线';
        document.getElementById('st-model').textContent = s.model || '—';
      }).catch(function () {});
    }
    function loadSessions() {
      var sel = document.getElementById('sess');
      var keep = sel.value || localStorage.getItem('remote.session') || '';
      fetch('/api/sessions').then(function (r) { return r.json(); }).then(function (list) {
        if (!Array.isArray(list)) return;
        sel.innerHTML = '';
        list.forEach(function (s) {
          var o = document.createElement('option');
          o.value = s.id;
          o.textContent = (s.running ? '● ' : '○ ') + shortId(s.id) + (s.running ? ' 运行中' : '');
          sel.appendChild(o);
        });
        if (keep && list.some(function (s) { return s.id === keep; })) sel.value = keep;
        else {
          var running = list.filter(function (s) { return s.running; });
          if (running.length > 0) sel.value = running[0].id;
        }
        setLog('会话 ' + list.length + ' 个');
      }).catch(function (e) { setLog('会话加载失败: ' + e); });
    }
    document.getElementById('reload').onclick = loadSessions;
    document.getElementById('send').onclick = function () {
      var sel = document.getElementById('sess');
      var msg = document.getElementById('msg');
      var text = msg.value.trim();
      if (!sel.value) { setLog('先选一个会话'); return; }
      if (!text) { setLog('先写点指令'); return; }
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: sel.value, message: text })
      }).then(function (r) { return r.json().then(function (j) { return [r.status, j]; }); })
        .then(function (res) {
          if (res[0] === 200) { localStorage.setItem('remote.session', sel.value); msg.value = ''; setLog('已送达 ' + shortId(sel.value)); }
          else setLog('失败(' + res[0] + '): ' + (res[1].error || ''));
        })
        .catch(function (e) { setLog('失败: ' + e); });
    };
    refreshStatus();
    loadSessions();
    setInterval(refreshStatus, 5000);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    }
    var deferredPrompt = null;
    var installBtn = document.getElementById('install');
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.hidden = false;
    });
    installBtn.onclick = function () {
      if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; installBtn.hidden = true; }
    };
  </script>
</body>
</html>
`

function json(res, code, value) {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' })
  res.end(JSON.stringify(value))
}

/**
 * Deliver one message into a live session as a program-injected user message.
 * @param ctx - plugin context holding the optional `agents` service.
 * @param sessionId - target live session id.
 * @param message - text delivered to that agent's inbox.
 * @returns status code and JSON body for the HTTP reply.
 */
function deliver(ctx, sessionId, message) {
  const agents = ctx.get('agents')
  const agent = agents?.get?.(sessionId)
  if (agent === undefined || agent === null) {
    return { code: 404, body: { ok: false, error: 'session not live', sessionId } }
  }
  try {
    agent.followup({
      id: crypto.randomUUID(),
      role: 'user',
      content: [{ type: 'text', text: message }],
      source: { kind: 'model' },
    })
    return { code: 200, body: { ok: true, sessionId } }
  } catch (error) {
    return { code: 500, body: { ok: false, error: String(error?.message ?? error) } }
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => resolve(body))
  })
}

function parseJson(body) {
  try {
    const value = JSON.parse(body || '{}')
    return value !== null && typeof value === 'object' ? value : {}
  } catch {
    return null
  }
}

export function apply(ctx) {
  let model = ''

  const trackModel = () => {
    try {
      const selection = ctx.get('agentDefaultModel')
      if (selection && typeof selection.currentSelection === 'function') {
        const current = selection.currentSelection()
        if (current && typeof current.model === 'string') model = current.model
      }
    } catch { /* provider not mounted */ }
  }
  trackModel()
  const timer = setInterval(trackModel, 5000)

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

    const url = new URL(req.url ?? '/', 'http://localhost')

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(CONTROL_PAGE)
      return
    }
    if (req.method === 'GET' && url.pathname === '/manifest.webmanifest') {
      res.writeHead(200, { 'content-type': 'application/manifest+json; charset=utf-8' })
      res.end(JSON.stringify(MANIFEST))
      return
    }
    if (req.method === 'GET' && url.pathname === '/sw.js') {
      res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
      res.end(SW_JS)
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/status') {
      json(res, 200, { dsh: true, model, pending: actions.length })
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/sessions') {
      const agents = ctx.get('agents')
      const rows = typeof agents?.list === 'function' ? agents.list() : []
      const sessions = rows.map((agent) => {
        const id = String(agent?.id ?? '')
        return { id, running: agent?.status === 'running' }
      }).filter((row) => row.id !== '')
      json(res, 200, sessions)
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/take') {
      json(res, 200, actions.splice(0))
      return
    }
    if (req.method === 'POST' && url.pathname === '/api/notify') {
      void readBody(req).then((raw) => {
        const data = parseJson(raw)
        if (data === null) { json(res, 400, { ok: false, error: 'invalid json' }); return }
        const sessionId = typeof data.sessionId === 'string' ? data.sessionId : ''
        const message = typeof data.message === 'string' ? data.message : ''
        if (sessionId === '' || message === '') {
          json(res, 400, { ok: false, error: 'sessionId/message required' })
          return
        }
        const result = deliver(ctx, sessionId, message)
        json(res, result.code, result.body)
      })
      return
    }
    if (req.method === 'POST' && url.pathname === '/api/action') {
      void readBody(req).then((raw) => {
        const data = parseJson(raw)
        if (data === null) { json(res, 400, { ok: false }); return }
        const sessionId = typeof data.sessionId === 'string' ? data.sessionId : ''
        const text = typeof data.text === 'string' && data.text !== ''
          ? data.text
          : (typeof data.action === 'string' ? data.action : '')
        // A targeted call is delivered into that session; a bare action name stays
        // queued for the legacy Bluetooth bridge / client poller.
        if (sessionId !== '' && text !== '') {
          const result = deliver(ctx, sessionId, text)
          json(res, result.code, result.body)
          return
        }
        if (typeof data.action === 'string' && data.action.length > 0) {
          actions.push(data.action)
          json(res, 200, { ok: true, pending: actions.length })
          return
        }
        json(res, 400, { ok: false, error: 'sessionId+text or action required' })
      })
      return
    }
    // Create a NEW session and immediately hand it its first task.
    // POST { message, cwd?, preset? } -> { ok, sessionId }
    if (req.method === 'POST' && url.pathname === '/api/new-session') {
      void readBody(req).then(async (raw) => {
        const data = parseJson(raw)
        if (data === null) { json(res, 400, { ok: false, error: 'invalid json' }); return }
        const message = typeof data.message === 'string' ? data.message : ''
        if (message === '') { json(res, 400, { ok: false, error: 'message required' }); return }
        // The session-controller is the only supported creator: it composes the
        // Agent preset (model + plugins). A raw agents.create() yields an Agent
        // with no composition, whose turns stall — that was the 07:2x failure.
        const controller = ctx.get('sessionController')
        if (typeof controller?.create !== 'function') {
          json(res, 501, { ok: false, error: 'sessionController.create unavailable' })
          return
        }
        try {
          const resolved = resolveSessionCwd(data.cwd)
          if (!resolved.ok) { json(res, 400, { ok: false, error: resolved.error }); return }
          const request = { cwd: resolved.cwd, reusable: () => false }
          if (typeof data.preset === 'string' && data.preset !== '') request.agentPreset = data.preset
          const created = await controller.create(request)
          const sessionId = String(created?.sessionId ?? created?.id ?? created?.agent?.id ?? '')
          const agent = created?.agent ?? ctx.get('agents')?.get?.(sessionId)
          if (sessionId === '' || typeof agent?.followup !== 'function') {
            json(res, 500, { ok: false, error: 'session created without a live agent', sessionId })
            return
          }
          agent.followup({
            id: crypto.randomUUID(),
            role: 'user',
            content: [{ type: 'text', text: message }],
            source: { kind: 'user' },
          })
          json(res, 200, { ok: true, sessionId })
        } catch (error) {
          json(res, 500, { ok: false, error: String(error?.message ?? error) })
        }
      }).catch((error) => {
        try { json(res, 500, { ok: false, error: String(error?.message ?? error) }) } catch { /* response already sent */ }
      })
      return
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('not found')
  })

  server.listen(PORT, BIND, () => {
    console.log(`[remote-control] 手机控制页: http://<本机IP>:${PORT}/`)
  })
  ctx.effect(() => () => {
    clearInterval(timer)
    try { server.close() } catch { /* already closed */ }
  }, 'remote-control: http server')
}
