/**
 * Memory Inject v2 — retrieval-based injection.
 *
 * 规则（主人 2026-10-30 定）：
 * - **命中才注入**：按用户消息检索，命中才追加；
 * - **范围**：全局（框架记忆）+ 当前会话（场景记忆）；
 * - **上限**：≤ 3 条 / ≤ 300 字；
 * - **默认关**（enabled: false）；
 * - **fail-open**：检索失败放行，不阻断；
 * - 日志可查。
 */
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export const name = 'memory-inject'
export const inject = ['agents']

const WORKSPACE = 'C:/Users/76927/Documents/deepseek-harness/default-workspace'
const FRAME = join(WORKSPACE, '框架')

const DEFAULTS = {
  enabled: false,
  maxItems: 3,
  maxChars: 300,
  itemChars: 100,
  minScore: 2,
  header: '## 洛绫薇记忆命中（≤3 条 / ≤300 字）',
  stopwords: [
    '今天', '什么', '怎么', '这个', '那个', '一个', '可以', '需要', '现在', '然后',
    '因为', '所以', '但是', '而且', '还是', '就是', '我们', '你们', '他们', '自己',
    '是不', '不是', '没有', '已经', '一下', '这些', '那些', '如果', '的话', '这样',
    '那样', '是否', '还有', '以及', '对于', '关于', '怎么', '如何', '为何', '多少',
  ],
  globalFiles: [
    '洛绫薇的记忆.md',
    '共享/参考.md',
    '共享/任务看板.md',
    '共享/健康摘要.md',
    '共享/场景索引.md',
  ],
  scenesDir: '场景',
  log: true,
}

export function apply(ctx, config = {}) {
  const settings = { ...DEFAULTS, ...config }
  if (settings.enabled !== true) return undefined

  const readText = async path => {
    try { return await readFile(path, 'utf8') } catch { return '' }
  }

  const loadSources = async () => {
    const sources = []
    for (const file of settings.globalFiles) {
      const text = await readText(join(FRAME, ...file.split('/')))
      if (text) sources.push({ scope: '全局', file, text })
    }
    try {
      const scenes = await readdir(join(FRAME, settings.scenesDir))
      for (const scene of scenes) {
        const text = await readText(join(FRAME, settings.scenesDir, scene, '记忆.md'))
        if (text) sources.push({ scope: '场景', file: `场景/${scene}/记忆.md`, text })
      }
    } catch { /* no scenes dir */ }
    return sources
  }

  const tokensOf = text => {
    const tokens = new Set()
    const stopwords = new Set(settings.stopwords)
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

  const retrieve = (userText, sources) => {
    const tokens = tokensOf(userText)
    if (tokens.size === 0) return []
    const hits = []
    for (const src of sources) {
      for (const raw of src.text.split('\n')) {
        const line = raw.trim()
        if (line.length < 8) continue
        if (line.startsWith('#') || line.startsWith('>') || line.startsWith('|') || line.startsWith('- [')) continue
        let score = 0
        for (const token of tokens) if (line.includes(token)) score++
        if (score >= settings.minScore) {
          hits.push({ score, scope: src.scope, file: src.file, line: line.slice(0, settings.itemChars) })
        }
      }
    }
    // 场景（当前会话）优先，再按命中分
    hits.sort((a, b) => (a.scope === b.scope ? b.score - a.score : a.scope === '场景' ? -1 : 1))
    const picked = []
    let total = settings.header.length + 2
    for (const hit of hits) {
      if (picked.length >= settings.maxItems) break
      if (total + hit.line.length + 4 > settings.maxChars) continue
      picked.push(hit)
      total += hit.line.length + 4
    }
    return picked
  }

  const injectedMessage = text => ({
    id: randomUUID(),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'memory-inject', form: 'snapshot', sections: [{ name: 'memory-inject', text }] },
  })

  ctx.on('agent/pre-step', async ({ messages, step, signal }, next) => {
    const decision = await next()
    if (decision.kind === 'reject' || step !== 1) return decision
    try {
      const lastUser = [...messages]
        .reverse()
        .find(m => m.role === 'user' && m.source?.kind === 'user')
      if (lastUser === undefined) return decision
      const userText = (lastUser.content ?? [])
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join('\n')
      if (userText.trim() === '') return decision

      const hits = retrieve(userText, await loadSources())
      if (hits.length === 0) return decision

      signal?.throwIfAborted?.()
      const body = hits
        .map((hit, index) => `${index + 1}. [${hit.scope} · ${hit.file}] ${hit.line}`)
        .join('\n')
      const text = `${settings.header}\n\n${body}`
      const injected = injectedMessage(text)
      const lastClaimed = decision.messages.findLastIndex(message => messages.includes(message))
      const at = lastClaimed < 0 ? decision.messages.length : lastClaimed + 1
      if (settings.log) ctx.logger?.info?.('[memory-inject] 命中 %d 条 / %d 字', hits.length, text.length)
      return { ...decision, messages: decision.messages.toSpliced(at, 0, injected) }
    } catch {
      return decision
    }
  })
}
