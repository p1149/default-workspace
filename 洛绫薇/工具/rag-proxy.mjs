// rag-proxy.mjs — OpenAI 兼容的「洛绫薇 RAG 代理」
// 收到 /v1/chat/completions → 按用户消息关键字检索框架记忆 → 注入 system → 转发本地 Ollama → 原样返回。
// 用法：node rag-proxy.mjs   （监听 11435，转发到 127.0.0.1:11434）
import http from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const PORT = 11435
const OLLAMA = 'http://127.0.0.1:11434'
const FRAME = 'C:/Users/76927/Documents/deepseek-harness/default-workspace/框架'

const SETTINGS = {
  maxItems: 3,
  maxChars: 320,
  itemChars: 100,
  minScore: 2,
  header: '## 洛绫薇记忆命中（RAG · 检索自 框架/）',
  globalFiles: ['洛绫薇的记忆.md', '共享/参考.md', '共享/任务看板.md', '共享/健康摘要.md', '共享/场景索引.md'],
  scenesDir: '场景',
  stopwords: [
    '今天', '什么', '怎么', '这个', '那个', '一个', '可以', '需要', '现在', '然后',
    '因为', '所以', '但是', '而且', '还是', '就是', '我们', '你们', '他们', '自己',
    '是不', '不是', '没有', '已经', '一下', '这些', '那些', '如果', '的话', '这样',
    '那样', '是否', '还有', '以及', '对于', '关于', '如何', '为何', '多少',
  ],
}

const readText = async path => {
  try { return await readFile(path, 'utf8') } catch { return '' }
}

async function loadSources() {
  const sources = []
  for (const file of SETTINGS.globalFiles) {
    const text = await readText(join(FRAME, ...file.split('/')))
    if (text) sources.push({ scope: '全局', file, text })
  }
  try {
    const scenes = await readdir(join(FRAME, SETTINGS.scenesDir))
    for (const scene of scenes) {
      const text = await readText(join(FRAME, SETTINGS.scenesDir, scene, '记忆.md'))
      if (text) sources.push({ scope: '场景', file: `场景/${scene}/记忆.md`, text })
    }
  } catch { /* no scenes dir */ }
  return sources
}

function tokensOf(text) {
  const tokens = new Set()
  const stopwords = new Set(SETTINGS.stopwords)
  const cleaned = String(text || '')
  for (const m of cleaned.matchAll(/[A-Za-z0-9_]{2,}/g)) tokens.add(m[0].toLowerCase())
  for (const m of cleaned.matchAll(/[\u4e00-\u9fff]{2,}/g)) {
    for (let i = 0; i + 2 <= m[0].length; i++) {
      const token = m[0].slice(i, i + 2)
      if (!stopwords.has(token)) tokens.add(token)
    }
  }
  return tokens
}

function retrieve(userText, sources) {
  const tokens = tokensOf(userText)
  if (tokens.size === 0) return []
  const hits = []
  for (const src of sources) {
    for (const raw of src.text.split('\n')) {
      const line = raw.trim()
      if (line.length < 8 || line.startsWith('#') || line.startsWith('>') || line.startsWith('|') || line.startsWith('- [')) continue
      let score = 0
      for (const token of tokens) if (line.includes(token)) score++
      if (score >= SETTINGS.minScore) hits.push({ score, scope: src.scope, file: src.file, line: line.slice(0, SETTINGS.itemChars) })
    }
  }
  hits.sort((a, b) => (a.scope === b.scope ? b.score - a.score : a.scope === '场景' ? -1 : 1))
  const picked = []
  let total = SETTINGS.header.length + 2
  for (const hit of hits) {
    if (picked.length >= SETTINGS.maxItems) break
    if (total + hit.line.length + 4 > SETTINGS.maxChars) continue
    picked.push(hit)
    total += hit.line.length + 4
  }
  return picked
}

function inject(messages, hits) {
  if (hits.length === 0) return messages
  const block = SETTINGS.header + '\n\n' + hits.map((h, i) => `${i + 1}. [${h.scope} · ${h.file}] ${h.line}`).join('\n')
  const next = messages.map(m => ({ ...m }))
  const sys = next.find(m => m.role === 'system')
  if (sys) sys.content = (typeof sys.content === 'string' ? sys.content : '') + '\n\n' + block
  else next.unshift({ role: 'system', content: block })
  return next
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: true, proxy: 'luolingwei-rag', forward: OLLAMA }))
    return
  }

  if (req.method !== 'POST' || !req.url.endsWith('/chat/completions')) {
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: 'not found' }))
    return
  }

  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}')
      const messages = Array.isArray(payload.messages) ? payload.messages : []
      const lastUser = [...messages].reverse().find(m => m.role === 'user')
      const userText = typeof lastUser?.content === 'string'
        ? lastUser.content
        : Array.isArray(lastUser?.content)
          ? lastUser.content.map(p => (typeof p === 'string' ? p : p?.text ?? '')).join('\n')
          : ''
      let hits = []
      try { hits = retrieve(userText, await loadSources()) } catch { hits = [] }
      const MODEL_ALIASES = { luolingwei: 'luolingwei-lite', '': 'luolingwei-lite' }
      payload.model = MODEL_ALIASES[payload.model] ?? (payload.model || 'luolingwei-lite')
      payload.messages = inject(messages, hits)
      console.log(`[rag] 命中 ${hits.length} 条 / 用户消息 ${userText.slice(0, 40)}`)

      const upstream = await fetch(`${OLLAMA}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      res.writeHead(upstream.status, { 'content-type': 'application/json; charset=utf-8' })
      if (upstream.body) {
        for await (const chunk of upstream.body) res.write(chunk)
      }
      res.end()
    } catch (error) {
      res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: String(error?.message ?? error) }))
    }
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[rag] 洛绫薇 RAG 代理已启动: http://127.0.0.1:${PORT}/v1/chat/completions  → ${OLLAMA}`)
})
